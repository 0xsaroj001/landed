/**
 * Ledger: run N real transfers through KeeperHub and append every outcome, landed or not, to docs/receipts.json.
 * The file is the evidence judges can verify hash by hash.
 *
 *   npm run ledger -- --count 5 [--amount 0.01] [--to 0x...] [--token 0x...|native] [--chain 84532] [--tag day1]
 *   npm run ledger -- --summary
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ExecutionFailed,
  ExecutionUnconfirmed,
  KeeperHubClient,
  PreflightFailed,
  USDC,
  deriveTransferKey,
} from "@landed/keeperhub-client";

interface ReceiptRow {
  reference: string;
  tag: string;
  chainId: string;
  tokenAddress: string | null;
  recipientAddress: string;
  amount: string;
  idempotencyKey: string;
  outcome: "landed" | "preflight_failed" | "failed" | "unconfirmed" | "error";
  executionId: string | null;
  transactionHash: string | null;
  transactionLink: string | null;
  sponsored: boolean | null;
  replayed: boolean | null;
  blockNumber: number | null;
  gasUsed: string | null;
  error: string | null;
  startedAt: string;
  ms: number;
}

const args = parseArgs(process.argv.slice(2));
const file = resolve(String(args.file ?? "docs/receipts.json"));
const rows: ReceiptRow[] = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ReceiptRow[]) : [];

if (args.summary) {
  printSummary(rows);
  process.exit(0);
}

const apiKey = process.env.KEEPERHUB_API_KEY;
if (!apiKey || apiKey === "kh_...") {
  console.error("KEEPERHUB_API_KEY is not set (see .env.example)");
  process.exit(2);
}

const count = Math.max(1, Number(args.count ?? 1));
const chainId = String(args.chain ?? process.env.KEEPERHUB_CHAIN_ID ?? "84532");
const amount = String(args.amount ?? "0.01");
const tokenArg = typeof args.token === "string" ? args.token : (process.env.PAYOUT_TOKEN ?? USDC[chainId as keyof typeof USDC]);
const tokenAddress = tokenArg === "native" ? undefined : tokenArg;
const tag = String(args.tag ?? new Date().toISOString().slice(0, 10));

const client = new KeeperHubClient({ apiKey, baseUrl: process.env.KEEPERHUB_BASE_URL });
const me = await client.me();
if (!me.walletAddress) {
  console.error("org wallet is still provisioning; retry in a minute");
  process.exit(1);
}
const recipientAddress = String(args.to ?? me.walletAddress);
console.log(`ledger  ${count} × ${amount} ${tokenAddress ? "token" : "native"} on ${chainId} → ${recipientAddress}  tag=${tag}  file=${file}`);

let landed = 0;
for (let i = 0; i < count; i += 1) {
  const reference = `ledger-${tag}-${String(Date.now()).slice(-6)}-${i + 1}`;
  const request = { chainId, recipientAddress, amount, tokenAddress };
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const row: ReceiptRow = {
    reference,
    tag,
    chainId,
    tokenAddress: tokenAddress ?? null,
    recipientAddress: recipientAddress.toLowerCase(),
    amount,
    idempotencyKey: deriveTransferKey({ taskId: reference, chainId, recipientAddress, amount, tokenAddress }),
    outcome: "error",
    executionId: null,
    transactionHash: null,
    transactionLink: null,
    sponsored: null,
    replayed: null,
    blockNumber: null,
    gasUsed: null,
    error: null,
    startedAt,
    ms: 0,
  };
  try {
    const proof = await client.transferAndVerify(request, { taskId: reference });
    row.outcome = "landed";
    row.executionId = proof.executionId;
    row.transactionHash = proof.transactionHash;
    row.transactionLink = proof.transactionLink ?? null;
    row.sponsored = proof.sponsored;
    row.replayed = proof.replayed;
    row.blockNumber = proof.receipt.blockNumber ?? null;
    row.gasUsed = proof.receipt.gasUsed ?? null;
    landed += 1;
  } catch (error) {
    if (error instanceof PreflightFailed) {
      row.outcome = "preflight_failed";
      row.error = error.message;
    } else if (error instanceof ExecutionFailed) {
      row.outcome = "failed";
      row.executionId = error.state.executionId;
      row.transactionHash = error.state.transactionHash ?? null;
      row.error = error.message;
    } else if (error instanceof ExecutionUnconfirmed) {
      row.outcome = "unconfirmed";
      row.executionId = error.state.executionId;
      row.transactionHash = error.state.transactionHash ?? null;
      row.error = error.message;
    } else {
      row.error = error instanceof Error ? error.message : String(error);
    }
  }
  row.ms = Date.now() - t0;
  rows.push(row);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`${String(i + 1).padStart(3)}/${count}  ${row.outcome.padEnd(16)} ${(row.ms / 1000).toFixed(1).padStart(6)}s  ${row.transactionLink ?? row.error ?? ""}`);
}

console.log(`\n${landed}/${count} landed this run`);
printSummary(rows);

function printSummary(all: ReceiptRow[]): void {
  const byOutcome = new Map<string, number>();
  const byChain = new Map<string, number>();
  let sponsored = 0;
  let totalMs = 0;
  for (const r of all) {
    byOutcome.set(r.outcome, (byOutcome.get(r.outcome) ?? 0) + 1);
    if (r.outcome === "landed") {
      byChain.set(r.chainId, (byChain.get(r.chainId) ?? 0) + 1);
      if (r.sponsored) sponsored += 1;
      totalMs += r.ms;
    }
  }
  const landedCount = byOutcome.get("landed") ?? 0;
  console.log(`receipts.json  ${all.length} rows`);
  for (const [k, v] of byOutcome) console.log(`  ${k.padEnd(16)} ${v}`);
  for (const [k, v] of byChain) console.log(`  landed on ${k}: ${v}`);
  if (landedCount > 0) {
    console.log(`  sponsored gas: ${sponsored}/${landedCount}   mean time to verified receipt: ${(totalMs / landedCount / 1000).toFixed(1)}s`);
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
