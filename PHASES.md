# Phases — Landed

Deadline: **Sep 18, 15:30 IST**. Feature freeze: **Sep 14 (70%)**. After the freeze: rehearsal, video, submission only.

| Phase | Dates | Ships | Rubric line |
|---|---|---|---|
| 0. Research + framework docs | Sep 5 | HACKATHON.md, PRD, ARCHITECTURE, PHASES, GAPS, MEMORY, DEMO; repo scaffold | — |
| 1. KeeperHub client | Sep 5–6 | `@landed/keeperhub-client` with mock-server tests: simulate/execute/status/wait, key derivation, 409/429/unconfirmed handling | Reliability, DX |
| 2. First real transaction | Sep 6–7 | user's `kh_` key + Base Sepolia funding → `npm run smoke` lands a USDC transfer and prints `transactionLink` (submission proof #1) | Execution |
| 3. Lucid extension + seller | Sep 7–9 | `keeperhub()` extension, entrypoint factory, policy, execution log, agent-card metadata; `apps/payout-agent` running on Node | Integration depth |
| 4. x402 buyer flow | Sep 9–10 | `apps/buyer` pays 0.01 USDC on Base Sepolia, invokes `payout`, gets proof; failing-transfer case shows no settlement | Usefulness, Execution |
| 5. Bounty issue + PR | Sep 8 (issue) → Sep 12 (PR) | issue in keeperhub/keeperhub, wait for `accepted`, PR with tests; separate BUIDL | Bounty |
| 6. Upstream + polish | Sep 11–13 | PR/issue to daydreamsai/lucid-agents adding the extension; README with tx links, CI, replay mode | Depth, DX |
| **Freeze** | **Sep 14** | no new features | |
| 7. Rehearsal | Sep 14–15 | fresh-clone run of DEMO.md, dead-network replay mode, timing the pitch to 4 minutes | Panel |
| 8. Video + submission | Sep 15–17 | demo video, BUIDL text (form answers in HACKATHON.md), submit by **Sep 17** | — |
| Buffer | Sep 18 morning | fix-only | |

Bounty candidates (pick one by Sep 8, after seeing what the integration needed):
1. DX gap found while integrating (preferred story: "we integrated, we hit this, we fixed it upstream"), e.g. a canonical idempotency-key helper / poll-hint helper in the repo, or a callback URL on direct execution.
2. Issue #2289 (accepted, good first issue, help wanted): measure end-to-end trigger-to-broadcast latency.
3. Issue #2240 (accepted, help wanted): trigger on a threshold over contract state — larger; only if 1–2 fall through.
Rules from ISSUES.md: file the issue first (reason/scope/plan), start only on `accepted`, reference the issue in the PR title.
