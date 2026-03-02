/**
 * Server-side entry point. Use when you have apiKey + secretKey.
 * Do NOT use in browser/client bundles — credentials must stay on the server.
 */

export type { Auth } from './auth.js';
export type { PayClientOptions } from './client.js';
export { PayClient } from './client.js';
export { PayApiError, PayValidationError } from './errors.js';
export type {
	BasePayment,
	CreateIntentRequest,
	CreateIntentResponse,
	ExecuteIntentResponse,
	FeeBreakdown,
	GetIntentResponse,
	IntentBase,
	IntentStatusValue,
	PaymentRequirements,
	SourcePayment,
} from './types.js';
export { IntentStatus } from './types.js';
