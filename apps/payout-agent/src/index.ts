/**
 * Landed payout agent: a Lucid Agents seller whose paid entrypoint moves USDC through KeeperHub.
 *
 *   npm run seller            # real KeeperHub (needs KEEPERHUB_API_KEY), x402 if PAYMENTS_* are set
 *   npm run seller:mock       # dead-network replay mode: in-memory KeeperHub, free entrypoints
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import { KeeperHubClient, USDC, createMockKeeperHub } from "@landed/keeperhub-client";
import {
  keeperhub,
  keeperhubDryRunEntrypoint,
  keeperhubStatusEntrypoint,
  keeperhubTransferEntrypoint,
} from "@landed/lucid-keeperhub";
import { createAgent } from "@lucid-agents/core";
import { createAgentApp } from "@lucid-agents/hono";
import { http } from "@lucid-agents/http";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";

const mockMode = process.argv.includes("--mock");
const chainId = process.env.KEEPERHUB_CHAIN_ID ?? "84532";
const tokenAddress = process.env.PAYOUT_TOKEN ?? USDC[chainId as keyof typeof USDC];
const maxAmount = process.env.PAYOUT_MAX_AMOUNT ?? "1";
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.AGENT_ORIGIN ?? `http://localhost:${port}`;

const apiKey = process.env.KEEPERHUB_API_KEY;
if (!mockMode && (!apiKey || apiKey === "kh_...")) {
  console.error("KEEPERHUB_API_KEY is not set. Put an organisation kh_ key in .env, or run `npm run seller:mock`.");
  process.exit(2);
}

const client = mockMode
  ? new KeeperHubClient({ apiKey: "kh_mock", baseUrl: "https://keeperhub.mock", fetch: createMockKeeperHub({ apiKey: "kh_mock", sponsored: true }).fetch })
  : new KeeperHubClient({ apiKey: apiKey!, baseUrl: process.env.KEEPERHUB_BASE_URL });

const paymentsConfig = mockMode ? undefined : paymentsFromEnv();
const price = paymentsConfig ? (process.env.PAYOUT_PRICE ?? "0.01") : undefined;

const builder = createAgent({
  name: "landed-payout-agent",
  version: "0.1.0",
  description:
    "Sells verified onchain USDC payouts. Execution runs through KeeperHub (simulate, broadcast under a stable idempotency key, verified receipt). The buyer's payment settles only after the transaction lands.",
}).use(
  keeperhub({
    client,
    policy: { chains: [chainId], tokens: [tokenAddress ?? "native"], maxAmount },
    label: "Landed payout",
  }),
);

const withPayments = paymentsConfig ? builder.use(payments({ config: paymentsConfig })) : builder;
const agent = await withPayments.use(http()).build();

const { app, addEntrypoint } = await createAgentApp(agent);

addEntrypoint(
  keeperhubTransferEntrypoint({
    key: "payout",
    price,
    chainId,
    tokenAddress,
    description: `Pay ${price ?? "nothing (free in this mode)"} USD, receive a verified ${tokenAddress ? "USDC" : "native"} transfer on chain ${chainId} executed through KeeperHub. Payment settles only when the transaction lands.`,
  }),
);
addEntrypoint(keeperhubDryRunEntrypoint({ key: "dry-run", chainId, tokenAddress }));
addEntrypoint(keeperhubStatusEntrypoint({ key: "execution" }));

serve({ fetch: app.fetch, port }, async () => {
  console.log(`landed-payout-agent listening on ${origin}${mockMode ? "  [MOCK KeeperHub: replay mode, no network]" : ""}`);
  console.log(`  agent card   ${origin}/.well-known/agent-card.json`);
  console.log(`  entrypoints  payout (${price ? `x402 ${price} USD on ${paymentsConfig ? String((paymentsConfig as { network?: string }).network ?? "") : ""}` : "free"}), dry-run (free), execution (free)`);
  console.log(`  policy       chain=${chainId} token=${tokenAddress ?? "native"} maxAmount=${maxAmount}`);
  if (!mockMode) {
    try {
      const me = await client.me();
      console.log(`  keeperhub    ${client.baseUrl}  org wallet ${me.walletAddress ?? "(provisioning)"}`);
    } catch (error) {
      console.log(`  keeperhub    ${client.baseUrl}  (could not read org wallet: ${error instanceof Error ? error.message : String(error)})`);
    }
  }
});
