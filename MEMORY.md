# Memory — decisions made and lessons learned

## Decisions
- **2026-09-05 — Integrate with Lucid Agents (Daydreams), not Wayfinder or Almanak.** Wayfinder's Paths SDK signs through a gated `wk_` API or raw local keys and its adapters are mainnet DeFi; Almanak is already a KeeperHub partner with a closed gateway. Lucid has a clean extension kernel, is TypeScript, and the whole flow (x402 + KeeperHub) runs on Base Sepolia with faucet money.
- **2026-09-05 — Seller executes through KeeperHub REST direct execution, not MCP.** No LLM in the execution path; deterministic and typed. MCP only for an optional buyer-side Claude demo.
- **2026-09-05 — One idempotency key across Lucid and KeeperHub.** The caller's `reference` is the `taskId`; KeeperHub's key is `sha256(reference|chainId|recipient|amount|token)` per its documented rule. The buyer's HTTP `Idempotency-Key` is `sha256("landed:" + entrypoint + ":" + reference)` because Lucid requires 20–256 characters.
- **2026-09-05 — Payment settles only on a verified receipt.** Handlers throw on anything but `receipts[].verified && receiptStatus === "success"`, so Lucid's `finalize()` never settles for an unlanded transaction. This is the product.
- **2026-09-05 — npm workspaces + Node 24.** Bun and pnpm are not installed on this machine; Lucid runtime packages support Node ≥ 20.9.
- **2026-09-05 — Project name: Landed.** "Pay when it lands."
- **2026-09-05 — Bounty: propose a Lucid Agents connector plugin for KeeperHub (workflows as buyers of agent services), issue-first.** Draft in `bounty/`. The two accepted, unclaimed-looking issues (#2110, #2289) turned out to be taken. Fallback if the issue stalls: a server-side `taskId` idempotency-key helper for direct execution (DX improvement), or docs.

## Lessons
- GitHub REST API rate limit (5,000/h) burns fast when reading many files via `gh api`; shallow-clone reference repos (`git -c core.longpaths=true clone --depth 1`) into the scratchpad and grep locally. Windows needs `core.longpaths` for these monorepos.
- DoraHacks pages are JS-rendered; `WebFetch` returns 405. Use the in-app browser and `get_page_text`. Tab URLs: `/detail`, `/buidl`, `/tracks`; winners/announcements need login.
- KeeperHub docs are all Markdown in the repo (`docs/`) and via `.md` suffix on docs.keeperhub.com; `curl` the `.md` for exact text.
- The organizers publish what they reward: read their previous hackathon wrap-up before designing (they punished shallow wrappers and passive webhooks; rewarded tests, live deployment, connectors, mainnet proof).
- Lucid: pricing an entrypoint without `payments()` installed answers 503 `payment_configuration_error`. Keep unit tests on free entrypoints; exercise x402 live.
- Lucid: `z.record(...)` inside an entrypoint output schema crashes the agent-card JSON-schema conversion (zod 4.5.4 in Lucid's tree, `TypeError: reading 'push'`) even though `z.toJSONSchema` works standalone. Use `z.looseObject({})`.
- Lucid: thrown handler errors become HTTP 500 `{ error: { code: "internal_error", message } }`; only `message` survives, so put the Landed code in the message.
- Lucid: the HTTP `Idempotency-Key` must be 20–256 characters and replays the stored response verbatim (handler does not re-run). To show KeeperHub's own replay, send a fresh HTTP key with the same reference.
- Bash heredocs over ~8 KB failed in this harness; use the Write tool for long files.
- Lucid upstream conventions (for the `@lucid-agents/keeperhub` PR): Bun 1.3 monorepo (`bun install`, `bun test`, tests in `src/__tests__`), per-package `tsup.config.ts` via `definePackageConfig` from `../tsup.config.base`, `package.json` with `workspace:*` deps, `catalog:` versions, `lucidAgents.runtime: "portable"`, exports from `./dist`, changesets for releases (`bunx changeset`), Prettier + ESLint configs from `@lucid-agents/*-config`. Bun is not installed on this machine; either install it (`npm i -g bun`) or rely on their CI for the PR.
