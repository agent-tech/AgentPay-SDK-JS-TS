import type { z } from 'zod';
import { z as zod } from 'zod';
import { PayValidationError } from './errors.js';

/** Minimum send amount in USDC (inclusive). */
const MIN_SEND_AMOUNT_USDC = 0.02;

// ── Auth ───────────────────────────────────────────────────────────────────

export const authSchema = zod.object({
	apiKey: zod.string().min(1, 'apiKey and secretKey must not be empty'),
	secretKey: zod.string().min(1, 'apiKey and secretKey must not be empty'),
});

// ── Client options ─────────────────────────────────────────────────────────

export const payClientOptionsSchema = zod.object({
	baseUrl: zod.string().min(1, 'baseUrl is required'),
	auth: authSchema,
	timeoutMs: zod.number().optional(),
	fetcher: zod.unknown().optional(),
});

export const publicPayClientOptionsSchema = zod.object({
	baseUrl: zod.string().min(1, 'baseUrl is required'),
	timeoutMs: zod.number().optional(),
	fetcher: zod.unknown().optional(),
});

// ── CreateIntentRequest ────────────────────────────────────────────────────

export const createIntentRequestSchema = zod
	.object({
		email: zod.string().optional(),
		recipient: zod.string().optional(),
		amount: zod.string().min(1, "'amount' is required"),
		payerChain: zod.string().min(1, "'payerChain' is required"),
		targetChain: zod.string().min(1, "'targetChain' is required"),
		payerAsset: zod.string().optional(),
		targetAsset: zod.string().optional(),
	})
	.refine(
		(data) => {
			const num = Number(data.amount);
			return !Number.isNaN(num) && num >= MIN_SEND_AMOUNT_USDC;
		},
		{ message: `'amount' must be at least ${MIN_SEND_AMOUNT_USDC} USDC` },
	)
	.refine(
		(data) => {
			const hasEmail = !!data.email;
			const hasRecipient = !!data.recipient;
			return hasEmail !== hasRecipient;
		},
		{
			message: "exactly one of 'email' or 'recipient' must be provided",
		},
	);

// ── Swap ───────────────────────────────────────────────────────────────────

export const swapQuoteParamsSchema = zod
	.object({
		chain: zod.string().min(1, "'chain' is required"),
		inputToken: zod.string().min(1, "'inputToken' is required"),
		outputToken: zod.string().min(1, "'outputToken' is required"),
		fromAmount: zod.number().int().positive().optional(),
		toAmount: zod.number().int().positive().optional(),
		slippageBps: zod.number().int().nonnegative().max(500).optional(),
		toChain: zod.string().optional(),
		userAddress: zod.string().optional(),
		toUserAddress: zod.string().optional(),
	})
	.refine(
		(data) => {
			const hasFrom = data.fromAmount !== undefined;
			const hasTo = data.toAmount !== undefined;
			return hasFrom !== hasTo;
		},
		{ message: "exactly one of 'fromAmount' or 'toAmount' must be provided" },
	);

export const registerSwapIntentSchema = zod.object({
	sourceTxHash: zod.string().min(1, "'sourceTxHash' is required"),
	fromChain: zod.string().min(1, "'fromChain' is required"),
	toChain: zod.string().min(1, "'toChain' is required"),
	fromToken: zod.string().min(1, "'fromToken' is required"),
	toToken: zod.string().min(1, "'toToken' is required"),
	payerAddress: zod.string().min(1, "'payerAddress' is required"),
	recipientAddress: zod.string().min(1, "'recipientAddress' is required"),
	sendingTokenAmount: zod.string().min(1, "'sendingTokenAmount' is required"),
});

// ── Method params ──────────────────────────────────────────────────────────

export const intentIdSchema = zod
	.string()
	.min(1, 'intent_id is required');

export const settleProofSchema = zod
	.string()
	.min(1, 'settle_proof is required');

// ── Helper ────────────────────────────────────────────────────────────────

/**
 * Parse value with schema; on failure throw PayValidationError with readable message.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
	const result = schema.safeParse(value);
	if (result.success) {
		return result.data;
	}
	const err = result.error;
	const first = err.errors[0];
	const message = first?.message ?? err.message;
	throw new PayValidationError(message);
}
