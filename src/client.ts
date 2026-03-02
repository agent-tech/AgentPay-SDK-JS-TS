import type { Auth } from './auth.js';
import { buildAuthHeaders } from './auth.js';
import { PayValidationError } from './errors.js';
import { defaultFetcher, doRequest, type Fetcher, parseError } from './http.js';
import type {
	CreateIntentRequest,
	CreateIntentResponse,
	ExecuteIntentResponse,
	GetIntentResponse,
	SubmitProofResponse,
} from './types.js';
import { keysToCamel } from './utils.js';

const V2_PATH_PREFIX = '/api/v2';
const API_PATH_PREFIX = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;

// ── Client options ──────────────────────────────────────────────────────

export interface PayClientOptions {
	/** API root URL without path prefix (e.g. https://api-pay.agent.tech). */
	baseUrl: string;
	/** Auth credentials: { apiKey, secretKey } */
	auth: Auth;
	/** Request timeout in milliseconds (default 30 000). Ignored if custom fetcher is provided. */
	timeoutMs?: number;
	/** Custom HTTP client (replaces the default global fetch). */
	fetcher?: Fetcher;
}

// ── PayClient ───────────────────────────────────────────────────────────

export class PayClient {
	private readonly baseUrl: string;
	private readonly authHeaders: Record<string, string>;
	private readonly timeoutMs: number;
	private readonly fetchFn: Fetcher;
	private readonly hasCustomFetch: boolean;

	constructor(options: PayClientOptions) {
		if (!options.baseUrl) {
			throw new PayValidationError('baseUrl is required');
		}

		this.authHeaders = buildAuthHeaders(options.auth);
		this.baseUrl = options.baseUrl.replace(/\/+$/, '');
		this.hasCustomFetch = typeof options.fetcher === 'function';
		this.fetchFn = options.fetcher ?? defaultFetcher();
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	private async do(
		method: string,
		path: string,
		body?: unknown,
		signal?: AbortSignal,
	) {
		const url = this.baseUrl + V2_PATH_PREFIX + path;
		return doRequest({
			url,
			method,
			headers: this.authHeaders,
			body,
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
	}

	/**
	 * Create a payment intent (POST /api/v2/intents).
	 * Exactly one of request.email or request.recipient must be set.
	 */
	async createIntent(
		request: CreateIntentRequest,
		signal?: AbortSignal,
	): Promise<CreateIntentResponse> {
		if (!request) {
			throw new PayValidationError('CreateIntentRequest is required');
		}
		const hasEmail = !!request.email;
		const hasRecipient = !!request.recipient;
		if (hasEmail === hasRecipient) {
			throw new PayValidationError(
				"exactly one of 'email' or 'recipient' must be provided",
			);
		}
		if (!request.amount) {
			throw new PayValidationError("'amount' is required");
		}
		if (!request.payerChain) {
			throw new PayValidationError("'payerChain' is required");
		}
		const resp = await this.do('POST', '/intents', request, signal);
		if (resp.status !== 201) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as CreateIntentResponse;
	}

	/**
	 * Trigger transfer on Base using the Agent wallet
	 * (POST /api/v2/intents/{intent_id}/execute).
	 */
	async executeIntent(
		intentId: string,
		signal?: AbortSignal,
	): Promise<ExecuteIntentResponse> {
		if (!intentId) {
			throw new PayValidationError('intent_id is required');
		}
		const resp = await this.do(
			'POST',
			`/intents/${encodeURIComponent(intentId)}/execute`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as ExecuteIntentResponse;
	}

	/**
	 * Get intent status and receipt (GET /api/v2/intents?intent_id=...).
	 */
	async getIntent(
		intentId: string,
		signal?: AbortSignal,
	): Promise<GetIntentResponse> {
		if (!intentId) {
			throw new PayValidationError('intent_id is required');
		}
		const resp = await this.do(
			'GET',
			`/intents?intent_id=${encodeURIComponent(intentId)}`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as GetIntentResponse;
	}
}

// ── PublicPayClient ─────────────────────────────────────────────────────

export interface PublicPayClientOptions {
	/** API root URL without path prefix (e.g. https://api-pay.agent.tech). */
	baseUrl: string;
	/** Request timeout in milliseconds (default 30 000). Ignored if custom fetcher is provided. */
	timeoutMs?: number;
	/** Custom HTTP client (replaces the default global fetch). */
	fetcher?: Fetcher;
}

/**
 * Unauthenticated client for the public payment API (/api prefix).
 * Use when the integrator has the payer's wallet and can sign X402 / submit settle_proof.
 */
export class PublicPayClient {
	private readonly baseUrl: string;
	private readonly timeoutMs: number;
	private readonly fetchFn: Fetcher;
	private readonly hasCustomFetch: boolean;

	constructor(options: PublicPayClientOptions) {
		if (!options.baseUrl) {
			throw new PayValidationError('baseUrl is required');
		}

		this.baseUrl = options.baseUrl.replace(/\/+$/, '');
		this.hasCustomFetch = typeof options.fetcher === 'function';
		this.fetchFn = options.fetcher ?? defaultFetcher();
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	private async do(
		method: string,
		path: string,
		body?: unknown,
		signal?: AbortSignal,
	) {
		const url = this.baseUrl + API_PATH_PREFIX + path;
		return doRequest({
			url,
			method,
			headers: {},
			body,
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
	}

	/**
	 * Create a payment intent (POST /api/intents).
	 * Exactly one of request.email or request.recipient must be set.
	 */
	async createIntent(
		request: CreateIntentRequest,
		signal?: AbortSignal,
	): Promise<CreateIntentResponse> {
		if (!request) {
			throw new PayValidationError('CreateIntentRequest is required');
		}
		const hasEmail = !!request.email;
		const hasRecipient = !!request.recipient;
		if (hasEmail === hasRecipient) {
			throw new PayValidationError(
				"exactly one of 'email' or 'recipient' must be provided",
			);
		}
		if (!request.amount) {
			throw new PayValidationError("'amount' is required");
		}
		if (!request.payerChain) {
			throw new PayValidationError("'payerChain' is required");
		}
		const resp = await this.do('POST', '/intents', request, signal);
		if (resp.status !== 201) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as CreateIntentResponse;
	}

	/**
	 * Submit settle_proof after the payer has completed X402 payment
	 * (POST /api/intents/{intent_id}).
	 */
	async submitProof(
		intentId: string,
		settleProof: string,
		signal?: AbortSignal,
	): Promise<SubmitProofResponse> {
		if (!intentId) {
			throw new PayValidationError('intent_id is required');
		}
		if (!settleProof) {
			throw new PayValidationError('settle_proof is required');
		}
		const resp = await this.do(
			'POST',
			`/intents/${encodeURIComponent(intentId)}`,
			{ settleProof },
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as SubmitProofResponse;
	}

	/**
	 * Get intent status and receipt (GET /api/intents?intent_id=...).
	 */
	async getIntent(
		intentId: string,
		signal?: AbortSignal,
	): Promise<GetIntentResponse> {
		if (!intentId) {
			throw new PayValidationError('intent_id is required');
		}
		const resp = await this.do(
			'GET',
			`/intents?intent_id=${encodeURIComponent(intentId)}`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as GetIntentResponse;
	}
}
