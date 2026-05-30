import type { Auth } from './auth.js';
import { buildAuthHeaders } from './auth.js';
import { defaultFetcher, doRequest, type Fetcher, parseError } from './http.js';
import {
	createIntentRequestSchema,
	intentIdSchema,
	parseOrThrow,
	payClientOptionsSchema,
	publicPayClientOptionsSchema,
	registerSwapIntentSchema,
	settleProofSchema,
	swapQuoteParamsSchema,
} from './schemas.js';
import type {
	CreateIntentRequest,
	CreateIntentResponse,
	ExecuteIntentResponse,
	GetIntentResponse,
	RegisterSwapIntentRequest,
	RegisterSwapIntentResponse,
	SubmitProofResponse,
	SupportedChainsResponse,
	SwapQuoteParams,
	SwapQuoteResponse,
} from './types.js';
import { keysToCamel, keysToSnake } from './utils.js';

const V2_PATH_PREFIX = '/v2';
const API_PATH_PREFIX = '/api';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Minimum send amount in USDC (inclusive). */
export const MIN_SEND_AMOUNT_USDC = 0.02;

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

	/**
	 * List runtime-enabled payer and target chains (GET /api/chains).
	 * The route is unauthenticated and shared with PublicPayClient.
	 */
	async listSupportedChains(
		signal?: AbortSignal,
	): Promise<SupportedChainsResponse> {
		const resp = await doRequest({
			url: this.baseUrl + API_PATH_PREFIX + '/chains',
			method: 'GET',
			headers: {},
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as SupportedChainsResponse;
	}

	/**
	 * Get a swap quote (GET /api/swap/quote).
	 * Exactly one of params.fromAmount or params.toAmount must be set.
	 * When params.userAddress is provided, the response includes a swap transaction.
	 */
	async getSwapQuote(
		params: SwapQuoteParams,
		signal?: AbortSignal,
	): Promise<SwapQuoteResponse> {
		const p = parseOrThrow(swapQuoteParamsSchema, params);
		const qs = buildSwapQuoteQuery(p);
		const resp = await doRequest({
			url: this.baseUrl + API_PATH_PREFIX + `/swap/quote?${qs}`,
			method: 'GET',
			headers: {},
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as SwapQuoteResponse;
	}

	/**
	 * Register a submitted swap transaction as a payment intent (POST /api/swap/intents).
	 * The returned intentId can be used to track settlement status.
	 */
	async registerSwapIntent(
		request: RegisterSwapIntentRequest,
		signal?: AbortSignal,
	): Promise<RegisterSwapIntentResponse> {
		const req = parseOrThrow(registerSwapIntentSchema, request);
		const resp = await doRequest({
			url: this.baseUrl + API_PATH_PREFIX + '/swap/intents',
			method: 'POST',
			headers: {},
			body: keysToSnake(req),
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
		if (resp.status !== 201) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as RegisterSwapIntentResponse;
	}

	/**
	 * Get supported swap tokens from LiFi (GET /api/swap/tokens).
	 * Returns raw LiFi JSON — key casing is not transformed.
	 */
	async getSwapTokens(
		chains?: string,
		chainTypes?: string,
		signal?: AbortSignal,
	): Promise<unknown> {
		const qs = buildDiscoveryQuery({ chains, chainTypes });
		const resp = await doRequest({
			url: this.baseUrl + API_PATH_PREFIX + `/swap/tokens${qs ? `?${qs}` : ''}`,
			method: 'GET',
			headers: {},
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return resp.json();
	}

	/**
	 * Get supported swap chains from LiFi (GET /api/swap/chains).
	 * Returns raw LiFi JSON — key casing is not transformed.
	 */
	async getSwapChains(chainTypes?: string, signal?: AbortSignal): Promise<unknown> {
		const qs = chainTypes ? `chainTypes=${encodeURIComponent(chainTypes)}` : '';
		const resp = await doRequest({
			url: this.baseUrl + API_PATH_PREFIX + `/swap/chains${qs ? `?${qs}` : ''}`,
			method: 'GET',
			headers: {},
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return resp.json();
	}

	/**
	 * Get supported swap connections from LiFi (GET /api/swap/connections).
	 * Returns raw LiFi JSON — key casing is not transformed.
	 */
	async getSwapConnections(
		fromChain?: string,
		toChain?: string,
		fromToken?: string,
		toToken?: string,
		signal?: AbortSignal,
	): Promise<unknown> {
		const qs = buildDiscoveryQuery({ fromChain, toChain, fromToken, toToken });
		const resp = await doRequest({
			url: this.baseUrl + API_PATH_PREFIX + `/swap/connections${qs ? `?${qs}` : ''}`,
			method: 'GET',
			headers: {},
			signal,
			fetcher: this.fetchFn,
			timeoutMs: this.timeoutMs,
			hasCustomFetch: this.hasCustomFetch,
		});
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return resp.json();
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

	/**
	 * List runtime-enabled payer and target chains (GET /api/chains).
	 */
	async listSupportedChains(
		signal?: AbortSignal,
	): Promise<SupportedChainsResponse> {
		const resp = await this.do('GET', '/chains', undefined, signal);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as SupportedChainsResponse;
	}

	/**
	 * Get a swap quote (GET /api/swap/quote).
	 * Exactly one of params.fromAmount or params.toAmount must be set.
	 * When params.userAddress is provided, the response includes a swap transaction.
	 */
	async getSwapQuote(
		params: SwapQuoteParams,
		signal?: AbortSignal,
	): Promise<SwapQuoteResponse> {
		const p = parseOrThrow(swapQuoteParamsSchema, params);
		const qs = buildSwapQuoteQuery(p);
		const resp = await this.do('GET', `/swap/quote?${qs}`, undefined, signal);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as SwapQuoteResponse;
	}

	/**
	 * Register a submitted swap transaction as a payment intent (POST /api/swap/intents).
	 * The returned intentId can be used to track settlement status.
	 */
	async registerSwapIntent(
		request: RegisterSwapIntentRequest,
		signal?: AbortSignal,
	): Promise<RegisterSwapIntentResponse> {
		const req = parseOrThrow(registerSwapIntentSchema, request);
		const resp = await this.do('POST', '/swap/intents', keysToSnake(req), signal);
		if (resp.status !== 201) {
			throw await parseError(resp);
		}
		return keysToCamel(await resp.json()) as RegisterSwapIntentResponse;
	}

	/**
	 * Get supported swap tokens from LiFi (GET /api/swap/tokens).
	 * Returns raw LiFi JSON — key casing is not transformed.
	 */
	async getSwapTokens(
		chains?: string,
		chainTypes?: string,
		signal?: AbortSignal,
	): Promise<unknown> {
		const qs = buildDiscoveryQuery({ chains, chainTypes });
		const resp = await this.do(
			'GET',
			`/swap/tokens${qs ? `?${qs}` : ''}`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return resp.json();
	}

	/**
	 * Get supported swap chains from LiFi (GET /api/swap/chains).
	 * Returns raw LiFi JSON — key casing is not transformed.
	 */
	async getSwapChains(chainTypes?: string, signal?: AbortSignal): Promise<unknown> {
		const qs = chainTypes ? `chainTypes=${encodeURIComponent(chainTypes)}` : '';
		const resp = await this.do(
			'GET',
			`/swap/chains${qs ? `?${qs}` : ''}`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return resp.json();
	}

	/**
	 * Get supported swap connections from LiFi (GET /api/swap/connections).
	 * Returns raw LiFi JSON — key casing is not transformed.
	 */
	async getSwapConnections(
		fromChain?: string,
		toChain?: string,
		fromToken?: string,
		toToken?: string,
		signal?: AbortSignal,
	): Promise<unknown> {
		const qs = buildDiscoveryQuery({ fromChain, toChain, fromToken, toToken });
		const resp = await this.do(
			'GET',
			`/swap/connections${qs ? `?${qs}` : ''}`,
			undefined,
			signal,
		);
		if (resp.status !== 200) {
			throw await parseError(resp);
		}
		return resp.json();
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildSwapQuoteQuery(p: SwapQuoteParams): string {
	const q = new URLSearchParams();
	q.set('chain', p.chain);
	q.set('input_token', p.inputToken);
	q.set('output_token', p.outputToken);
	if (p.fromAmount !== undefined) q.set('from_amount', String(p.fromAmount));
	if (p.toAmount !== undefined) q.set('to_amount', String(p.toAmount));
	if (p.slippageBps !== undefined) q.set('slippage_bps', String(p.slippageBps));
	if (p.toChain) q.set('to_chain', p.toChain);
	if (p.userAddress) q.set('user_address', p.userAddress);
	if (p.toUserAddress) q.set('to_user_address', p.toUserAddress);
	return q.toString();
}

function buildDiscoveryQuery(params: Record<string, string | undefined>): string {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v) q.set(k, v);
	}
	return q.toString();
}
