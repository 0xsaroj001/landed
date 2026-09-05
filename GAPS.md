# Gaps — what is missing, broken, or unverified (keep current)

Updated 2026-09-05.

## Blocking on the user
- [ ] DoraHacks registration for the hackathon
- [ ] KeeperHub account + org `kh_` API key (write scope) in `.env`
- [ ] Org wallet funded with Base Sepolia USDC (Circle faucet) and a little Base Sepolia ETH
- [ ] Buyer wallet private key (throwaway) funded with Base Sepolia USDC
- [ ] Discord joined; office-hour dates noted
- [ ] Public GitHub repo created and pushed

## Unverified assumptions (verify before relying on them)
- Lucid `@lucid-agents/*` stable packages (core 5.0.0, http 4.0.0, hono 1.0.2, payments 5.0.0, a2a 2.0.0) run on Node 24 with `@hono/node-server`; peer dependency set unknown until `npm install`.
- x402 testnet facilitator `https://x402.org/facilitator` supports `eip155:84532` exact scheme with Lucid's `createX402Fetch`.
- KeeperHub gas sponsorship applies to a fresh org's Base Sepolia USDC transfer (docs say testnet gas is not metered); otherwise the org wallet needs Base Sepolia ETH.
- Direct execution `/api/execute/transfer` returns synchronously with `status` in `completed|failed|unconfirmed`; status endpoint exposes `receipts[]`, `sponsored`, `X-Poll-Interval-Hint`. Exact JSON field names for `receipts[]` entries to be confirmed from the repo docs (`docs/api/direct-execution.md` after the contract-call section).
- Lucid's invoke path has no handler timeout shorter than KeeperHub's synchronous execution time (10–60 s). Check `@lucid-agents/http` for a per-invoke timeout.
- The Agents Onchain winners list (Aug 20) was not scraped; judges' taste inferred from the OpenAgents wrap-up post instead.

## Known limitations to state candidly in the submission
- Testnet only (Base Sepolia). Mainnet is a config change but was not exercised.
- In-memory payment storage and execution log; restart loses the log (KeeperHub keeps the authoritative history).
- Dead-network demo uses the replay mode against fixtures; a live transaction needs the network.
