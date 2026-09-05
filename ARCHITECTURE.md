# Architecture — Landed

## Components

```
apps/buyer (CLI)                     apps/payout-agent (Lucid seller, Hono on Node)
  discover agent card  ─────────►    GET /.well-known/agent-card.json
  POST /entrypoints/payout/invoke ─► http() auth gate: x402 verify → idempotency claim → admit()
  ◄─ 402 challenge / retry with        │
     PAYMENT-SIGNATURE                 ▼
                                     keeperhub() extension  (packages/lucid-keeperhub)
                                       policy gate (chain/token/recipient/max)
                                       key = derive(taskId|chainId|to|amount|token)
                                       simulate ──► KeeperHub POST /api/execute/transfer {simulate:true}
                                       execute  ──► same body, Idempotency-Key: key
                                       verify   ──► GET /api/execute/{id}/status until terminal
                                       receipts[].verified && receiptStatus=="success"
                                       │ ok → return proof → http finalize() settles x402
                                       │ fail/unconfirmed → throw → no settlement
                                     packages/keeperhub-client (framework-agnostic)
```

- **packages/keeperhub-client** — typed client for KeeperHub direct execution: `simulateTransfer`, `executeTransfer`, `contractCall`, `getStatus`, `waitForTerminal` (honors `X-Poll-Interval-Hint`), `deriveIdempotencyKey` (KeeperHub's canonical `taskId|chainId|to|amount|token` SHA-256 rule), replay/conflict/in-progress handling, rate-limit backoff. Zero framework deps. Candidate DX contribution upstream.
- **packages/lucid-keeperhub** — Lucid extension `keeperhub(config)` returning runtime slice `runtime.keeperhub` (`simulate`, `execute`, `status`, `log`), an entrypoint factory `keeperhubTransferEntrypoint({...})` that produces a Lucid `EntrypointDef` with the simulate → execute → verify handler, an `onManifestBuild` hook that adds `x-keeperhub` execution metadata (chains, sponsorship, policy summary) to the agent card, and an in-memory execution log with stage timestamps.
- **apps/payout-agent** — seller: entrypoints `payout` (priced, x402 exact on `eip155:84532`), `simulate-payout` (free), `execution` (free status lookup). Runs with `@hono/node-server`.
- **apps/buyer** — buyer CLI: fetch card, wrap fetch with `createX402Fetch` from `@lucid-agents/payments` using a local Base Sepolia key, invoke `payout`, print KeeperHub `transactionLink` and settlement evidence. Also drives the failing case.
- **mock KeeperHub server** (tests + replay mode): deterministic fixtures for 202/completed, 400 wouldRevert, 409 in-progress then completed, 409 conflict with originalExecutionId, `unconfirmed` then `completed`, 429 with Retry-After, 5xx.

## Lifecycle mapping (the hard part)

| Lucid (http authorization) | KeeperHub | Landed rule |
|---|---|---|
| verify x402 credential (no settlement) | — | reject early if policy denies (before any reservation) |
| win idempotency claim (`Idempotency-Key` from buyer or generated) | `Idempotency-Key` header | derive KeeperHub key from Lucid's claim key as `taskId`, joined with canonical effect fields |
| admit(): reserve policy capacity | `simulate: true` | dry run must return `success && !wouldRevert`, else throw → capacity released, no charge |
| invoke handler | execute, then poll status | bounded wait; `unconfirmed` is non-terminal, keep polling up to `maxWaitMs` |
| finalize(): settle payment on handler success | `receipts[].verified === true`, `receiptStatus === "success"` | only then return; anything else throws → Lucid does not settle |
| retry from buyer with same key | replay (`idempotentReplay: true`) or `409 in_progress` | return original proof; never rotate the key while in flight |

## Failure handling
- 400 wouldRevert / `insufficient_balance` → typed `PreflightFailed`, no broadcast, buyer not charged.
- 409 `idempotency_in_progress` → wait `Retry-After`/hint, re-send same key.
- 409 `idempotency_conflict` → canonicalize body; if `originalExecutionId` present, poll it; never rotate.
- `unconfirmed` → non-terminal; poll until `maxWaitMs`, then `Unconfirmed` error carrying `executionId`/hash; log says "unknown, do not re-send".
- 429 → back off per `Retry-After` with cap; 5xx → retry same key.
- Handler never converts absence of evidence into success.

## Observability
Each execution produces an ordered event list: `policy_ok`, `simulated`, `broadcast_requested`, `execution_id`, `status:<x>`, `verified`/`failed` with timestamps and KeeperHub ids; exposed via the `execution` entrypoint and printed by the seller. KeeperHub's own run history/analytics is the second audit trail (shown in the demo).

## Tech choices and why
- TypeScript + Node 24 + npm workspaces: Lucid runtime supports Node ≥ 20.9; Bun is not installed here; judges read TS (KeeperHub is TS).
- REST direct execution rather than MCP for the seller: deterministic, typed, no LLM in the execution path (the whole point of the theme). MCP is used by the *buyer-side* demo with Claude only if time permits.
- vitest + a fetch-mock KeeperHub server: failure paths are testable without the network.
- No database: in-memory execution log + KeeperHub as the system of record; Lucid's payment storage in-memory (documented limitation).

## Alternatives rejected
- Wayfinder Paths SDK: signing goes through Wayfinder's gated `wk_` API or raw local keys, mainnet-only DeFi adapters, Python; no free API key path found. Too risky for 12 solo days with no mainnet funds.
- Almanak: already a KeeperHub partner; gateway-only architecture holds secrets and executes via Safe/Zodiac; low novelty, high complexity.
- Deprecated `@daydreamsai/core`: the maintainers say it is obsolete; integrating with it would read as integrating a dead thing.
