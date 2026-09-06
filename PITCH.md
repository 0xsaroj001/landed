# Pitch, panel script, and office-hours material

## One line
Landed makes KeeperHub the execution layer inside Lucid Agents: an agent sells onchain payouts as priced entrypoints, and the buyer's cent settles only when KeeperHub's receipt verifies.

## Thirty seconds
Agent payment rails (x402, MPP) settle on response. Onchain work settles on receipts. Nobody had wired the two together, because you need an execution layer that gives you a verifiable receipt to settle against. KeeperHub gives us that, so we built the Lucid extension that maps Lucid's authorize → admit → invoke → finalize lifecycle onto KeeperHub's simulate → execute → verify lifecycle, with one idempotency key across both. The result: a Lucid agent that can sell one-off payouts, standing orders (KeeperHub workflows), and a live stage stream, and that cannot charge a buyer for a transaction that did not land.

## Four-minute panel script (run, do not present)
1. Browser: the live agent card. Point at `urn:landed:keeperhub-execution:v1` and the price on `payout`.
2. Terminal: `npm run buyer -- payout --to … --amount 0.01 --reference panel-1`. USDC before, x402 pays, response carries the Base transaction link and `receipt.verified: true`. Open the link. "That is KeeperHub's sponsored relayer. The agent never held a key."
3. `--amount 500 --reference panel-2`. Dry run refuses. Balance before equals balance after. "The cent never left. Lucid finalizes only when my handler returns; my handler returns only on a verified receipt."
4. `--reference panel-1` again, then with `--fresh-key`. Same run id, then `replayed: true` with the same execution id. "Two idempotency layers, one key derived from your reference. Retry storms cannot pay twice."
5. `npm run buyer -- subscribe … --cron "0 9 * * 1" --run-now`. "That is a KeeperHub workflow the agent authored. Their scheduler runs it without me in the loop."
6. Ledger summary and the upstream PR links. Stop.

If the network dies: `npm run seller:mock`, the same commands, and say so.

## Likely questions and the honest answers
- "What if KeeperHub says unconfirmed for ten minutes?" We fail closed after the wait budget, the buyer is not charged, and the reference is the retry handle. The restart test in the repo shows a fresh process recovering the same execution through the shared key.
- "Why not MCP for the seller?" No LLM belongs in the execution path of a payout. The buyer side can be an LLM with the KeeperHub wallet skill; the seller is deterministic.
- "Why Lucid and not Wayfinder?" Wayfinder signs through a gated API with mainnet-only adapters; Lucid has a clean extension kernel and the whole flow runs on testnet. Both are on your list; we picked the one we could do completely.
- "Is Lucid actually live?" The old Daydreams framework is deprecated; Lucid Agents is their current commerce runtime, on npm, with Task Market and Dreams Router built on it. We integrated with the live one.
- "What still breaks?" See GAPS.md; we keep it current on purpose.

## Office-hours question (ask one, listen, report the answer in Discord)
"We author a Schedule → `web3/transfer-token` workflow from an agent through `POST /api/workflows/create` and pass `tokenConfig` as a bare address string as the schema reference shows. Is that the form you want agents to use, or should we send the `{mode: "custom", customToken: {...}}` JSON so decimals resolve without an RPC lookup at run time?"

Backup question: "For a fresh organisation on Base Sepolia, is sponsored routing on by default for direct execution, or does it need a setting before the first run?"

## Bug report candidates (file only what reproduces)
- To be filled from the first live runs. Anything where the live response shape differs from `docs/api/*.md` is worth a report with a curl reproduction; they have said they reward these.
