# Gaps — what is missing, broken, or unverified (keep current)

Updated 2026-09-06 (early). Plain-language steps for the user: [SETUP-STEPS.md](SETUP-STEPS.md).

## Done
- [x] DoraHacks hacker registration (user)
- [x] KeeperHub Discord joined (user)
- [x] Public repo https://github.com/0xsaroj001/landed pushed; CI on every push
- [x] Forks for upstream PRs: 0xsaroj001/keeperhub, 0xsaroj001/lucid-agents
- [x] Bounty issue posted: https://github.com/KeeperHub/keeperhub/issues/2329 (waiting for `accepted`)
- [x] Bun 1.4 installed for the Lucid upstream test suite
- [x] Buyer wallet generated into `.env` (`0x8abd6c9DBD4BD6AbdD4377694D19aBcCa55Ae784`, throwaway, testnet only)
- [x] `render.yaml` blueprint for a one-click public seller

## Blocking on the user
- [ ] KeeperHub organisation `kh_` key in `.env` (Step 1)
- [ ] Org wallet funded with Base Sepolia USDC (Step 2); Base Sepolia ETH optional
- [ ] Buyer wallet `0x8abd6c9DBD4BD6AbdD4377694D19aBcCa55Ae784` funded with Base Sepolia USDC (Step 3)
- [ ] Render account + Blueprint deploy for the public URL (Step 4)
- [ ] Optional: ~$5 USDC on Base mainnet to the org wallet (Step 5)
- [ ] Confirm the GitHub account: everything was created under `0xsaroj001` (the account the `gh` CLI is logged into); `Harshyadav442277` is also logged in but inactive

## Verified ✅
- Lucid Agents stable packages run on Node 24 with `@hono/node-server`; no Bun needed at runtime.
- Fresh-clone `npm install && npm run typecheck && npm test`: 106 tests green.
- Dead-network replay over real HTTP: payout, dry-run refusal, policy stop, both idempotency layers, restart recovery, `subscribe` (create, reuse, run-now), `watch` SSE stream.

## Unverified ⏳ (verify before relying on them)
- x402 buyer flow on Base Sepolia through Lucid's `createX402Fetch` against `https://x402.org/facilitator` (`eip155:84532`, exact scheme).
- KeeperHub gas sponsorship on Base Sepolia for a fresh org (docs: testnet gas not metered).
- Live shapes of `POST /api/execute/transfer`, `GET /api/execute/{id}/status`, `POST /api/workflows/create` (`tokenConfig` as a bare address string), `GET /api/workflows/executions/{id}/wait`.
- Real execution latency versus Lucid's invoke path (no per-invoke timeout found; tasks have a 5-minute safety timeout).
- Render free tier cold start and whether the agent card is served correctly behind Render's proxy (`AGENT_ORIGIN`).

## Known limitations to state candidly in the submission
- Testnet only unless Step 5 happens. Mainnet is a config change.
- Lucid surfaces thrown handler errors as HTTP 500 `internal_error`; the Landed code is in the message; the structured record comes from the free `execution` entrypoint.
- In-memory payment storage and execution log; a restart loses the agent-side log (KeeperHub keeps the authoritative history; the shared idempotency key makes recovery safe, see the restart test).
- Dead-network demo uses the in-memory KeeperHub.
- Upstream PR to daydreamsai/lucid-agents not opened yet (planned Sep 10–13). Bounty plugin waits for `accepted` on #2329 per their policy.
