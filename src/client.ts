import camelcaseKeys from "camelcase-keys";
import decamelizeKeys from "decamelize-keys";
import { PayApiError, PayValidationError } from "./errors.js";
import type {
  CreateIntentRequest,
  CreateIntentResponse,
  ErrorResponse,
  ExecuteIntentResponse,
  GetIntentResponse,
  SubmitProofResponse,
} from "./types.js";

const V2_PATH_PREFIX = "/v2";
const API_PATH_PREFIX = "/api";
const DEFAULT_TIMEOUT_MS = 30_000;

// ── Auth types ──────────────────────────────────────────────────────────

export interface BearerAuth {
  type: "bearer";
  clientId: string;
  clientSecret: string;
}

export interface ApiKeyAuth {
  type: "apiKey";
  clientId: string;
  apiKey: string;
}

export type Auth = BearerAuth | ApiKeyAuth;

// ── Client options ──────────────────────────────────────────────────────

/** Generic HTTP request parameters (fetch-agnostic). */
export interface FetchRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  signal?: AbortSignal;
}

/** Generic HTTP response interface (fetch-agnostic). */
export interface FetchResponse {
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

/** Generic HTTP client. Accepts any implementation (fetch, axios, node-fetch, etc.). */
export type Fetcher = (request: FetchRequest) => Promise<FetchResponse>;

export interface PayClientOptions {
  /** API root without /v2. */
  baseUrl: string;
  /** Authentication credentials. */
  auth: Auth;
  /** Request timeout in milliseconds (default 30 000). Ignored if custom fetcher is provided. */
  timeoutMs?: number;
  /** Custom HTTP client (replaces the default global fetch). */
  fetcher?: Fetcher;
}

// ── Key conversion helpers ──────────────────────────────────────────────

export function keysToSnake(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  return decamelizeKeys(obj as Record<string, unknown> | unknown[], {
    deep: true,
  });
}

export function keysToCamel(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  return camelcaseKeys(obj as Record<string, unknown> | unknown[], {
    deep: true,
  });
}

// ── Fetch adapter ─────────────────────────────────────────────────────────

function defaultFetcher(): Fetcher {
  return (req) =>
    globalThis.fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      signal: req.signal,
    }) as Promise<FetchResponse>;
}

// ── Shared error parser ──────────────────────────────────────────────────

async function parseError(resp: FetchResponse): Promise<PayApiError> {
  let msg: string | undefined;
  try {
    const raw = await resp.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const body = raw as Partial<ErrorResponse>;
      msg = body.message || body.error;
    }
  } catch {
    // ignore JSON parse failures
  }
  if (!msg) {
    msg = resp.statusText || `HTTP ${resp.status}`;
  }
  return new PayApiError(resp.status, msg);
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
      throw new PayValidationError("baseUrl is required");
    }

    const { auth } = options;
    if (!auth) {
      throw new PayValidationError(
        "an auth option is required (use bearer or apiKey auth)",
      );
    }

    if (auth.type === "bearer") {
      if (!auth.clientId || !auth.clientSecret) {
        throw new PayValidationError(
          "clientId and clientSecret must not be empty",
        );
      }
      // NOTE: The upstream API expects base64-encoded credentials in a Bearer
      // header. This is intentional and not standard HTTP Basic auth.
      const token = Buffer.from(
        `${auth.clientId}:${auth.clientSecret}`,
      ).toString("base64");
      this.authHeaders = { Authorization: `Bearer ${token}` };
    } else if (auth.type === "apiKey") {
      if (!auth.clientId || !auth.apiKey) {
        throw new PayValidationError("clientId and apiKey must not be empty");
      }
      this.authHeaders = {
        "X-Client-ID": auth.clientId,
        "X-API-Key": auth.apiKey,
      };
    } else {
      throw new PayValidationError(
        "an auth option is required (use bearer or apiKey auth)",
      );
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.hasCustomFetch = typeof options.fetcher === "function";
    this.fetchFn = options.fetcher ?? defaultFetcher();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ── Internal helpers ────────────────────────────────────────────────

  async #_do(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<FetchResponse> {
    const url = this.baseUrl + V2_PATH_PREFIX + path;

    const headers: Record<string, string> = { ...this.authHeaders };
    let reqBody: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      reqBody = JSON.stringify(keysToSnake(body));
    }

    // Timeout handling: use AbortController when no custom fetch is provided.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let fetchSignal = signal;
    let onAbort: (() => void) | undefined;

    if (!this.hasCustomFetch) {
      const controller = new AbortController();
      if (signal) {
        if (signal.aborted) {
          controller.abort(signal.reason);
        } else {
          onAbort = () => controller.abort(signal.reason);
          signal.addEventListener("abort", onAbort, { once: true });
        }
      }
      timeoutId = setTimeout(
        () =>
          controller.abort(
            new Error(`request timed out after ${this.timeoutMs}ms`),
          ),
        this.timeoutMs,
      );
      fetchSignal = controller.signal;
    }

    try {
      return await this.fetchFn({
        url,
        method,
        headers,
        body: reqBody,
        signal: fetchSignal,
      });
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (onAbort && signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Create a payment intent (POST /v2/intents).
   * Exactly one of request.email or request.recipient must be set.
   */
  async createIntent(
    request: CreateIntentRequest,
    signal?: AbortSignal,
  ): Promise<CreateIntentResponse> {
    if (!request) {
      throw new PayValidationError("CreateIntentRequest is required");
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
    const resp = await this.#_do("POST", "/intents", request, signal);
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
    if (!intentId) {
      throw new PayValidationError("intent_id is required");
    }
    const resp = await this.#_do(
      "POST",
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
   * Get intent status and receipt (GET /v2/intents?intent_id=...).
   */
  async getIntent(
    intentId: string,
    signal?: AbortSignal,
  ): Promise<GetIntentResponse> {
    if (!intentId) {
      throw new PayValidationError("intent_id is required");
    }
    const resp = await this.#_do(
      "GET",
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
  /** API root without /api. */
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
      throw new PayValidationError("baseUrl is required");
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.hasCustomFetch = typeof options.fetcher === "function";
    this.fetchFn = options.fetcher ?? defaultFetcher();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ── Internal helpers ────────────────────────────────────────────────

  private async do(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<FetchResponse> {
    const url = this.baseUrl + API_PATH_PREFIX + path;

    const headers: Record<string, string> = {};
    let reqBody: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      reqBody = JSON.stringify(keysToSnake(body));
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let fetchSignal = signal;
    let onAbort: (() => void) | undefined;

    if (!this.hasCustomFetch) {
      const controller = new AbortController();
      if (signal) {
        if (signal.aborted) {
          controller.abort(signal.reason);
        } else {
          onAbort = () => controller.abort(signal.reason);
          signal.addEventListener("abort", onAbort, { once: true });
        }
      }
      timeoutId = setTimeout(
        () =>
          controller.abort(
            new Error(`request timed out after ${this.timeoutMs}ms`),
          ),
        this.timeoutMs,
      );
      fetchSignal = controller.signal;
    }

    try {
      return await this.fetchFn({
        url,
        method,
        headers,
        body: reqBody,
        signal: fetchSignal,
      });
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (onAbort && signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Create a payment intent (POST /api/intents).
   * Exactly one of request.email or request.recipient must be set.
   */
  async createIntent(
    request: CreateIntentRequest,
    signal?: AbortSignal,
  ): Promise<CreateIntentResponse> {
    if (!request) {
      throw new PayValidationError("CreateIntentRequest is required");
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
    const resp = await this.do("POST", "/intents", request, signal);
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
      throw new PayValidationError("intent_id is required");
    }
    if (!settleProof) {
      throw new PayValidationError("settle_proof is required");
    }
    const resp = await this.do(
      "POST",
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
      throw new PayValidationError("intent_id is required");
    }
    const resp = await this.do(
      "GET",
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
