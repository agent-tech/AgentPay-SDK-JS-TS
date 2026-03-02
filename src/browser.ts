/**
 * Client-side entry point. Use when the payer has their own wallet and can
 * sign X402 / submit settle_proof. No secret credentials required.
 */

export type { PublicPayClientOptions } from './client.js';
export { PublicPayClient } from './client.js';
export { PayApiError, PayValidationError } from './errors.js';
export type {
	BasePayment,
	CreateIntentRequest,
	CreateIntentResponse,
	FeeBreakdown,
	GetIntentResponse,
	IntentBase,
	IntentStatusValue,
	PaymentRequirements,
	SourcePayment,
	SubmitProofResponse,
} from './types.js';
export { IntentStatus } from './types.js';
