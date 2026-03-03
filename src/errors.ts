/**
 * Returned for non-2xx HTTP responses from the v2 payment API.
 */
export class PayApiError extends Error {
	public readonly statusCode: number;

	constructor(statusCode: number, message: string) {
		super(`api error ${statusCode}: ${message}`);
		this.name = 'PayApiError';
		this.statusCode = statusCode;
	}
}

/**
 * Returned when the SDK rejects a request before it reaches the API
 * (e.g. missing request, empty intent ID).
 */
export class PayValidationError extends Error {
	constructor(message: string) {
		super(`validation: ${message}`);
		this.name = 'PayValidationError';
	}
}
