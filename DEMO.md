# Demo — exact steps, exact expected output

Status: **scaffold; every "expected" block below is unverified until marked ✅.** Update as each step is proven.

## Prerequisites
- Node 24 (`node -v` → `v24.x`), npm 11
- `.env` at repo root:
  ```
  KEEPERHUB_API_KEY=kh_...           # org key, write scope
  KEEPERHUB_CHAIN_ID=84532           # Base Sepolia
  PAYOUT_TOKEN=0x036CbD53842c5426634e7929541eC2318f3dCF7e   # Base Sepolia USDC
  PAYMENTS_RECEIVABLE_ADDRESS=0x...  # seller's payTo (any address you control)
  PAYMENTS_FACILITATOR_URL=https://x402.org/facilitator
  PAYMENTS_NETWORK=eip155:84532
  BUYER_PRIVATE_KEY=0x...            # throwaway, funded with Base Sepolia USDC
  ```

## 1. Fresh clone → tests (no network needed)
```bash
git clone <repo> landed && cd landed && npm install && npm test
```
Expected: all test files pass; the mock KeeperHub server exercises simulate, execute, replay, 409 in-progress, 409 conflict, unconfirmed → completed, 429, 5xx.

## 2. Smoke: one real transfer through KeeperHub (proof link)
```bash
npm run smoke -- --to 0xYourOtherAddress --amount 0.01
```
Expected (unverified):
```
policy_ok        chain=84532 token=USDC amount=0.01
simulated        success=true wouldRevert=false gasEstimate=…
broadcast        executionId=direct_… idempotencyKey=… (sha256)
status           completed  sponsored=true
verified         receiptStatus=success block=… 
proof            https://sepolia.basescan.org/tx/0x…
```

## 3. Seller + buyer (x402 on Base Sepolia)
Terminal A:
```bash
npm run seller
```
Expected: `payout-agent listening on http://localhost:8787`, agent card at `/.well-known/agent-card.json` lists `payout` with price `0.01`.

Terminal B:
```bash
npm run buyer -- payout --to 0xYourOtherAddress --amount 0.01
```
Expected (unverified): first response `402`, buyer signs x402 payment, retry returns `200` with `{ executionId, transactionHash, transactionLink, receipt: { verified: true, receiptStatus: "success" } }` and a `Payment-Response` settlement header.

## 4. The unforgettable case: the cent never leaves
```bash
npm run buyer -- payout --to 0xYourOtherAddress --amount 1000000
```
Expected: seller logs `simulated success=false code=insufficient_balance`, responds with an error; buyer's USDC balance is unchanged (script prints balance before/after); no KeeperHub execution id is created.

## 5. Dead-network replay
```bash
npm run demo:replay
```
Expected: same output as step 3 from recorded fixtures, no network calls.
