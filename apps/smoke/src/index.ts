/**
 * Smoke: one real transfer through KeeperHub, printed stage by stage, ending in a proof link.
 *
 *   npm run smoke -- [--to 0x...] [--amount 0.01] [--token 0x...|native] [--chain 84532] [--reference id] [--simulate-only]
 *
 * Defaults: chain from KEEPERHUB_CHAIN_ID (84532), token = USDC on that chain, recipient = the org wallet itself
 * (a self-transfer is a real, mined, independently verifiable transaction that needs no second address).
 */
import "dotenv/config";
import {
  ExecutionFailed,
  ExecutionUnconfirmed,
  KeeperHubClient,
  PreflightFailed,
  USDC,
  type ClientEvent,
} from "@landed/keeperhub-client";

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.KEEPERHUB_API_KEY;
if (!apiKey || apiKey === "kh_...") {
  console.error("KEEPERHUB_API_KEY is not set. Create an organization key at app.keeperhub.com (avatar → API Keys → Organisation) and put it in .env");
  process.exit(2);
}

const chainId = String(args.chain ?? process.env.KEEPERHUB_CHAIN_ID ?? "84532");
const amount = String(args.amount ?? "0.01");
const tokenArg = typeof args.token === "string" ? args.token : (process.env.PAYOUT_TOKEN ?? USDC[chainId as keyof typeof USDC]);
const tokenAddress = tokenArg === "native" ? undefined : tokenArg;
const reference = String(args.reference ?? `smoke-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`);

const t0 = Date.now();
const stamp = () => `+${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(5)}s`;
const say = (line: string) => console.log(`${stamp()}  ${line}`);

const client = new KeeperHubClient({
  apiKey,
  baseUrl: process.env.KEEPERHUB_BASE_URL,
  onEvent: (event: ClientEvent) => {
    switch (event.type) {
      case "simulated":
        say(`simulated      success=${event.result.success} wouldRevert=${event.result.wouldRevert} gasEstimate=${event.result.gasEstimate ?? "?"} from=${event.result.from ?? "?"}`);
        break;
      case "accepted":
        say(`accepted       executionId=${event.execution.executionId} status=${event.execution.status}${event.execution.idempotentReplay ? " (idempotent replay)" : ""}`);
        break;
      case "status":
        say(`status         ${event.state.status} sponsored=${event.state.sponsored} hint=${event.state.pollIntervalHint ?? "none"}s receipts=${event.state.receipts.length}`);
        break;
      case "waiting":
        say(`waiting        ${event.ms}ms (${event.reason})`);
        break;
      case "response":
        if (event.status >= 400) say(`http ${event.status}       ${event.method} ${event.path}${event.requestId ? ` request_id=${event.requestId}` : ""}`);
        break;
      default:
        break;
    }
  },
});

try {
  say(`probing        ${client.baseUrl}/api/keys`);
  if (!(await client.probe())) {
    throw new Error("API key rejected (401). Is it an organisation kh_ key?");
  }
  const me = await client.me();
  say(`org wallet     ${me.walletAddress ?? "(provisioning, retry in a minute)"}`);
  if (!me.walletAddress) {
    process.exit(1);
  }
  const recipientAddress = String(args.to ?? me.walletAddress);
  const chains = (await client.listChains()) as Array<Record<string, unknown>>;
  const chain = chains.find((c) => String(c.chainId ?? c.id) === chainId);
  say(`chain          ${chainId} ${chain ? `${String(chain.name ?? "")} enabled=${String(chain.isEnabled)} testnet=${String(chain.isTestnet)}` : "(not in GET /api/chains)"}`);
  say(`intent         ${amount} ${tokenAddress ? `token ${tokenAddress}` : "native"} → ${recipientAddress} reference=${reference}`);

  const request = { chainId, recipientAddress, amount, tokenAddress };
  await client.simulateTransfer(request);
  if (args["simulate-only"]) {
    say("done           simulate-only; nothing was broadcast");
    process.exit(0);
  }
  const proof = await client.transferAndVerify(request, { taskId: reference, skipSimulation: true });
  say(`landed         tx=${proof.transactionHash} block=${proof.receipt.blockNumber ?? "?"} gasUsed=${proof.receipt.gasUsed ?? "?"} sponsored=${proof.sponsored}${proof.replayed ? " (replayed)" : ""}`);
  say(`proof          ${proof.transactionLink ?? "(no link returned; look the hash up on the chain explorer)"}`);
  say(`execution      ${client.baseUrl}  executionId=${proof.executionId}`);
} catch (error) {
  if (error instanceof PreflightFailed) {
    say(`preflight      refused: ${error.message} (nothing broadcast)`);
  } else if (error instanceof ExecutionFailed) {
    say(`failed         ${error.message}`);
  } else if (error instanceof ExecutionUnconfirmed) {
    say(`unconfirmed    ${error.message}`);
  } else {
    say(`error          ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
}

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) continue;
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[name] = next;
      i += 1;
    } else {
      out[name] = true;
    }
  }
  return out;
}
