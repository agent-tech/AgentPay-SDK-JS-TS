import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function getVersion(): string {
	const pkg = JSON.parse(
		readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
	) as { version: string };
	return pkg.version;
}
