# Memory — decisions made and lessons learned

## Decisions
- **2026-09-05 — Integrate with Lucid Agents (Daydreams), not Wayfinder or Almanak.** Wayfinder's Paths SDK signs through a gated `wk_` API or raw local keys and its adapters are mainnet DeFi; Almanak is already a KeeperHub partner with a closed gateway. Lucid has a clean extension kernel, is TypeScript, and the whole flow (x402 + KeeperHub) runs on Base Sepolia with faucet money.
- **2026-09-05 — Seller executes through KeeperHub REST direct execution, not MCP.** No LLM in the execution path; deterministic and typed. MCP only for an optional buyer-side Claude demo.
- **2026-09-05 — One idempotency key across Lucid and KeeperHub.** Derive KeeperHub's key from Lucid's invoke idempotency claim as `taskId`, joined with canonical effect fields, SHA-256 per KeeperHub's documented rule.
- **2026-09-05 — Payment settles only on verified receipt.** Handler throws on anything but `receipts[].verified && receiptStatus === "success"`, so Lucid's `finalize()` never settles for an unlanded transaction. This is the product.
- **2026-09-05 — npm workspaces + Node 24.** Bun and pnpm are not installed on this machine; Lucid runtime packages support Node ≥ 20.9.
- **2026-09-05 — Project name: Landed.** "Pay when it lands."

## Lessons
- GitHub REST API rate limit (5,000/h) burns fast when reading many files via `gh api`; shallow-clone reference repos into the scratchpad instead and grep locally.
- DoraHacks pages are JS-rendered; `WebFetch` returns 405. Use the in-app browser and `get_page_text`. Tab URLs: `/detail`, `/buidl`, `/tracks`; winners/announcements need login.
- KeeperHub docs are all available as Markdown in the repo (`docs/`) and via `.md` suffix on docs.keeperhub.com.
- The organizers publish what they reward: read their previous hackathon wrap-up before designing (they punished shallow wrappers and passive webhooks; rewarded tests, live deployment, connectors, mainnet proof).
