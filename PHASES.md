# Phases — Landed

Deadline: **Sep 18, 15:30 IST**. Feature freeze: **Sep 14 (70%)**. After the freeze: rehearsal, video, submission only.
Strategy and the unforgettable moment: [EDGE.md](EDGE.md).

| Phase | Dates | Ships | Rubric line | Status |
|---|---|---|---|---|
| 0. Research + framework docs | Sep 5 | HACKATHON, PRD, ARCHITECTURE, PHASES, GAPS, MEMORY, DEMO, EDGE, JUDGES; scaffold; CI | — | ✅ |
| 1. KeeperHub client | Sep 5 | `@landed/keeperhub-client`: direct execution + workflows, canonical idempotency keys, poll-hint waiting, faithful mock (75 tests) | Reliability, DX | ✅ |
| 2. Lucid extension + seller | Sep 5 | `keeperhub()` extension, policy, execution log with subscriptions, agent-card descriptor, entrypoints `payout`, `subscribe`, `dry-run`, `execution`, `watch` (SSE); seller on Node; replay mode verified over HTTP (31 tests) | Integration depth | ✅ offline; live pending |
| 3. First real transaction | as soon as the key arrives | `npm run smoke` lands a Base Sepolia USDC transfer; proof link into README and DEMO | Execution | ⏳ credentials |
| 4. x402 buyer flow | key + funded buyer | `npm run seller` + `npm run buyer`: 402 → pay → 200 with proof; failing case with unchanged balance | Usefulness, Execution | ⏳ credentials |
| 5. Ledger + mainnet | Sep 7–17, daily | `npm run ledger -- --count 20` every day into `docs/receipts.json`; a few Base mainnet payouts if ~$5 USDC is provided | Execution (volume) | ⏳ credentials |
| 6. Public seller URL | Sep 8–9 | deployed seller (Render/Railway), agent card reachable, judge-as-buyer instructions with KeeperHub's own agentic wallet | Usefulness, panel | ⏳ hosting account |
| 7. Bounty issue → PR | issue now → PR by Sep 12 | `bounty/ISSUE-DRAFT-lucid-agents-plugin.md` posted, `accepted`, plugin PR with tests; separate BUIDL | Bounty | ⏳ permission to post |
| 8. Upstream to Lucid | Sep 6 | PR to daydreamsai/lucid-agents adding `@lucid-agents/keeperhub` in their package layout (Bun, tsup, changeset, docs page) | Depth | ✅ PR #1717 open, unreviewed |
| 9. Reliability report | Sep 12–13 | REPORT.md with numbers from the real API: time to verified receipt, sponsorship rate, unconfirmed/409 occurrences, chaos test results | Reliability | ⏳ after live runs |
| **Freeze** | **Sep 14** | no new features | | |
| 10. Rehearsal | Sep 14–15 | fresh-clone DEMO.md run, dead-network fallback, 4-minute panel script from EDGE.md | Panel | |
| 11. Video + submission | Sep 15–17 | demo video, BUIDL text (form answers in HACKATHON.md), submit by **Sep 17** | — | |
| Buffer | Sep 18 morning | fix-only | | |

What is built and verified without any credentials (as of Sep 5, 23:50 IST): 106 tests green, typecheck clean, six commits; mock replay over real HTTP for payout, refusal, policy stop, both idempotency layers, subscribe (create, reuse, run-now), and the SSE stage stream.

Bounty candidates, ranked:
1. Lucid Agents connector plugin for KeeperHub workflows (draft written). "Landed makes Lucid agents sellers of KeeperHub execution; the plugin makes KeeperHub workflows buyers of Lucid agents."
2. Server-side stable idempotency key for direct execution: accept `taskId` in the body and return the derived key (DX improvement; needs an issue).
3. Docs guide "Integrating KeeperHub into an x402 seller" (weakest).
Rules from ISSUES.md: file the issue first (reason/scope/plan), start the PR only on `accepted`, reference the issue in the PR title.
