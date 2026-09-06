# Landed

**KeeperHub as the execution layer inside [Lucid Agents](https://github.com/daydreamsai/lucid-agents) (Daydreams).**
A Lucid agent sells onchain value movement as a paid, typed, discoverable entrypoint. The buyer's USDC settles only when the transaction has verifiably landed.

> The buyer pays a cent. If the transaction does not land, the cent never leaves its wallet.

Built for the [KeeperHub Agent Economy Hackathon](https://dorahacks.io/hackathon/agent-economy/detail) (DoraHacks, September 2026). Status and proof links are kept current in [DEMO.md](DEMO.md) and [GAPS.md](GAPS.md).

## What it does

```
buyer agent ──x402 (Base Sepolia USDC)──► Lucid seller agent ──► keeperhub() extension ──► KeeperHub
                                           payout entrypoint      policy gate               simulate
                                           (price 0.01)           stable idempotency key    broadcast
                                                                  wait for receipt          verify
              ◄── proof: executionId, transactionHash, transactionLink, receipt.verified ──┘
              payment finalizes here, and only here
```

- **`@landed/keeperhub-client`**: a typed client for KeeperHub direct execution that implements the documented safe sequence: dry run with the exact body, broadcast the same body under a stable `Idempotency-Key`, poll honouring `X-Poll-Interval-Hint`, and treat `receipts[].verified` + `receiptStatus === "success"` as the only proof. Handles `409 idempotency_in_progress`, `409 idempotency_conflict`, `429`, `5xx`, `unconfirmed`, and replay markers exactly as KeeperHub documents them. Zero framework dependencies.
- **`@landed/lucid-keeperhub`**: a Lucid extension `keeperhub({ apiKey, policy })` that adds `runtime.keeperhub`, a capability descriptor to the agent card, an execution log, and entrypoint factories (`keeperhubTransferEntrypoint`, `keeperhubDryRunEntrypoint`, `keeperhubStatusEntrypoint`). Handlers throw on anything short of a verified receipt, so Lucid's `finalize()` never settles for a transaction that did not land.
- **`apps/payout-agent`**: the seller (Hono on Node), priced with x402 on Base Sepolia.
- **`apps/buyer`**: a buyer CLI that discovers the card, pays, invokes, and prints its USDC balance before and after.
- **`apps/smoke`**: one real transfer through KeeperHub, stage by stage, ending in a proof link.

## What the payout agent sells

| Entrypoint | Price | KeeperHub surface | What you get |
|---|---|---|---|
| `payout` | 0.01 USD (x402) | direct execution: simulate → broadcast → verified receipt | a landed transfer with `executionId`, `transactionHash`, `transactionLink`, receipt and a stage timeline |
| `subscribe` | 0.01 USD (x402) | agent-authored workflow: `POST /api/workflows/create` with a Schedule trigger | a standing order KeeperHub's scheduler runs on your cron; `runNow` returns the first run's verified hashes |
| `dry-run` | free | simulation | policy verdict plus KeeperHub's dry run, before you pay |
| `execution` | free | audit trail | the full record for a reference |
| `watch` | free | audit trail (SSE) | every stage as it happens |

Every call carries a `reference` (invoice id, task id, period). The same reference never pays twice, at either layer.

## Why this is an integration and not a wrapper

| Lucid lifecycle | KeeperHub lifecycle | Landed rule |
|---|---|---|
| verify x402 credential (no settlement yet) | | policy gate runs first; a denied request costs nobody anything |
| win idempotency claim | `Idempotency-Key` | KeeperHub's key is derived from the caller's `reference` plus the canonical effect fields (`sha256(reference|chainId|recipient|amount|token)`), so both layers agree on what "the same work" is |
| admit and invoke handler | `simulate: true`, then broadcast, then poll | any failure throws; Lucid releases the reservation |
| finalize (settle payment) | `receipts[].verified === true && receiptStatus === "success"` | the handler returns only after this, so settlement implies a landed transaction |

## Quickstart

```bash
npm install
npm test            # 100+ tests against an in-memory KeeperHub that behaves like the documented API
npm run typecheck
```

Real KeeperHub (Base Sepolia, gas sponsored, USDC from https://faucet.circle.com):

```bash
cp .env.example .env   # add KEEPERHUB_API_KEY (organisation kh_ key)
npm run smoke          # one real USDC self-transfer through KeeperHub, prints the transaction link
npm run seller         # payout agent on http://localhost:8787 (x402 if PAYMENTS_* are set)
npm run buyer -- payout --to 0xRecipient --amount 0.01 --reference inv-1
```

Dead-network replay (no credentials, no chain):

```bash
npm run seller:mock
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 0.01
```

## Using it in your own Lucid agent

```ts
import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";
import { keeperhub, keeperhubTransferEntrypoint } from "@landed/lucid-keeperhub";

const agent = await createAgent({ name: "treasury", version: "1.0.0" })
  .use(keeperhub({ apiKey: process.env.KEEPERHUB_API_KEY!, policy: { chains: ["base-sepolia"], tokens: [USDC], maxAmount: "5" } }))
  .use(payments({ config: paymentsFromEnv() }))
  .use(http())
  .build();

agent.entrypoints.add(keeperhubTransferEntrypoint({ key: "payout", price: "0.01", chainId: "base-sepolia", tokenAddress: USDC }));
```

Every call needs a `reference` (invoice id, task id, period). Retrying with the same reference replays the original proof instead of paying twice, at both the Lucid and the KeeperHub layer.

## Error contract and the two idempotency layers

A handler throws instead of returning on anything short of a verified receipt. Lucid turns that into HTTP 500 `{ "error": { "code": "internal_error", "message": "<landed code>: <reason>" } }`; the Landed code is one of `policy_denied`, `preflight_failed`, `execution_failed`, `execution_unconfirmed`, `keeperhub_error`. The free `execution` entrypoint returns the structured record for any `reference` (every stage with timestamps, the KeeperHub execution id, hash, receipt or error).

| Layer | Key | Effect of a retry |
|---|---|---|
| Lucid HTTP | `Idempotency-Key` header (20–256 chars; the buyer sends `sha256("landed:" + entrypoint + ":" + reference)`) | the stored response is replayed; the handler does not run |
| KeeperHub | `sha256(reference|chainId|recipient|amount|token)` | the original execution is replayed with `replayed: true`; no second transfer |

`execution_unconfirmed` means the outcome is unknown, not failed: retry with the same reference and never with a new one.

## Upstream

- Lucid Agents: [daydreamsai/lucid-agents#1717](https://github.com/daydreamsai/lucid-agents/pull/1717) adds `@lucid-agents/keeperhub`, this extension in their package layout, with their Bun test suite, lint, docs page and changeset.
- KeeperHub: [KeeperHub/keeperhub#2329](https://github.com/KeeperHub/keeperhub/issues/2329) proposes the mirror-image connector so KeeperHub workflows can discover and pay Lucid agents.

## Docs

[HACKATHON.md](HACKATHON.md) (brief, rubric, deadlines) · [PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PHASES.md](PHASES.md) · [GAPS.md](GAPS.md) · [MEMORY.md](MEMORY.md) · [DEMO.md](DEMO.md)
