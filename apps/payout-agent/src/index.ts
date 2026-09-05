/**
 * Landed payout agent: a Lucid Agents seller whose paid entrypoint moves USDC through KeeperHub.
 *
 *   npm run seller            # real KeeperHub (needs KEEPERHUB_API_KEY), x402 if PAYMENTS_* are set
 *   npm run seller:mock       # dead-network replay mode: in-memory KeeperHub, free entrypoints
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import { paymentsFromEnv } from "@lucid-agents/payments";
import { createPayoutAgent } from "./agent.ts";

const mock = process.argv.includes("--mock");
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.AGENT_ORIGIN ?? `http://localhost:${port}`;
const apiKey = process.env.KEEPERHUB_API_KEY;

if (!mock && (!apiKey || apiKey === "kh_...")) {
  console.error("KEEPERHUB_API_KEY is not set. Put an organisation kh_ key in .env, or run `npm run seller:mock`.");
  process.exit(2);
}

const paymentsConfig = mock ? undefined : paymentsFromEnv();
const { app, client, summary } = await createPayoutAgent({
  mock,
  apiKey,
  baseUrl: process.env.KEEPERHUB_BASE_URL,
  chainId: process.env.KEEPERHUB_CHAIN_ID,
  token: process.env.PAYOUT_TOKEN,
  maxAmount: process.env.PAYOUT_MAX_AMOUNT,
  price: process.env.PAYOUT_PRICE ?? "0.01",
  paymentsConfig: paymentsConfig ?? undefined,
});

serve({ fetch: app.fetch, port }, async () => {
  console.log(`landed-payout-agent listening on ${origin}${summary.mock ? "  [MOCK KeeperHub: replay mode, no network]" : ""}`);
  console.log(`  agent card   ${origin}/.well-known/agent-card.json`);
  console.log(
    `  entrypoints  payout (${summary.paid ? `x402 ${summary.price} USD on ${String((paymentsConfig as { network?: string } | undefined)?.network ?? "")}` : "free"}), dry-run (free), execution (free)`,
  );
  console.log(`  policy       chain=${summary.chainId} token=${summary.tokenAddress ?? "native"} maxAmount=${summary.maxAmount}`);
  try {
    const me = await client.me();
    console.log(`  keeperhub    ${client.baseUrl}  org wallet ${me.walletAddress ?? "(provisioning)"}`);
  } catch (error) {
    console.log(`  keeperhub    ${client.baseUrl}  (could not read org wallet: ${error instanceof Error ? error.message : String(error)})`);
  }
});
