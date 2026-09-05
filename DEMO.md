# Demo — exact steps, exact expected output

Legend: ✅ verified on this machine (date noted) · ⏳ unverified, blocked on credentials or funding.

## Prerequisites
- Node 24 (`node -v` → `v24.x`), npm 11. No Bun, no pnpm needed.
- For the real-network steps, `.env` at the repo root (copy `.env.example`):
  ```
  KEEPERHUB_API_KEY=kh_...            # organisation key, write scope
  KEEPERHUB_CHAIN_ID=84532            # Base Sepolia
  PAYOUT_TOKEN=0x036CbD53842c5426634e7929541eC2318f3dCF7e   # Base Sepolia USDC
  PAYMENTS_RECEIVABLE_ADDRESS=0x...   # seller's payTo
  PAYMENTS_FACILITATOR_URL=https://x402.org/facilitator
  PAYMENTS_NETWORK=eip155:84532
  BUYER_PRIVATE_KEY=0x...             # throwaway, funded with Base Sepolia USDC
  ```

## 1. Fresh clone → tests (no network) ✅ 2026-09-05
```bash
git clone <repo> landed && cd landed && npm install && npm run typecheck && npm test
```
Expected:
```
 ✓ packages/keeperhub-client/test/idempotency.test.ts (38 tests)
 ✓ packages/keeperhub-client/test/client.test.ts (33 tests)
 ✓ packages/lucid-keeperhub/test/extension.test.ts (17 tests)
 ✓ apps/payout-agent/test/app.test.ts (5 tests)
 Test Files  4 passed (4)
      Tests  93 passed (93)
```

## 2. Dead-network replay: seller + buyer over HTTP ✅ 2026-09-05
Terminal A:
```bash
npm run seller:mock
```
Expected:
```
landed-payout-agent listening on http://localhost:8787  [MOCK KeeperHub: replay mode, no network]
  agent card   http://localhost:8787/.well-known/agent-card.json
  entrypoints  payout (free), dry-run (free), execution (free)
  policy       chain=84532 token=0x036CbD53842c5426634e7929541eC2318f3dCF7e maxAmount=1000
  keeperhub    https://keeperhub.mock  org wallet 0x1111111111111111111111111111111111111111
```
Terminal B, happy path:
```bash
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 0.01 --reference demo-1
```
Expected: `response   HTTP 200`, then `output` with `executionId: "direct_1"`, `transactionLink: https://sepolia.basescan.org/tx/0xaaa…1`, `sponsored: true`, `receipt.verified: true`, `receipt.receiptStatus: "success"`, and a `timeline` of `received → policy_ok → simulated → broadcast → accepted → landed`.

The cent never leaves (dry run refuses, nothing broadcast):
```bash
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 500 --reference demo-2
```
Expected:
```
response   HTTP 500
{ "error": { "code": "internal_error",
  "message": "preflight_failed: KeeperHub dry run refused to broadcast code=insufficient_balance failureKind=validation" } }
```
Look up what happened:
```bash
npm run buyer -- execution --reference demo-2
```
Expected: `found: true`, `record.outcome: "preflight_failed"`, no `executionId`, stages `received → policy_ok → preflight_failed`.

Two idempotency layers:
```bash
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 0.01 --reference demo-1
```
Expected: same `run_id` as the first call; Lucid replayed the stored response, the handler did not run.
```bash
npm run buyer -- payout --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --amount 0.01 --reference demo-1 --fresh-key
```
Expected: new `run_id`, same `executionId: "direct_1"`, `replayed: true`; KeeperHub answered from its idempotency store, no second transfer.

Policy stop (before any KeeperHub call): `--amount 5000` → `HTTP 500`, message `policy_denied: amount 5000 exceeds the agent's maximum of 1000`.

## 3. Smoke: one real transfer through KeeperHub ⏳ needs KEEPERHUB_API_KEY + Base Sepolia USDC in the org wallet
```bash
npm run smoke
```
Expected (shape from the docs, to be confirmed):
```
 +0.3s  probing        https://app.keeperhub.com/api/keys
 +0.6s  org wallet     0x…
 +0.9s  chain          84532 Base Sepolia enabled=true testnet=true
 +0.9s  intent         0.01 token 0x036c… → 0x… reference=smoke-2026-09-06-xxxxxx
 +2.1s  simulated      success=true wouldRevert=false gasEstimate=… from=0x…
 +9.8s  accepted       executionId=direct_… status=completed
 +10.2s status         completed sponsored=true hint=0s receipts=1
 +10.2s landed         tx=0x… block=… gasUsed=… sponsored=true
 +10.2s proof          https://sepolia.basescan.org/tx/0x…
```
The `proof` line is submission requirement #3.

## 4. Real seller + x402 buyer on Base Sepolia ⏳ needs the smoke above plus BUYER_PRIVATE_KEY funded with USDC
Terminal A: `npm run seller` → `entrypoints  payout (x402 0.01 USD on eip155:84532), …`
Terminal B: `npm run buyer -- payout --to 0xRecipient --amount 0.01 --reference inv-1`
Expected: first response `402`, the buyer signs the x402 payment, retry returns `200` with the proof and a `payment-response` header; `USDC after` is 0.01 lower than before.
Failing case: `--amount 500` → `HTTP 500 … preflight_failed …` and `USDC after` equals `USDC before` ("the cent never left").

## 5. Judge journey (what the finalist call shows, in order)
1. `npm test` green from a fresh clone (30 s).
2. Agent card in the browser: the `urn:landed:keeperhub-execution:v1` descriptor and the priced `payout` entrypoint.
3. Buyer pays and gets a Base Sepolia transaction link; open it.
4. Buyer tries an amount the wallet cannot cover: refusal, balance unchanged.
5. Retry with the same reference: no second transfer, at both layers.
6. KeeperHub dashboard: the same executions in the audit trail.
