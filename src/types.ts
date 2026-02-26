/** Intent status constants returned by the API. */
export const IntentStatus = {
  AwaitingPayment: "AWAITING_PAYMENT",
  Pending: "PENDING",
  VerificationFailed: "VERIFICATION_FAILED",
  SourceSettled: "SOURCE_SETTLED",
  BaseSettling: "BASE_SETTLING",
  BaseSettled: "BASE_SETTLED",
  Expired: "EXPIRED",
} as const;

export type IntentStatusValue =
  (typeof IntentStatus)[keyof typeof IntentStatus];

/** Body for POST /v2/intents. Exactly one of email or recipient must be set. */
export interface CreateIntentRequest {
  email?: string;
  recipient?: string;
  amount: string;
  payerChain: string;
}

/** Fee details from the API. */
export interface FeeBreakdown {
  sourceChain: string;
  sourceChainFee: string;
  targetChain: string;
  targetChainFee: string;
  platformFee: string;
  platformFeePercentage: string;
  totalFee: string;
}

/** Used by the client to sign X402 authorization. */
export interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
}

/** Fields shared across all intent response types. */
export interface IntentBase {
  intentId: string;
  merchantRecipient: string;
  sendingAmount: string;
  receivingAmount: string;
  estimatedFee: string;
  feeBreakdown: FeeBreakdown;
  status: IntentStatusValue;
  createdAt: string;
  expiresAt: string;
}

/** Response for POST /v2/intents (201). */
export interface CreateIntentResponse extends IntentBase {
  email?: string;
  sourceRecipient?: string;
  payerChain: string;
  paymentRequirements: PaymentRequirements;
}

/** Response for POST /v2/intents/{intent_id}/execute (200). */
export interface ExecuteIntentResponse extends IntentBase {}

/** Source-chain payment details from GetIntent. */
export interface SourcePayment {
  chain: string;
  txHash: string;
  settleProof: string;
  settledAt: string;
  explorerUrl: string;
}

/** Base-chain payment details from GetIntent. */
export interface BasePayment {
  txHash: string;
  settleProof: string;
  settledAt: string;
  explorerUrl: string;
}

/** Response for GET /v2/intents?intent_id=... (200). */
export interface GetIntentResponse extends IntentBase {
  payerChain: string;
  receiverEmail?: string;
  payerWallet?: string;
  errorMessage?: string;
  completedAt?: string;
  sourcePayment?: SourcePayment;
  basePayment?: BasePayment;
}

/** Common error body from the API (internal). */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
