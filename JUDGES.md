# For the reviewer: five minutes, no credentials

Landed makes KeeperHub the execution layer inside Lucid Agents (Daydreams' live agent-commerce runtime). A Lucid agent sells onchain payouts as priced entrypoints; the buyer's x402 payment settles only after KeeperHub's receipt is verified.

## 1. Prove it runs (90 seconds)

```bash
git clone <repo> landed && cd landed && npm install && npm run typecheck && npm test
```

106 tests, four files. The interesting ones:

- `packages/keeperhub-client/test/client.test.ts`: the documented safe sequence against a faithful in-memory KeeperHub, including `409 idempotency_in_progress`, `409 idempotency_conflict`, `429 Retry-After`, `5xx` under the same key, `unconfirmed` as non-terminal, `X-Poll-Interval-Hint` as the terminality signal, replay markers, and receipts that are `completed` but not `verified`.
- `packages/lucid-keeperhub/test/extension.test.ts`: the extension on a real Lucid runtime. Policy denial before any KeeperHub call, dry-run refusal without broadcast, reverted receipt thrown (never returned, so payment cannot settle), seller restart between broadcast and receipt recovered through the shared key, both idempotency layers, SSE stage stream, agent-authored Schedule workflow.

## 2. See it (two terminals, still no credentials)

```bash
npm run seller:mock
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 0.01 --reference demo-1
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 500  --reference demo-2   # dry run refuses; nothing broadcast
npm run buyer -- watch --reference demo-1
npm run buyer -- subscribe --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 0.01 --cron "0 9 * * 1" --run-now --reference payroll-1
```

The in-memory KeeperHub implements the shapes in your docs (`docs/api/direct-execution.md`, `docs/api/workflows.md`, `docs/api/executions.md`) so the same code paths run unchanged against `app.keeperhub.com`.

## 3. Where the integration actually is

- `packages/lucid-keeperhub/src/extension.ts`: the Lucid `Extension` contract (`build`, `onManifestBuild`), the `runtime.keeperhub` slice, the transfer flow (policy → simulate → broadcast under `sha256(reference|chainId|recipient|amount|token)` → wait → `receipts[].verified`), and `schedule` (Schedule trigger → `web3/transfer-token` workflow via `POST /api/workflows/create`).
- `packages/lucid-keeperhub/src/entrypoints.ts`: entrypoint factories a Lucid developer drops into `addEntrypoint`, with zod schemas that Lucid turns into the agent card and OpenAPI.
- `packages/keeperhub-client/src/client.ts`: framework-agnostic client for your direct-execution and workflow APIs. `assertVerified` is the single place that decides what "landed" means.
- The payment-lifecycle mapping and the reasons behind each rule: [ARCHITECTURE.md](ARCHITECTURE.md).

## 4. What still breaks or is unfinished

Kept current in [GAPS.md](GAPS.md). Live Base Sepolia runs, the x402 buyer flow and the mainnet ledger are added there with hashes as they happen.
