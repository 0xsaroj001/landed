# EDGE — unfair advantages, and the one unforgettable thing

Written 2026-09-05. Blunt on purpose. Re-read before every build session; delete anything that stops being true.

## 1. Sit in the judge's chair first

The judges are the KeeperHub team (the people who answer issues: suisuss, joelorzet, OleksandrUA). They review every repo themselves, not a form. This is what they have already seen, twice:

- ETHGlobal OpenAgents, ~180 projects: 30 "surface integrations with minimal execution", 25 "passive webhook patterns", 17 that "bypassed native integration entirely for direct HTTP calls". Their words.
- Agents Onchain, 190 projects: the finalist page is a wall of the same idea. Talos, Intent Firewall, Ripcord, Sentinel, Aegis, noyeet, ROGUE, Agentops, RunProof. An LLM decides, a guardrail checks, KeeperHub executes, a dashboard shows it. Liquidation protection for Aave, five times.

So the reviewer opens repo number 60 already tired of: an LLM in the execution path, a chat UI, "the agent decided to rebalance", Sepolia screenshots, mock mode presented as the product, a README that says "production-ready", and any wrapper that could have been a curl.

What made them write a whole blog post: 125 tests and a live deployment (Tradewise), a connector that gave them distribution into other frameworks (Keeper-Gate), 450 confirmed mainnet transactions over 6.9 days (ZW.ARM), and reproducible bug reports filed while building. They said the connectors "signaled a product gap we now intend to close", then shipped ElizaOS, AgentKit, OpenClaw and Hermes integrations. They rewarded people who did their roadmap for them.

For this event they wrote a tighter brief and named three projects. Two of the three (Daydreams, Wayfinder) are not on their integrations page. That is the tell: they want the missing connectors, built well, by someone who reads.

## 2. Our unfair advantages, ranked by what a bored reviewer notices first

| # | Advantage | Why the field will not have it | Cost | Status |
|---|---|---|---|---|
| A1 | **The judge is the buyer.** A public URL where anyone with an x402 wallet pays one cent and gets a real transaction back. The wallet we recommend in the README is KeeperHub's own `@keeperhub/wallet` agentic wallet. Their product pays our agent; their product executes it. | Teams demo to judges. Nobody lets judges execute value movement themselves, and nobody makes the sponsor's wallet the buyer. | hosting account + funded org wallet | needs hosting + credentials |
| A2 | **Outcome-settled payments as a thesis.** Every agent payment rail today settles on response. We settle on the verified receipt, and it only works because KeeperHub produces one. This is their own blog post ("Keep Your Money Until the Work Is Done", "Agents are probabilistic, money is not") turned into a runtime contract with tests. | Others integrate KeeperHub as a tool. We integrate it into the payment lifecycle of a live commerce runtime. | done | built, 93 tests |
| A3 | **Mainnet, small and real.** A handful of Base mainnet USDC payouts, gas sponsored by KeeperHub, hashes in the README, on top of hundreds of testnet ones in a ledger that grows every day until submission. | Most stop at one Sepolia screenshot. ZW.ARM's 450 transactions is the bar they remember. | ~$5 USDC on Base + a cron | ledger script next; funds from user |
| A4 | **Both directions of the loop.** Main track: Lucid agents *sell* KeeperHub execution. Bounty: a KeeperHub plugin so workflows *buy* Lucid agent services. One story, two repos, two prizes. | Bounty entries are usually a random accepted issue. Ours is the mirror image of the main entry. | issue-first, then PR | draft written |
| A5 | **Upstream, not alongside.** A PR to `daydreamsai/lucid-agents` adding `@lucid-agents/keeperhub`, a PR to `keeperhub/keeperhub` for the plugin, and reproducible bug reports for anything we hit. Links in the submission. | Almost nobody touches the upstream repos. They explicitly praised the one team that filed bug reports. | permission to post under the user's account | pending |
| A6 | **Failure paths with data.** Two idempotency layers, `unconfirmed` treated as unknown not failed, 409/429/5xx replay, a chaos test that kills the seller between broadcast and receipt and recovers, and numbers from the real API (latency, sponsorship, poll hints) in a REPORT.md. | Rubric line three is "survives conditions that are not the happy path". Most repos have zero failure tests. | 1 day | half built |
| A7 | **A repo they could merge tomorrow.** Typed client with zero framework deps (a plausible seed for the SDK they do not have), CI, 100+ tests, docs served as Markdown, candid GAPS.md. | "Could another team pick this up" is 15% of the score and usually scores low. | ongoing | on track |
| A8 | **Every surface the form asks about, used for a reason.** REST direct execution (seller), agent-authored workflows (recurring payouts via `POST /api/workflows/create`, Schedule trigger), x402 (buyer), audit trail (execution log + KeeperHub runs), MCP (judge's Claude buying through the KeeperHub wallet skill), CLI (`kh run logs` in the video). | Most use one surface. The form literally asks which ones. | 1 day for workflows | workflows next |
| A9 | **Volume and rigor from an AI pair.** One person, twelve days, output of a small team; submit on Sep 17; rehearse the panel twice. | Solo hackers ship late and thin. | discipline | plan in PHASES.md |
| A10 | **Be a name they know before judging.** Office hours (three sessions), one sharp question, one real bug report, one plugin issue. | Judges remember people who showed up and made their product better. | 1 hour each | user action |

## 3. The unforgettable thing

**A stranger's agent, a cent, a real transaction, and a cent that refuses to leave.**

Panel script, four minutes, no slides:

1. Open the live agent card in a browser. Point at the `urn:landed:keeperhub-execution:v1` descriptor and the price: 0.01 USD.
2. In a terminal, pay it. The buyer prints the USDC balance, pays x402, and the response carries a Base transaction link and a verified receipt. Open the link. Say: "That is KeeperHub's sponsored relayer; the agent never held a key."
3. Ask for a payout the wallet cannot cover. The dry run refuses. Balance before equals balance after. Say: "The cent never left. Lucid only finalizes the payment when my handler returns, and my handler only returns on a verified receipt."
4. Retry the same reference twice, once with the same HTTP key, once with a fresh one. Same run id, then same execution id with `replayed: true`. Say: "Two idempotency layers, one key derived from your reference. Retry storms cannot pay twice."
5. Show the ledger: N hundred verified executions since Sep 7, M on mainnet. Show the upstream PR links. Stop talking.

If the network dies during the panel: `npm run seller:mock` and the identical buyer commands, and say so out loud. Candor is rewarded here.

## 4. What we deliberately do not build

- No LLM in the execution path. Deterministic entrypoints only. The agent economy story is about agents *paying* for execution, not an LLM choosing amounts.
- No dashboard beyond Lucid's built-in service page and the free `execution` entrypoint. Screens do not move the rubric.
- No second protocol (Solana, MPP). One chain family done completely beats two done shallowly.
- No Task Market worker unless everything above is finished by Sep 12. It is mainnet-only escrow with an undocumented API; a half-working version would cost more credibility than it adds.

## 5. Manual help that unlocks the advantages (in priority order)

1. KeeperHub organisation `kh_` key + Base Sepolia USDC in the org wallet (A1, A3, A6, A8).
2. A throwaway buyer key with Base Sepolia USDC (A1).
3. About $5 of USDC on Base mainnet sent to the org wallet (A3). Optional but it is the single cheapest way to stand out.
4. Permission to open issues and PRs on `keeperhub/keeperhub` and `daydreamsai/lucid-agents` from your GitHub account, or you post the drafts (A4, A5).
5. A free Node hosting account (Render or Railway, GitHub-connected) for the public seller URL (A1). Vercel serverless is a poor fit for a long-lived agent with in-memory state.
6. Show up to the three office hours; ask the question and report the bug we prepare (A10).
