# Gaps — what is missing, broken, or unverified (keep current)

Updated 2026-09-05 (end of day 0).

## Blocking on the user (nothing below can be done by Claude)
- [ ] Register as a hacker on the DoraHacks page
- [ ] KeeperHub account + organisation `kh_` API key (write scope) in `.env` as `KEEPERHUB_API_KEY`
- [ ] Org wallet (from `GET /api/user` or the wallet page) funded with Base Sepolia USDC from https://faucet.circle.com, plus a little Base Sepolia ETH as a fallback
- [ ] Buyer wallet: a throwaway private key in `.env` as `BUYER_PRIVATE_KEY`, funded with Base Sepolia USDC from the same faucet
- [ ] Discord https://discord.gg/keeperhub joined; three office-hour dates noted
- [ ] Public GitHub repo `landed` created; push `main`
- [ ] Decide on the bounty issue: post `bounty/ISSUE-DRAFT-lucid-agents-plugin.md` to keeperhub/keeperhub (or tell Claude to post it)

## Verified ✅
- Lucid Agents stable packages (core 5.0.0, http 4.0.0, hono 1.0.2, payments 5.0.0, types 3.0.0) install and run on Node 24 with `@hono/node-server`; no Bun needed.
- Fresh-clone `npm install && npm run typecheck && npm test`: 93 tests green.
- Dead-network replay: seller in mock mode + buyer CLI over real HTTP: success, preflight refusal, policy refusal, execution log lookup.
- Lucid's HTTP idempotency replays the stored response verbatim for the same `Idempotency-Key` (20–256 chars required).

## Unverified ⏳ (verify before relying on them)
- x402 buyer flow on Base Sepolia through Lucid's `createX402Fetch` against `https://x402.org/facilitator` (`eip155:84532`, exact scheme). Never exercised yet.
- KeeperHub gas sponsorship applies to a fresh org's Base Sepolia USDC transfer (docs: testnet gas is not metered). Otherwise the org wallet needs Base Sepolia ETH.
- Live shapes of `POST /api/execute/transfer` and `GET /api/execute/{id}/status` match the docs the client was written against (`receipts[]`, `sponsored`, `X-Poll-Interval-Hint`).
- Real execution latency versus Lucid's invoke path: no per-invoke timeout was found in `@lucid-agents/http` (tasks have a 5-minute safety timeout); a 30–60 s synchronous KeeperHub execution should be fine, but it has not been measured.
- Agents Onchain winners (announced ~Aug 20) were not scraped; the judges' taste is inferred from their OpenAgents wrap-up post.

## Known limitations to state candidly in the submission
- Testnet only (Base Sepolia). Mainnet is a config change; not exercised.
- Lucid surfaces thrown handler errors as HTTP 500 `{ error: { code: "internal_error", message } }`; the Landed error code (`policy_denied`, `preflight_failed`, `execution_failed`, `execution_unconfirmed`) is carried in the message, and the structured record is available from the free `execution` entrypoint.
- In-memory payment storage and execution log; a restart loses the agent-side log (KeeperHub keeps the authoritative history).
- Dead-network demo uses the in-memory KeeperHub; a live transaction needs the network.
- No upstream PR to daydreamsai/lucid-agents yet (planned Sep 11–13). No bounty issue posted yet (needs the user's go-ahead).
