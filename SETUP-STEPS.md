# Your steps, in order (plain language)

Everything else is automated. Each step says what you do, what you get, and what to tell Claude afterwards.

## Step 1: KeeperHub account and API key (5 minutes)

1. Open https://app.keeperhub.com and sign up with your email. Solve the captcha, then click the link in the verification email.
2. After you are logged in, click your avatar (top right) → **API Keys** → the **Organisation** tab → **Create key**.
   - Name: `landed`
   - Scope: write (or leave unrestricted). The key must start with `kh_`.
   - Copy it now. It is shown once.
3. Open the file `.env` in the project folder (`Hackathons\Dorahacks\.env`) with Notepad. Replace `kh_...` after `KEEPERHUB_API_KEY=` with your key. Save.
4. Tell Claude: "key added". Claude runs `npm run smoke -- --simulate-only`, which prints your **org wallet address** (needed for step 2).

What you get: KeeperHub can execute for us. Nothing has moved yet.

## Step 2: Put test money in the KeeperHub wallet (5 minutes)

1. Open https://faucet.circle.com.
2. Network: **Base Sepolia**. Token: **USDC**. Paste the org wallet address from step 1. Click "Get tokens". You get free test USDC (about 10 per day).
3. Optional but recommended, in case gas sponsorship does not apply: get a little Base Sepolia ETH into the same address. Any one of these works:
   - https://portal.cdp.coinbase.com/products/faucet (needs a free Coinbase Developer account)
   - https://www.alchemy.com/faucets/base-sepolia (needs a free Alchemy account)
4. Tell Claude: "org wallet funded". Claude runs `npm run smoke`, which makes the first real transaction and prints the proof link.

## Step 3: Put test money in the buyer wallet (2 minutes)

Claude already generated a throwaway buyer wallet and saved it in `.env`. Its address is printed by `npm run buyer:wallet`.

1. Same faucet, same settings (Base Sepolia, USDC), paste the **buyer address**.
2. Tell Claude: "buyer funded". Claude runs the real seller and the real buyer: the buyer pays one cent with x402 and gets a Base Sepolia transaction back, then the failing case that must not charge.

## Step 4: Public seller URL (10 minutes, needs a free Render account)

1. Open https://render.com and sign up with your GitHub account (the same one that owns the `landed` repo).
2. Dashboard → **New** → **Blueprint** → choose the repo `landed` → Render reads `render.yaml`.
3. It asks for the secret values: paste `KEEPERHUB_API_KEY`, set `PAYMENTS_RECEIVABLE_ADDRESS` to your org wallet address, and set `AGENT_ORIGIN` to the URL Render shows (like `https://landed-payout-agent.onrender.com`). Click **Apply**.
4. When it says "Live", send Claude the URL. Claude verifies the agent card and updates the docs so judges can pay it themselves.

Note: the free plan sleeps after 15 minutes idle and takes about a minute to wake. Before the finalist call, open the URL once to warm it up.

## Step 5: Optional, about $5 on Base mainnet (the cheapest way to stand out)

If you have any exchange account (Binance, Coinbase, etc.): buy about $5 of USDC and withdraw it to the **org wallet address**, choosing network **Base**. Gas is sponsored by KeeperHub, so no ETH is needed. Tell Claude "mainnet funded" and Claude runs a few mainnet payouts for the ledger. Skip this if you would rather not spend real money.

## Step 6: Office hours (three times, 12:00 CEST = 15:30 IST)

Dates are announced in the KeeperHub Discord builder channel. Join one, say you are building the Lucid Agents integration, and ask the question Claude prepares in `PITCH.md`. Judges remember faces.

## Already done for you

- Public repo: https://github.com/0xsaroj001/landed (pushed, CI runs on every push).
- Forks for the upstream pull requests: https://github.com/0xsaroj001/keeperhub and https://github.com/0xsaroj001/lucid-agents.
- Bounty issue posted: https://github.com/KeeperHub/keeperhub/issues/2329. Upstream PR to Lucid Agents opened: https://github.com/daydreamsai/lucid-agents/pull/1717. Nothing to do until they reply; Claude watches both.
- Bun installed for the Lucid upstream work.
- Buyer wallet generated (address in the chat and via `npm run buyer:wallet`).
