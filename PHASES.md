# Phases — Landed

Deadline: **Sep 18, 15:30 IST**. Feature freeze: **Sep 14 (70%)**. After the freeze: rehearsal, video, submission only.

| Phase | Dates | Ships | Rubric line | Status |
|---|---|---|---|---|
| 0. Research + framework docs | Sep 5 | HACKATHON.md, PRD, ARCHITECTURE, PHASES, GAPS, MEMORY, DEMO; repo scaffold | — | ✅ done |
| 1. KeeperHub client | Sep 5 | `@landed/keeperhub-client` with mock-server tests: simulate/execute/status/wait, key derivation, 409/429/5xx/unconfirmed handling (71 tests) | Reliability, DX | ✅ done |
| 2. First real transaction | Sep 6–7 | user's `kh_` key + Base Sepolia funding → `npm run smoke` lands a USDC transfer and prints `transactionLink` (submission proof #1) | Execution | ⏳ blocked on credentials |
| 3. Lucid extension + seller | Sep 5–9 | `keeperhub()` extension, entrypoint factories, policy, execution log, agent-card descriptor; `apps/payout-agent` on Node; replay mode over HTTP | Integration depth | ✅ built and verified offline (22 tests); live run pending |
| 4. x402 buyer flow | Sep 7–10 | `apps/buyer` pays 0.01 USDC on Base Sepolia, invokes `payout`, gets proof; failing case shows the buyer was not charged | Usefulness, Execution | ⏳ CLI written; needs facilitator + funded buyer key |
| 5. Bounty issue + PR | Sep 6 (post issue) → Sep 12 (PR) | issue in keeperhub/keeperhub from `bounty/ISSUE-DRAFT-lucid-agents-plugin.md`, wait for `accepted`, PR with tests; separate BUIDL | Bounty | ⏳ draft ready, needs the user's go-ahead to post |
| 6. Upstream + polish | Sep 11–13 | PR (or issue) to daydreamsai/lucid-agents adding the extension; README with real tx links; CI green on GitHub | Depth, DX | ⏳ |
| **Freeze** | **Sep 14** | no new features | | |
| 7. Rehearsal | Sep 14–15 | fresh-clone run of DEMO.md, dead-network replay mode, pitch timed to 4 minutes | Panel | |
| 8. Video + submission | Sep 15–17 | demo video, BUIDL text (form answers in HACKATHON.md), submit by **Sep 17** | — | |
| Buffer | Sep 18 morning | fix-only | | |

Next concrete steps, in order:
1. User: DoraHacks registration, KeeperHub key, faucet funding, Discord (see GAPS.md).
2. `npm run smoke` with the real key: confirm live response shapes, sponsorship, and capture the first proof link into README and DEMO.
3. `npm run seller` + `npm run buyer` with x402 on Base Sepolia; capture the 402 → 200 flow and the failing case with unchanged balance.
4. Post the bounty issue; while waiting for `accepted`, start the plugin scaffold in a fork (`pnpm create-plugin`), because the plugin code does not depend on the label, only the PR does.
5. Upstream PR to lucid-agents: package `@lucid-agents/keeperhub` mirroring `packages/lucid-keeperhub` with their tooling (Bun/tsup/changeset).

Bounty candidates, ranked:
1. Lucid Agents connector plugin for KeeperHub workflows (draft written). Story: "Landed makes Lucid agents sellers of KeeperHub execution; the plugin makes KeeperHub workflows buyers of Lucid agents."
2. Server-side stable idempotency key for direct execution: accept `taskId` in the body and return the derived key, so integrators stop re-implementing the 12 canonicalization rules (DX improvement; needs an issue).
3. Docs guide "Integrating KeeperHub into an x402 seller" (weakest; docs-only).
Rules from ISSUES.md: file the issue first (reason/scope/plan), start the PR only on `accepted`, reference the issue in the PR title.
