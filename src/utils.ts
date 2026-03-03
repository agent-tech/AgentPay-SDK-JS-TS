import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

export function keysToSnake(obj: unknown): unknown {
	if (obj === null || typeof obj !== 'object') return obj;
	return decamelizeKeys(obj as Record<string, unknown> | unknown[], {
		deep: true,
	});
}

export function keysToCamel(obj: unknown): unknown {
	if (obj === null || typeof obj !== 'object') return obj;
	return camelcaseKeys(obj as Record<string, unknown> | unknown[], {
		deep: true,
	});
}
