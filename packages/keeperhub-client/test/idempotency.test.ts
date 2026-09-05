import { describe, expect, it } from "vitest";
import {
  canonicalAmount,
  canonicalChainId,
  canonicalTransferBody,
  contractCallKeyMaterial,
  deriveContractCallKey,
  deriveTransferKey,
  encodeTaskId,
  normalizeAddress,
  sha256Hex,
  transferKeyMaterial,
} from "../src/idempotency.ts";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

describe("canonicalAmount (KeeperHub 'Choosing a stable key' rules)", () => {
  it.each([
    ["0.0010", "0.001"],
    ["1.000", "1"],
    ["1.", "1"],
    [".5", "0.5"],
    ["01.5", "1.5"],
    ["007", "7"],
    ["0", "0"],
    ["0.0", "0"],
    ["0.000", "0"],
    [" 0.10 ", "0.1"],
    ["100", "100"],
    ["10.05", "10.05"],
  ])("%s -> %s", (input, expected) => {
    expect(canonicalAmount(input)).toBe(expected);
  });

  it.each([["+1"], ["-1"], ["1e3"], ["1,5"], [""], ["."], ["abc"], ["0x10"]])("rejects %s", (input) => {
    expect(() => canonicalAmount(input)).toThrow();
  });

  it("makes '0.1' and '0.10' agree, unlike a float", () => {
    expect(canonicalAmount("0.1")).toBe(canonicalAmount("0.10"));
  });
});

describe("canonicalChainId", () => {
  it.each([
    [8453, "8453"],
    ["8453", "8453"],
    ["0084532", "84532"],
    ["base", "8453"],
    ["Base-Sepolia", "84532"],
    ["sepolia", "11155111"],
    [" 84532 ", "84532"],
  ])("%s -> %s", (input, expected) => {
    expect(canonicalChainId(input)).toBe(expected);
  });

  it("refuses unknown names instead of guessing", () => {
    expect(() => canonicalChainId("mars")).toThrow(/unknown chain/);
    expect(() => canonicalChainId(-1)).toThrow();
    expect(() => canonicalChainId(1.5)).toThrow();
  });
});

describe("encodeTaskId", () => {
  it("escapes the separator and percent so fields cannot shift", () => {
    expect(encodeTaskId("8453|0xabc")).toBe("8453%7C0xabc");
    expect(encodeTaskId("50%")).toBe("50%25");
    expect(encodeTaskId("  inv-42  ")).toBe("inv-42");
  });

  it("does not case-fold opaque ids", () => {
    expect(encodeTaskId("Inv-42")).toBe("Inv-42");
  });
});

describe("normalizeAddress", () => {
  it("lowercases and validates", () => {
    expect(normalizeAddress(RECIPIENT)).toBe(RECIPIENT.toLowerCase());
    expect(() => normalizeAddress("0x123")).toThrow(/invalid EVM address/);
    expect(() => normalizeAddress("742d35Cc6634C0532925a3b844Bc454e4438f44e")).toThrow();
  });
});

describe("transfer idempotency key", () => {
  const input = {
    taskId: "invoice-2026-09-06-001",
    chainId: "base-sepolia",
    recipientAddress: RECIPIENT,
    amount: "0.010",
    tokenAddress: USDC_BASE_SEPOLIA,
  };

  it("joins canonical parts with a bare vertical bar", () => {
    expect(transferKeyMaterial(input)).toBe(
      `invoice-2026-09-06-001|84532|${RECIPIENT.toLowerCase()}|0.01|${USDC_BASE_SEPOLIA.toLowerCase()}`,
    );
  });

  it("keeps separator positions fixed when the token is omitted", () => {
    const { tokenAddress: _omit, ...native } = input;
    expect(transferKeyMaterial(native)).toBe(`invoice-2026-09-06-001|84532|${RECIPIENT.toLowerCase()}|0.01|`);
  });

  it("is a lowercase sha256 hex of the material and is stable across spellings", () => {
    const key = deriveTransferKey(input);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).toBe(sha256Hex(transferKeyMaterial(input)));
    expect(
      deriveTransferKey({ ...input, chainId: 84532, amount: "0.01", recipientAddress: RECIPIENT.toUpperCase().replace("0X", "0x") }),
    ).toBe(key);
  });

  it("changes when the work changes", () => {
    const key = deriveTransferKey(input);
    expect(deriveTransferKey({ ...input, taskId: "invoice-2026-09-06-002" })).not.toBe(key);
    expect(deriveTransferKey({ ...input, amount: "0.02" })).not.toBe(key);
    expect(deriveTransferKey({ ...input, chainId: "base" })).not.toBe(key);
  });
});

describe("contract call idempotency key", () => {
  it("covers contract, function, args and value", () => {
    const material = contractCallKeyMaterial({
      taskId: "job-1",
      chainId: 84532,
      contractAddress: USDC_BASE_SEPOLIA,
      functionName: " transfer ",
      functionArgs: '["0xabc", "1000"]',
      value: "0.0",
    });
    expect(material).toBe(`job-1|84532|${USDC_BASE_SEPOLIA.toLowerCase()}|transfer|["0xabc", "1000"]|0`);
    expect(deriveContractCallKey({ taskId: "job-1", chainId: 84532, contractAddress: USDC_BASE_SEPOLIA, functionName: "transfer" })).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});

describe("canonicalTransferBody", () => {
  it("sends one spelling per value so KeeperHub's body hash matches on retry", () => {
    const a = canonicalTransferBody({ chainId: "base-sepolia", recipientAddress: RECIPIENT, amount: "0.010", tokenAddress: USDC_BASE_SEPOLIA });
    const b = canonicalTransferBody({ chainId: 84532, recipientAddress: RECIPIENT.toLowerCase(), amount: "0.01", tokenAddress: USDC_BASE_SEPOLIA.toLowerCase() });
    expect(a).toEqual(b);
    expect(a).toEqual({
      chainId: "84532",
      recipientAddress: RECIPIENT.toLowerCase(),
      amount: "0.01",
      tokenAddress: USDC_BASE_SEPOLIA.toLowerCase(),
    });
    expect("tokenConfig" in a).toBe(false);
  });
});
