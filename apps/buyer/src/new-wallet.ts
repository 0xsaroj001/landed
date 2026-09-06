/**
 * Generate a throwaway buyer wallet for Base Sepolia and store it in .env as BUYER_PRIVATE_KEY.
 * Prints the address to fund at https://faucet.circle.com (network: Base Sepolia, token: USDC).
 * Never use this key for real funds.
 *
 *   npm run buyer:wallet
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = resolve(".env");
const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const existing = /^BUYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m.exec(current);

if (existing) {
  const account = privateKeyToAccount(existing[1] as `0x${string}`);
  console.log(`buyer wallet already in .env`);
  console.log(`address   ${account.address}`);
} else {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const line = `BUYER_PRIVATE_KEY=${privateKey}`;
  const next = /^BUYER_PRIVATE_KEY=.*$/m.test(current)
    ? current.replace(/^BUYER_PRIVATE_KEY=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, next);
  console.log(`buyer wallet created and saved to .env (throwaway; testnet only)`);
  console.log(`address   ${account.address}`);
}
console.log(`fund it   https://faucet.circle.com  → network Base Sepolia → token USDC → paste the address`);
