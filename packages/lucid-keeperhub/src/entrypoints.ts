import type { ChainInput } from "@landed/keeperhub-client";
import type { EntrypointDef } from "@lucid-agents/types/core";
import { z } from "zod";
import { LandedError } from "./errors.ts";
import type { KeeperHubRuntime, LandedProof } from "./extension.ts";

export const referenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9._:/-]+$/, "reference may contain letters, digits and . _ : / -")
  .describe("Your stable id for this payment (invoice, task, period). Retrying with the same reference never pays twice.");

export const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "EVM address").describe("0x-prefixed EVM address");

export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "decimal string in token units, e.g. 0.01")
  .describe("Amount in human-readable token units");

const stageEntrySchema = z.object({
  stage: z.string(),
  at: z.string(),
  detail: z.looseObject({}).optional(),
});

export const receiptSchema = z.object({
  hash: z.string(),
  chainId: z.number().optional(),
  verified: z.boolean(),
  receiptStatus: z.string(),
  blockNumber: z.number().optional(),
  gasUsed: z.string().optional(),
  verifiedAt: z.string().optional(),
});

export const landedProofSchema = z.object({
  reference: z.string(),
  chainId: z.string(),
  recipientAddress: z.string(),
  amount: z.string(),
  tokenAddress: z.string().optional(),
  idempotencyKey: z.string(),
  executionId: z.string(),
  transactionHash: z.string(),
  transactionLink: z.string().optional(),
  sponsored: z.boolean(),
  replayed: z.boolean(),
  receipt: receiptSchema,
  timeline: z.array(stageEntrySchema),
});

export type LandedProofOutput = z.infer<typeof landedProofSchema>;

export interface TransferEntrypointOptions {
  /** Default "payout". */
  key?: string | undefined;
  description?: string | undefined;
  /** USD decimal string, e.g. "0.01". Omit for a free entrypoint. */
  price?: string | undefined;
  chainId: ChainInput;
  /** Fixed token. Omit for the native asset. */
  tokenAddress?: string | undefined;
  /** Fixed recipient; when set the caller cannot choose one. */
  recipientAddress?: string | undefined;
  /** Fixed amount; when set the caller cannot choose one. */
  amount?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

const transferInputSchema = z.object({
  reference: referenceSchema,
  recipientAddress: addressSchema.optional(),
  amount: amountSchema.optional(),
});

export type TransferEntrypointInput = z.infer<typeof transferInputSchema>;

/**
 * A paid entrypoint that moves value through KeeperHub and returns proof.
 * The handler throws on anything short of a verified receipt, so Lucid never settles
 * the buyer's payment for a transaction that did not land.
 */
export function keeperhubTransferEntrypoint(
  options: TransferEntrypointOptions,
): EntrypointDef<typeof transferInputSchema, typeof landedProofSchema> {
  const key = options.key ?? "payout";
  const fixedRecipient = options.recipientAddress;
  const fixedAmount = options.amount;
  const description =
    options.description ??
    `Execute a ${options.tokenAddress ? "token" : "native"} transfer on chain ${String(options.chainId)} through KeeperHub and return the verified receipt. ` +
      (fixedRecipient ? `Recipient is fixed to ${fixedRecipient}. ` : "") +
      (fixedAmount ? `Amount is fixed to ${fixedAmount}. ` : "") +
      "Payment settles only after the transaction lands.";

  const def: EntrypointDef<typeof transferInputSchema, typeof landedProofSchema> = {
    key,
    description,
    input: transferInputSchema,
    output: landedProofSchema,
    metadata: {
      ...(options.metadata ?? {}),
      landed: {
        executionLayer: "keeperhub",
        chainId: String(options.chainId),
        tokenAddress: options.tokenAddress ?? null,
        fixedRecipient: fixedRecipient ?? null,
        fixedAmount: fixedAmount ?? null,
      },
    },
    handler: async (ctx) => {
      const keeperhub = runtimeOf(ctx.runtime);
      const recipientAddress = fixedRecipient ?? ctx.input.recipientAddress;
      const amount = fixedAmount ?? ctx.input.amount;
      if (!recipientAddress) {
        throw new LandedError("invalid_request", "recipientAddress is required", { reference: ctx.input.reference });
      }
      if (!amount) {
        throw new LandedError("invalid_request", "amount is required", { reference: ctx.input.reference });
      }
      const proof: LandedProof = await keeperhub.transfer({
        reference: ctx.input.reference,
        chainId: options.chainId,
        recipientAddress,
        amount,
        tokenAddress: options.tokenAddress,
        entrypoint: key,
      });
      return { output: toOutput(proof) };
    },
  };
  if (options.price !== undefined) {
    def.price = options.price;
  }
  return def;
}

const dryRunOutputSchema = z.object({
  reference: z.string(),
  allowed: z.boolean(),
  rule: z.string().optional(),
  reason: z.string().optional(),
  wouldRevert: z.boolean().optional(),
  code: z.string().optional(),
  failureKind: z.string().optional(),
  revertReason: z.string().optional(),
  gasEstimate: z.string().optional(),
  idempotencyKey: z.string(),
});

/** Free preflight: policy plus KeeperHub dry run. Lets a buyer check before paying. */
export function keeperhubDryRunEntrypoint(
  options: TransferEntrypointOptions,
): EntrypointDef<typeof transferInputSchema, typeof dryRunOutputSchema> {
  const key = options.key ?? "dry-run";
  return {
    key,
    description: `Check policy and simulate the transfer through KeeperHub without signing or broadcasting. Free.`,
    input: transferInputSchema,
    output: dryRunOutputSchema,
    handler: async (ctx) => {
      const keeperhub = runtimeOf(ctx.runtime);
      const recipientAddress = options.recipientAddress ?? ctx.input.recipientAddress;
      const amount = options.amount ?? ctx.input.amount;
      if (!recipientAddress || !amount) {
        throw new LandedError("invalid_request", "recipientAddress and amount are required", { reference: ctx.input.reference });
      }
      const result = await keeperhub.dryRun({
        reference: ctx.input.reference,
        chainId: options.chainId,
        recipientAddress,
        amount,
        tokenAddress: options.tokenAddress,
        entrypoint: key,
      });
      const output: z.infer<typeof dryRunOutputSchema> = {
        reference: result.reference,
        allowed: result.decision.allowed && result.simulation?.success === true && result.simulation.wouldRevert === false,
        idempotencyKey: result.idempotencyKey,
      };
      if (!result.decision.allowed) {
        output.rule = result.decision.rule;
        output.reason = result.decision.reason;
      }
      if (result.simulation) {
        output.wouldRevert = result.simulation.wouldRevert;
        if (result.simulation.code) output.code = result.simulation.code;
        if (result.simulation.failureKind) output.failureKind = result.simulation.failureKind;
        if (result.simulation.revertReason) output.revertReason = result.simulation.revertReason;
        if (result.simulation.gasEstimate) output.gasEstimate = result.simulation.gasEstimate;
      }
      return { output };
    },
  };
}

const statusInputSchema = z.object({ reference: referenceSchema });
const statusOutputSchema = z.object({
  found: z.boolean(),
  record: z.looseObject({}).optional(),
});

/** Free lookup of this agent's execution log by reference. */
export function keeperhubStatusEntrypoint(options: { key?: string | undefined } = {}): EntrypointDef<typeof statusInputSchema, typeof statusOutputSchema> {
  return {
    key: options.key ?? "execution",
    description: "Look up what happened to a reference: every stage, the KeeperHub execution id, the transaction hash and receipt. Free.",
    input: statusInputSchema,
    output: statusOutputSchema,
    handler: async (ctx) => {
      const keeperhub = runtimeOf(ctx.runtime);
      const record = keeperhub.log.get(ctx.input.reference);
      return { output: record ? { found: true, record: { ...record } } : { found: false } };
    },
  };
}

function runtimeOf(runtime: unknown): KeeperHubRuntime {
  const slice = (runtime as { keeperhub?: KeeperHubRuntime } | null)?.keeperhub;
  if (!slice) {
    throw new LandedError("not_installed", "keeperhub() extension is not installed on this agent; add .use(keeperhub({...})) before .use(http())");
  }
  return slice;
}

function toOutput(proof: LandedProof): LandedProofOutput {
  const output: LandedProofOutput = {
    reference: proof.reference,
    chainId: proof.chainId,
    recipientAddress: proof.recipientAddress,
    amount: proof.amount,
    idempotencyKey: proof.idempotencyKey,
    executionId: proof.executionId,
    transactionHash: proof.transactionHash,
    sponsored: proof.sponsored,
    replayed: proof.replayed,
    receipt: {
      hash: proof.receipt.hash,
      verified: proof.receipt.verified,
      receiptStatus: proof.receipt.receiptStatus,
      ...(proof.receipt.chainId !== undefined ? { chainId: proof.receipt.chainId } : {}),
      ...(proof.receipt.blockNumber !== undefined ? { blockNumber: proof.receipt.blockNumber } : {}),
      ...(proof.receipt.gasUsed !== undefined ? { gasUsed: proof.receipt.gasUsed } : {}),
      ...(proof.receipt.verifiedAt !== undefined ? { verifiedAt: proof.receipt.verifiedAt } : {}),
    },
    timeline: proof.timeline.map((s) => (s.detail ? { stage: s.stage, at: s.at, detail: s.detail } : { stage: s.stage, at: s.at })),
  };
  if (proof.tokenAddress !== undefined) {
    output.tokenAddress = proof.tokenAddress;
  }
  if (proof.transactionLink !== undefined) {
    output.transactionLink = proof.transactionLink;
  }
  return output;
}
