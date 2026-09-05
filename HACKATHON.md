# KeeperHub — The Agent Economy Hackathon (DoraHacks)

Everything known about the event, collected 2026-09-05. Re-verify dates on the page before submitting.

- Page: https://dorahacks.io/hackathon/agent-economy/detail
- Organizer: KeeperHub (their 2nd DoraHacks event; the 1st was "Agents Onchain", Jul–Aug 2026: 471–512 registered, 190 submitted, every repo reviewed)
- Prize pool: **$5,000**, paid in stablecoins after winners confirm details
- Format: fully online, worldwide, solo or team, 18+. OFAC-sanctioned residence/location excluded. **Every submission must incorporate KeeperHub.**
- Registered hackers on 2026-09-05: 123 (previous event ended at 512). Expect roughly 60–120 submissions; the brief is tighter than last time.

## Timeline (IST = UTC+5:30, CEST = UTC+2)

| Milestone | CEST | UTC | IST |
|---|---|---|---|
| Registration | open now, until the deadline | | |
| Build phase / submissions open | Sep 6, 12:00 | 10:00 | Sep 6, 15:30 |
| Office hours (3x, dates on Discord) | 12:00 | 10:00 | 15:30 |
| **Submission deadline (hard)** | **Sep 18, 12:00** | **10:00** | **Sep 18, 15:30** |
| Judging (repo-level review) | Sep 18–25 | | |
| Live finalist panel (top 10, two rooms, present the working build, Q&A) | inside the judging window, by email invite | | |
| Winners announced | Sep 24/25 | | |

## Tracks and prizes

**Main track — Best Integration into a Live Project ($4,000, one ranking):** 1st $2,000, 2nd $1,200, 3rd $800.
Take a *live* project (running, with users, a deployed product or an active protocol) and make KeeperHub the execution layer inside or alongside it. Named examples (not a shortlist): **Wayfinder, Daydreams, Almanak**. Quote: "We would rather see one working integration into a project like that than another standalone demo." Show KeeperHub executing value movement that the other project triggers, consumes, or benefits from, with proof.

**Bounty — Best KeeperHub Feature ($1,000: 2 × $500):** ship a feature as a PR to https://github.com/keeperhub/keeperhub (new chain, node, trigger/action, connector, DX improvement). Judged on mergeability and whether they can build on it. Stacks with the main track, but needs a **separate BUIDL** (a BUIDL can only be applied to one track).

## Judging rubric (main track)

1. **Integration depth** — a real, named project on the other side; integration specific to it (not a generic wrapper)
2. **Execution through KeeperHub** — did value actually move through KeeperHub, and can they see it
3. **Reliability and observability** — survives conditions that are not the happy path
4. **Usefulness and originality** — solves something real for users of the integrated project
5. **Developer experience and code quality** — could another team pick this up

Bounty rubric: mergeability, value to the platform, code quality and tests, scope and completeness.

## Submission requirements

1. Source code link (GitHub/GitLab/Bitbucket), public repo
2. Short demo video showing the integration working
3. **A link to a transaction executed through KeeperHub**

Incomplete submissions cannot be judged. Form questions to prepare answers for:

- Which project did you integrate with, and what does the integration do?
- Which KeeperHub surfaces did you use (MCP, CLI, x402, MPP, agent-authored workflows, audit trail)?
- Testnet or mainnet?
- What still breaks or is unfinished? ("A candid answer here has never hurt a submission.")
- Reachable contact: email plus an X or Discord handle

## What KeeperHub rewarded last time

From their ETHGlobal OpenAgents wrap-up (May 2026): winners were (1) Tradewise Agentlab: production mindset, 125 tests, live deployment, reproducible bug reports; (2) Keeper-Gate: framework-agnostic SDK connector across LangChain, ElizaOS, OpenClaw; (3) ZW.ARM: three-agent system, 450 confirmed transactions on Base mainnet with real USDC.
Weak submissions: surface integrations with minimal execution (30), passive webhook patterns (25), bypassing native surfaces for raw HTTP (17).
Agents Onchain (Aug 2026) finalists were mostly guardrail and liquidation-protection agents (Talos, Intent Firewall, Ripcord, Sentinel, Aegis, noyeet, RunProof). Winners were announced around Aug 20; the DoraHacks winners tab needs a login, so the list was not scraped.

KeeperHub already lists integrations with ElizaOS, Coinbase AgentKit, OpenClaw and Hermes Agent, and names LangChain, CrewAI and Almanak as partners. **Daydreams (Lucid Agents) and Wayfinder are the named gaps.**

## KeeperHub cheat sheet

- Docs https://docs.keeperhub.com (every page also served as `.md`), MCP guide https://docs.keeperhub.com/agent/mcp-server, repo https://github.com/keeperhub/keeperhub (TypeScript, Next.js 16, Drizzle, Turnkey wallets), Discord https://discord.gg/keeperhub, link tree https://keeperhub.com/links
- Surfaces: hosted MCP `https://app.keeperhub.com/mcp` (40+ tools), REST `https://app.keeperhub.com/api`, CLI `kh`, x402/MPP paid marketplace workflows, agentic wallet `@keeperhub/wallet`, ERC-8004 agent card
- Keys: org key `kh_` (REST + MCP; avatar → API Keys → Organisation tab; shown once); user key `wfb_` is webhook-only. Probe: `GET /api/keys` → 200
- Wallet: org Turnkey wallet auto-provisioned on signup; address from `GET /api/user` (`walletAddress`)
- Direct execution: `POST /api/execute/transfer`, `POST /api/execute/contract-call`, `POST /api/execute/check-and-execute`, `GET /api/execute/{executionId}/status` (honor `X-Poll-Interval-Hint`; `receipts[].verified` and `receiptStatus` are the proof). `simulate: true` (JSON boolean) is a dry run. `Idempotency-Key` header: replay window 24h; `409 idempotency_in_progress` (retry same key); `409 idempotency_conflict` (body drifted: canonicalize, keep key); replays carry `idempotentReplay: true`
- Caps: default daily native value cap 0.02 ETH per EVM chain; stablecoin transfers 100 USD per transaction; direct execution 60 req/min per key; MCP 120/min per org
- Testnets (gas sponsored; testnet gas not metered): Ethereum Sepolia `11155111` (USDC `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`), **Base Sepolia `84532` (USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`)**. Faucets: https://faucet.circle.com (USDC), https://portal.cdp.coinbase.com/products/faucet (Base Sepolia ETH), https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- Mainnets: Ethereum 1, Base 8453 (USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), Arbitrum 42161, Optimism 10, Polygon 137; Solana mainnet/devnet (no simulation)
- Machine-readable: `https://app.keeperhub.com/openapi.json`, `/.well-known/mcp.json`, `/.well-known/agent-card.json`, `/.well-known/x402`, `https://docs.keeperhub.com/llms.txt`
- Contribution policy: **open an issue first** (reason / scope / plan), wait for the `accepted` label, then a PR referencing it (`fix: #1234 ...`, `Closes #1234`). Typos and docs skip this. See ISSUES.md and CONTRIBUTING.md in the repo.

## Named live projects (research summary)

- **Daydreams**: https://daydreams.systems. The old `@daydreamsai/core` framework is deprecated ("no longer the core focus"). Live products: **Lucid Agents** (TypeScript commerce runtime: typed entrypoints, x402/MPP/SIWX payments, ERC-8004 identity, A2A tasks; repo https://github.com/daydreamsai/lucid-agents, npm `@lucid-agents/*`, docs https://docs.daydreams.systems), **Task Market** (https://taskmarket.dev, USDC escrow on Base mainnet, 32.2K registered agents), Dreams Router. Lucid docs ship a coding-agent skill.
- **Wayfinder**: https://wayfinder.ai. Open-source Python **Paths SDK** https://github.com/WayfinderFoundation/wayfinder-paths-sdk (DeFi strategies, adapters, local MCP server). Signing goes through local private keys or Wayfinder's API (`wk_` key, Privy server wallets); adapters are mainnet DeFi. No public key signup found.
- **Almanak**: https://almanak.co, Python SDK https://github.com/almanak-co/sdk (intent-based strategies, gateway-only architecture holding secrets, Safe + Zodiac Roles execution). Already listed as a KeeperHub partner.

## User to-dos (accounts, credentials, faucets: cannot be done by Claude)

1. Register as a hacker on the DoraHacks page (log in → "Register as Hacker"). Do this today.
2. Create a KeeperHub account at https://app.keeperhub.com (email + captcha) → verify email → org wallet is provisioned → avatar → API Keys → **Organisation** tab → create a `kh_` key with write scope → put it in `.env` as `KEEPERHUB_API_KEY` (never commit).
3. Copy the org wallet address (`GET /api/user`, or the wallet page) and fund it on **Base Sepolia**: USDC from https://faucet.circle.com (pick Base Sepolia), plus a little ETH from a Base Sepolia faucet as a fallback in case sponsorship does not apply.
4. Create a throwaway buyer wallet (the repo has a script) and fund it with Base Sepolia USDC from the same faucet.
5. Join Discord https://discord.gg/keeperhub → builder channel; note the three office-hour dates.
6. Create the public GitHub repo (name: `landed`) and push; keep it public from day one so the judges' repo-level review sees the history.
