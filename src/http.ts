import { PayApiError } from './errors.js';
import { keysToSnake } from './utils.js';

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

/** Common error body from the API (internal). */
export interface ErrorResponse {
	error: string;
	message: string;
	statusCode: number;
}

export function defaultFetcher(): Fetcher {
	return (req) =>
		globalThis.fetch(req.url, {
			method: req.method,
			headers: req.headers,
			body: req.body,
			signal: req.signal,
		}) as Promise<FetchResponse>;
}

export async function parseError(resp: FetchResponse): Promise<PayApiError> {
	let msg: string | undefined;
	try {
		const raw = await resp.json();
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
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

export interface DoRequestOptions {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
	fetcher: Fetcher;
	timeoutMs: number;
	hasCustomFetch: boolean;
}

export async function doRequest(
	options: DoRequestOptions,
): Promise<FetchResponse> {
	const {
		url,
		method,
		headers,
		body,
		signal,
		fetcher,
		timeoutMs,
		hasCustomFetch,
	} = options;

	let reqBody: string | undefined;
	const reqHeaders = { ...headers };
	if (body !== undefined) {
		reqHeaders['Content-Type'] = 'application/json';
		reqBody = JSON.stringify(keysToSnake(body));
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let fetchSignal = signal;
	let onAbort: (() => void) | undefined;

	if (!hasCustomFetch) {
		const controller = new AbortController();
		if (signal) {
			if (signal.aborted) {
				controller.abort(signal.reason);
			} else {
				onAbort = () => controller.abort(signal!.reason);
				signal.addEventListener('abort', onAbort, { once: true });
			}
		}
		timeoutId = setTimeout(
			() =>
				controller.abort(new Error(`request timed out after ${timeoutMs}ms`)),
			timeoutMs,
		);
		fetchSignal = controller.signal;
	}

	try {
		return await fetcher({
			url,
			method,
			headers: reqHeaders,
			body: reqBody,
			signal: fetchSignal,
		});
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		if (onAbort && signal) {
			signal.removeEventListener('abort', onAbort);
		}
	}
}
