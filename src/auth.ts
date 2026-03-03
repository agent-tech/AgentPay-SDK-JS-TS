import { PayValidationError } from './errors.js';

export interface Auth {
	apiKey: string;
	secretKey: string;
}

/**
 * Build auth headers from credentials.
 * Throws PayValidationError if auth is invalid.
 */
export function buildAuthHeaders(auth: Auth): Record<string, string> {
	if (!auth) {
		throw new PayValidationError('auth is required (apiKey and secretKey)');
	}

	if (!auth.apiKey || !auth.secretKey) {
		throw new PayValidationError('apiKey and secretKey must not be empty');
	}
	// NOTE: The upstream API expects base64-encoded credentials in a Bearer
	// header. This is intentional and not standard HTTP Basic auth.
	const token = Buffer.from(`${auth.apiKey}:${auth.secretKey}`).toString(
		'base64',
	);
	return { Authorization: `Bearer ${token}` };
}
