import type { Auth } from './auth.js';
import { buildAuthHeaders } from './auth.js';
import { defaultFetcher, doRequest, type Fetcher, parseError } from './http.js';
import {
	createIntentRequestSchema,
	intentIdSchema,
	parseOrThrow,
	payClientOptionsSchema,
	publicPayClientOptionsSchema,
	settleProofSchema,
} from './schemas.js';
import type {
	CreateIntentRequest,
	CreateIntentResponse,
	ExecuteIntentResponse,
	GetIntentResponse,
	SubmitProofResponse,
} from './types.js';
import { keysToCamel } from './utils.js';

const V2_PATH_PREFIX = '/v2';
const API_PATH_PREFIX = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Minimum send amount in USDC (inclusive). */
export const MIN_SEND_AMOUNT_USDC = 0.2;

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
		const opts = parseOrThrow(payClientOptionsSchema, options);
		this.authHeaders = buildAuthHeaders(opts.auth);
		this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
		this.hasCustomFetch = typeof opts.fetcher === 'function';
		this.fetchFn = (opts.fetcher as Fetcher | undefined) ?? defaultFetcher();
		this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
	 * Create a payment intent (POST /v2/intents).
	 * Exactly one of request.email or request.recipient must be set.
	 */
	async createIntent(
		request: CreateIntentRequest,
		signal?: AbortSignal,
	): Promise<CreateIntentResponse> {
		const req = parseOrThrow(createIntentRequestSchema, request);
		const resp = await this.do('POST', '/intents', req, signal);
		if (resp.status !== 201) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as CreateIntentResponse;
	}

	/**
	 * Trigger transfer on Base using the Agent wallet
	 * (POST /v2/intents/{intent_id}/execute).
	 */
	async executeIntent(
		intentId: string,
		signal?: AbortSignal,
	): Promise<ExecuteIntentResponse> {
		const id = parseOrThrow(intentIdSchema, intentId);
		const resp = await this.do(
			'POST',
			`/intents/${encodeURIComponent(id)}/execute`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as ExecuteIntentResponse;
	}

	/**
	 * Get intent status and receipt (GET /v2/intents?intent_id=...).
	 */
	async getIntent(
		intentId: string,
		signal?: AbortSignal,
	): Promise<GetIntentResponse> {
		const id = parseOrThrow(intentIdSchema, intentId);
		const resp = await this.do(
			'GET',
			`/intents?intent_id=${encodeURIComponent(id)}`,
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
		const opts = parseOrThrow(publicPayClientOptionsSchema, options);
		this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
		this.hasCustomFetch = typeof opts.fetcher === 'function';
		this.fetchFn = (opts.fetcher as Fetcher | undefined) ?? defaultFetcher();
		this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
		const req = parseOrThrow(createIntentRequestSchema, request);
		const resp = await this.do('POST', '/intents', req, signal);
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
		const id = parseOrThrow(intentIdSchema, intentId);
		const proof = parseOrThrow(settleProofSchema, settleProof);
		const resp = await this.do(
			'POST',
			`/intents/${encodeURIComponent(id)}`,
			{ settleProof: proof },
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
		const id = parseOrThrow(intentIdSchema, intentId);
		const resp = await this.do(
			'GET',
			`/intents?intent_id=${encodeURIComponent(id)}`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as GetIntentResponse;
	}
}
