# PRD — Landed

**Landed** makes KeeperHub the execution layer inside Lucid Agents (Daydreams' live agent-commerce runtime), so an agent can sell *verified onchain execution* as a paid entrypoint, and the buyer's USDC settles only when the transaction has landed.

## Claim

**Developers and agents on Lucid Agents (Daydreams)** can now **sell and buy onchain value movement as a typed, discoverable, pay-per-call service where the buyer is charged only for a transaction that verifiably landed**, because we solved **mapping Lucid's authorize → admit → invoke → finalize payment lifecycle onto KeeperHub's simulate → execute → verify execution lifecycle, with one idempotency key shared across both systems.**

## Reality checks

### Jargon strip
AI agents are starting to sell each other small services for cents (Lucid Agents is the toolkit for that). When the service is "move this money on a blockchain", the seller has to actually do the blockchain part, and that part breaks in boring ways: wrong gas, stuck transaction, key on disk, sent twice after a retry. We plug in KeeperHub as the thing that does the blockchain part carefully: it rehearses the transaction first, sends it, keeps retrying until the chain confirms, and writes a receipt. The buyer's payment only goes through after that receipt exists. Everyone can check the receipt on a public block explorer.
Part not fully thought through yet: when the chain says "unconfirmed" for a long time, who holds the buyer's reservation and for how long. Current answer: the invoke fails closed after a bounded wait, the buyer is not charged, and the seller re-checks the same idempotency key before doing anything else.

### Status quo
A Lucid developer who wants a "pay me, I'll send tokens" entrypoint writes ~50 lines of viem with a private key in an env var, and Lucid settles the x402 payment when the handler returns. What is bad: private key on the box; no dry run; no nonce/gas/MEV handling; retry after a timeout can pay twice; the handler usually returns on broadcast, so the buyer is charged before the transaction is confirmed; nothing is auditable across agents. KeeperHub's own paid marketplace fixes execution but only for KeeperHub-authored workflows sold by KeeperHub, not for a developer's own agent with its own price, policy, and identity.

### Who cares
- KeeperHub: distribution into Daydreams' commerce network (32K registered agents on Task Market) and a reference integration for the exact gap they named.
- Lucid developers building payout, treasury, tipping, or DeFi-action agents: no keys, no execution code, outcome-based billing for free.
- Buyer agents: pay for outcomes, get a verified receipt in the same response.
Blunt version: today the "users" are the judges and a few dozen Lucid developers. The value is real but the market is early.

### Failure list (most likely first; the first three are the ones being underestimated)
1. KeeperHub setup friction (captcha signup, org key creation, Base Sepolia funding, gas sponsorship not applying). User-only steps; must finish on day 1.
2. Lucid packages are Bun-first; Node 24 + npm must run `@lucid-agents/hono` with `@hono/node-server`. Verify before writing any integration code.
3. x402 buyer flow on Base Sepolia (facilitator `https://x402.org/facilitator`, Circle faucet USDC, Lucid's `createX402Fetch`) fails or changes. Fallback: keep a free entrypoint path so execution still demos; x402 is the headline, not the only path.
4. Direct execution is synchronous and can take 10–60 s; Lucid invoke/HTTP timeouts must be raised or the a2a task path used.
5. Scope creep in 12 days. Freeze on Sep 14.
6. Another team ships the same Lucid integration. Win on depth: lifecycle mapping, failure-path tests, upstream PR, live failing-transfer demo.
7. Live panel with a dead network. Rehearse, record a backup, ship a replay mode against a mock KeeperHub server.
8. `lucid-agents` repo last pushed 2026-07-26; Task Market shows 2 open tasks. Judges named Daydreams, so "live" is their call, but say it plainly in the submission.

## Judging criteria → build hours (target ~60 build hours + ~14 non-build)
| Criterion | Weight | Hours | What earns it |
|---|---|---|---|
| Integration depth | 25% | 15 | Proper Lucid extension (`keeperhub()`), manifest/agent-card contribution, entrypoint factory, upstream PR to daydreamsai/lucid-agents |
| Execution through KeeperHub | 25% | 12 | Real Base Sepolia transfers via direct execution, tx links in README, dashboard/audit trail shown |
| Reliability & observability | 20% | 12 | Idempotency key derivation per KeeperHub spec, 409/unconfirmed/timeout handling, structured execution log, failure-path tests, replay mode |
| Usefulness & originality | 15% | 8 | Outcome-settled x402 payments, buyer CLI, failing-transfer demo where the cent never leaves |
| DX & code quality | 15% | 8 | Typed client package, README quickstart, 60+ tests, CI |
| Sponsor technology | gate | — | KeeperHub cannot be stubbed: simulate flag, idempotency semantics, receipts, sponsorship are load-bearing |
Non-build: bounty PR to keeperhub/keeperhub (~8 h, separate BUIDL), video + submission + rehearsal (~6 h).

## Novelty
- Not done before: an agent-commerce runtime where the buyer's micropayment settles on the seller's *verified onchain receipt* (outcome-settled execution), with one idempotency key shared between the payment layer and the execution layer.
- Nearest existing thing: KeeperHub's paid marketplace workflows (x402 → KeeperHub executes). Difference: that is KeeperHub selling its own workflows; Landed lets any Lucid agent become a seller of execution with its own price, policy, and ERC-8004 identity, and binds Lucid's task/idempotency model to KeeperHub's.
- The one unforgettable thing: **"The buyer pays a cent; if the transaction doesn't land, the cent never leaves its wallet."** Demoed live with a deliberately failing transfer.

## Scope
In: `@landed/keeperhub-client` (typed direct-execution client), `@landed/lucid-keeperhub` (Lucid extension + entrypoint factory + policy + execution log), `apps/payout-agent` (seller, Hono on Node, x402 on Base Sepolia), `apps/buyer` (CLI buyer), tests, docs, demo video, DoraHacks submission, bounty PR.
Out: mainnet money, Task Market worker, MPP, Solana, workflow builder UI, anything not mapped to a rubric line.

## Success
- Judges can click a Base Sepolia transaction link executed through KeeperHub that a Lucid entrypoint triggered.
- `npm test` green with failure-path coverage; `npm run demo` reproduces the flow from a fresh clone with two env vars.
- Top-3 main track, or one of two bounty awards.
