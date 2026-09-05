# Bounty issue draft (to post on github.com/keeperhub/keeperhub → New issue → feature)

Status: DRAFT, not posted. KeeperHub's ISSUES.md requires an issue with reason / scope / plan and the `accepted` label before any PR. Post this as-is or edited, then wait for `accepted`. Target: issue posted Sep 6–7, `accepted` by Sep 9, PR by Sep 12, separate BUIDL on DoraHacks.

---

**Title:** feat(plugins): add a Lucid Agents connector so a workflow can discover and call an agent entrypoint (free or x402-priced)

### Before filing

- [x] I searched open and closed issues for this proposal. (#2310 "Agent Gateway plugin" is about payment signing and credit checks for KeeperHub's own paid workflows; this is the other direction: a workflow *buying* an external agent's service. #2309 "EVM Chain integration plugin" is unrelated.)
- [x] I checked the docs and the current behaviour on `staging`.
- [x] This is one change, not several.

### Reason: what you cannot do today

A workflow cannot call an external AI agent as a step. The agent economy KeeperHub integrates with (ElizaOS, AgentKit, OpenClaw, Hermes, and now Daydreams' Lucid Agents runtime) publishes services as typed HTTP entrypoints behind an agent card (`/.well-known/agent-card.json`, A2A shape, ERC-8004 identity), often priced with x402 in USDC. Today the only way to consume one from a workflow is the generic HTTP Request node, which cannot read the card, cannot validate the typed input/output, and cannot answer a `402 Payment Required` challenge, so every priced agent is unreachable and every free one needs hand-built request plumbing.

Concretely, while integrating KeeperHub as the execution layer inside a Lucid agent for the Agent Economy hackathon (a Lucid entrypoint that moves USDC through `/api/execute/transfer` and settles the buyer's x402 payment only after `receipts[].verified`), the mirror case came up immediately: a KeeperHub workflow that monitors an Aave position wants to ask a Lucid risk agent "should I repay?" for 0.01 USDC before it writes. There is no node for that.

### Reason: what the workaround costs

HTTP Request node plus a Code node: the Code node must fetch the card, pick the entrypoint, build the body, and it still cannot pay, because there is no signer available to a Code node and there should not be. So the workaround only covers free entrypoints, and it re-implements the agent-card contract per workflow with no schema validation and no receipt of what was paid. Priced agents, which is most of the useful ones, are simply out of reach.

### Scope: what this touches, and what it does not

Touches: a new integration plugin `plugins/lucid-agents/` following `plugins/_template` and `plugins/AGENTS.md` (index.ts, credentials.ts, icon.tsx, test.ts, steps/), an entry in `plugin-allowlist.json`, and docs under `docs/plugins/`.

Does not touch: the execution engine, signing or the delegate for onchain writes, pricing or plan limits, the database schema, any existing response shape, and the marketplace/x402 *server* side (`lib/payments`).

Dependencies: none new. `@x402/core` and `@x402/evm` are already in `package.json`; the client-side payment retry is a short loop over `x402Client` + `ExactEvmScheme`, so `@x402/fetch` is not needed.

### Plan: what you propose

Plugin `lucid-agents`, `egress: "user-destination"`, `requiresCredentials: false` for free entrypoints.

Actions:

1. `discover-agent`: input `agentUrl`; fetches `/.well-known/agent-card.json` (via `safeFetch` with SSRF protection), returns `name`, `version`, `entrypoints[]` with `key`, `description`, `pricing`, `network`, `inputSchema`, and the `capabilities.extensions[]` descriptors (so a workflow can branch on what the agent advertises).
2. `invoke-entrypoint`: input `agentUrl`, `entrypoint`, `input` (JSON template), optional `idempotencyKey` (defaults to a sha256 of `executionId|entrypoint|input`, 64 chars, which satisfies Lucid's 20–256 character requirement), `maxPriceUsd` (default `0`, meaning free only). Calls `POST {agentUrl}/entrypoints/{key}/invoke`. On `402`, if `maxPriceUsd` covers the challenge and a payer credential is configured, signs the x402 `exact` EVM payment and retries once; otherwise fails with a clear `payment_required` error naming the price. Output: `output`, `usage`, `settled` (boolean), `paymentResponse` (the `PAYMENT-RESPONSE` header, decoded), `httpStatus`.

Credentials (optional connection): `LUCID_PAYER_PRIVATE_KEY` (password field) and `LUCID_PAYER_NETWORK` (default `eip155:8453`, Base USDC; `eip155:84532` for Base Sepolia). v1 deliberately uses a dedicated, low-balance payer key held in the encrypted integration store, the same way other connectors hold API keys, with `maxPriceUsd` enforced per call in the step. Signing x402 with the organization's Turnkey wallet is the better end state and I would file it as a separate issue once this lands, because it touches signing policy.

Tests: unit tests for card parsing, entrypoint selection, 402 challenge parsing, price cap enforcement, idempotency key derivation, and a mocked Lucid server exercising free, priced-within-cap, priced-over-cap, and non-2xx paths. `pnpm discover-plugins` regenerates the registry.

Docs: `docs/plugins/lucid-agents.md` with a worked example: Aave health-factor check → `invoke-entrypoint` (0.01 USDC) → Condition → repay.

### Plan: alternatives you considered

- Generic "x402 HTTP Request" node without agent-card awareness. Simpler, but it loses discovery and typed schemas, which are the part that makes agents composable inside a builder; and the card is where the price and network come from.
- Putting this in the HTTP Request node behind a "pay" toggle. Rejected: mixing a signer into the general-purpose node widens the blast radius of a node every workflow already uses.
- Waiting for #2310. That issue is about KeeperHub charging for its own workflows and checking credits; it does not give a workflow a way to pay someone else.

### Scope: compatibility

- [ ] Changes an existing response shape, status code, CLI flag, or default.
- [ ] Adds, removes, or upgrades a dependency.
- [ ] Changes database schema or requires a migration.
- [x] Touches authentication, permissions, validation, or spend limits. (New optional credential type and a per-call price cap inside the plugin; nothing outside it.)
- [ ] Changes pricing, plan limits, or anything a user is charged.
