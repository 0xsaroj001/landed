/**
 * Buyer: discovers the payout agent's card, pays x402 (Base Sepolia USDC) when the entrypoint is priced,
 * invokes it, and prints the KeeperHub proof. Also runs the failing case that must not charge the buyer.
 *
 *   npm run buyer -- payout --to 0x... --amount 0.01 [--reference inv-42] [--fresh-key]
 *   npm run buyer -- subscribe --to 0x... --amount 0.01 --cron "0 9 * * 1" [--timezone UTC] [--run-now]
 *   npm run buyer -- dry-run --to 0x... --amount 0.01
 *   npm run buyer -- execution --reference inv-42
 *   npm run buyer -- watch --reference inv-42          (SSE stream of stages)
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { accountFromPrivateKey, createX402Fetch } from "@lucid-agents/payments";
import { createPublicClient, formatUnits, http as viemHttp, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const ERC20_BALANCE_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

interface AgentCard {
  name: string;
  entrypoints: Record<string, { pricing?: { invoke?: string }; price?: string; description?: string }>;
  capabilities?: { extensions?: Array<Record<string, unknown>> };
}

const [entrypoint = "payout", ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const seller = String(args.seller ?? process.env.SELLER_URL ?? "http://localhost:8787").replace(/\/+$/, "");
const reference = String(args.reference ?? `buyer-${Date.now().toString(36)}`);
const privateKey = process.env.BUYER_PRIVATE_KEY;

process.exitCode = await main();

async function main(): Promise<number> {
  const card = (await (await fetch(`${seller}/.well-known/agent-card.json`)).json()) as AgentCard;
  console.log(`agent      ${card.name}`);
  for (const [key, def] of Object.entries(card.entrypoints)) {
    console.log(`  ${key.padEnd(10)} ${def.pricing?.invoke ?? def.price ?? "free"}`);
  }
  const descriptor = card.capabilities?.extensions?.find((e) => e.uri === "urn:landed:keeperhub-execution:v1");
  if (descriptor) {
    const params = descriptor.params as Record<string, unknown>;
    console.log(`execution  ${String(params?.executionLayer)} via ${String(params?.keeperhub)}`);
  }

  if (entrypoint === "watch") {
    return watch();
  }

  const priced = card.entrypoints[entrypoint]?.pricing?.invoke ?? card.entrypoints[entrypoint]?.price;
  let paidFetch: typeof fetch = fetch;
  let buyerAddress: Hex | undefined;
  if (privateKey && privateKey !== "0x...") {
    const account = accountFromPrivateKey(privateKey as Hex);
    buyerAddress = account.address as Hex;
    paidFetch = createX402Fetch({ account, networks: ["base-sepolia"] }) as unknown as typeof fetch;
  } else if (priced) {
    console.error(`entrypoint "${entrypoint}" costs ${priced} but BUYER_PRIVATE_KEY is not set`);
    return 2;
  }

  const publicClient = createPublicClient({ chain: baseSepolia, transport: viemHttp(process.env.BASE_SEPOLIA_RPC) });
  const usdcBalance = async (address: Hex) =>
    formatUnits(await publicClient.readContract({ address: USDC_BASE_SEPOLIA, abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [address] }), 6);

  const before = buyerAddress ? await usdcBalance(buyerAddress) : undefined;
  if (buyerAddress) {
    console.log(`buyer      ${buyerAddress}  USDC before: ${before}`);
  }

  const input: Record<string, unknown> = { reference };
  if (args.to) input.recipientAddress = args.to;
  if (args.amount) input.amount = String(args.amount);
  if (typeof args.cron === "string") input.cron = args.cron;
  if (typeof args.timezone === "string") input.timezone = args.timezone;
  if (args["run-now"]) input.runNow = true;
  if (typeof args.json === "string") Object.assign(input, JSON.parse(args.json) as Record<string, unknown>);

  // Lucid's HTTP idempotency key must be 20-256 chars; derive it from the reference so a retry replays.
  // --fresh-key sends a new HTTP key so the handler re-runs and KeeperHub's own replay (replayed: true) shows.
  const idempotencyKey = args["fresh-key"]
    ? randomBytes(16).toString("hex")
    : createHash("sha256").update(`landed:${entrypoint}:${reference}`).digest("hex");
  console.log(`invoke     POST ${seller}/entrypoints/${entrypoint}/invoke  reference=${reference}${priced ? `  (x402 ${priced} USD)` : ""}`);
  console.log(`           Idempotency-Key ${idempotencyKey.slice(0, 16)}… (${args["fresh-key"] ? "fresh random key" : "sha256 of the reference"})`);

  const started = Date.now();
  const res = await paidFetch(`${seller}/entrypoints/${entrypoint}/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ input }),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }
  console.log(`response   HTTP ${res.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  for (const header of ["payment-response", "x-payment-response", "payment-receipt"]) {
    const value = res.headers.get(header);
    if (value) console.log(`  ${header}: ${value.length > 120 ? `${value.slice(0, 120)}…` : value}`);
  }
  console.log(JSON.stringify(body, null, 2));

  const runId = (body as { run_id?: string }).run_id;
  if (runId) {
    console.log(`run        ${runId}  (same run_id on a retry = Lucid replayed the stored response; the handler did not re-run)`);
  }
  if (res.ok && entrypoint === "payout") {
    const output = (body as { output?: Record<string, unknown> }).output ?? {};
    console.log(`landed     ${String(output.transactionLink ?? output.transactionHash)}${output.replayed ? "  (KeeperHub replayed the original execution: same reference, no second transfer)" : ""}`);
  }
  if (res.ok && entrypoint === "subscribe") {
    const output = (body as { output?: Record<string, unknown> }).output ?? {};
    console.log(`scheduled  workflow ${String(output.workflowId)} (${output.created ? "created" : "reused"}) cron=${String(output.cron)}`);
  }

  if (buyerAddress) {
    const after = await usdcBalance(buyerAddress);
    const delta = Number(after) - Number(before);
    console.log(`buyer      USDC after: ${after}  (${delta >= 0 ? "+" : ""}${delta.toFixed(6)})`);
    if (!res.ok && Math.abs(delta) < 1e-9) {
      console.log("           the call failed and the buyer was not charged: the cent never left.");
    }
  }
  return res.ok ? 0 : 1;
}

async function watch(): Promise<number> {
  console.log(`stream     POST ${seller}/entrypoints/watch/stream  reference=${reference}`);
  const res = await fetch(`${seller}/entrypoints/watch/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: { reference } }),
  });
  console.log(`response   HTTP ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) {
    return res.ok ? 0 : 1;
  }
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data:")) printEnvelope(line.slice(5).trim());
    }
  }
  return res.ok ? 0 : 1;
}

function printEnvelope(json: string): void {
  try {
    const env = JSON.parse(json) as { kind: string; control?: string; payload?: Record<string, unknown>; status?: string; code?: string; message?: string };
    if (env.kind === "control" && env.control === "stage") {
      const p = env.payload ?? {};
      console.log(`  ${String(p.stage).padEnd(16)} ${String(p.at)}${p.detail ? `  ${JSON.stringify(p.detail)}` : ""}`);
    } else if (env.kind === "control" && env.control === "finished") {
      const p = env.payload ?? {};
      console.log(`  finished         outcome=${String(p.outcome)} execution=${String(p.executionId)} tx=${String(p.transactionHash)}`);
    } else if (env.kind === "run-end") {
      console.log(`  run-end          ${String(env.status)}`);
    } else if (env.kind === "error") {
      console.log(`  error            ${String(env.code)}: ${String(env.message)}`);
    }
  } catch {
    console.log(`  ${json}`);
  }
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
