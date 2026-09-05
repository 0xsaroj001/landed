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
import { payments } from "@lucid-agents/payments";

type PaymentsOptions = NonNullable<Parameters<typeof payments>[0]>;
export type PaymentsConfig = Exclude<NonNullable<PaymentsOptions["config"]>, false>;

export interface PayoutAgentOptions {
  /** In-memory KeeperHub: no credentials, no chain. Dry runs above 100 tokens fail with insufficient_balance. */
  mock?: boolean | undefined;
  client?: KeeperHubClient | undefined;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  /** Default "84532" (Base Sepolia). */
  chainId?: string | undefined;
  /** Default: USDC on the chain. Pass "native" for the native asset. */
  token?: string | undefined;
  /** Default "1" (mock: "1000"). */
  maxAmount?: string | undefined;
  /** USD price for the payout entrypoint. Requires paymentsConfig. */
  price?: string | undefined;
  paymentsConfig?: PaymentsConfig | undefined;
}

export const MOCK_ORG_WALLET = "0x1111111111111111111111111111111111111111";

export async function createPayoutAgent(options: PayoutAgentOptions = {}) {
  const mock = options.mock === true;
  const chainId = options.chainId ?? "84532";
  const token = options.token ?? USDC[chainId as keyof typeof USDC] ?? "native";
  const tokenAddress = token === "native" ? undefined : token;
  const maxAmount = options.maxAmount ?? (mock ? "1000" : "1");
  const price = options.paymentsConfig ? options.price : undefined;

  const client =
    options.client ??
    (mock
      ? new KeeperHubClient({
          apiKey: "kh_mock",
          baseUrl: "https://keeperhub.mock",
          fetch: createMockKeeperHub({
            apiKey: "kh_mock",
            sponsored: true,
            walletAddress: MOCK_ORG_WALLET,
            simulate: (body) =>
              Number(body.amount) > 100
                ? { wouldRevert: true, code: "insufficient_balance", failureKind: "validation" }
                : undefined,
          }).fetch,
        })
      : new KeeperHubClient({ apiKey: options.apiKey ?? "", baseUrl: options.baseUrl }));

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

  const withPayments = options.paymentsConfig ? builder.use(payments({ config: options.paymentsConfig })) : builder;
  const runtime = await withPayments.use(http()).build();
  const { app, addEntrypoint } = await createAgentApp(runtime);

  addEntrypoint(
    keeperhubTransferEntrypoint({
      key: "payout",
      price,
      chainId,
      tokenAddress,
      description: `Pay ${price ? `${price} USD` : "nothing (free in this mode)"}, receive a verified ${tokenAddress ? "USDC" : "native"} transfer on chain ${chainId} executed through KeeperHub. Payment settles only when the transaction lands.`,
    }),
  );
  addEntrypoint(keeperhubDryRunEntrypoint({ key: "dry-run", chainId, tokenAddress }));
  addEntrypoint(keeperhubStatusEntrypoint({ key: "execution" }));

  return {
    app,
    runtime,
    client,
    summary: { mock, chainId, tokenAddress, maxAmount, price, paid: Boolean(price) },
  };
}
