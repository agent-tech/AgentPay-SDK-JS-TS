import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CliConfig {
	apiKey: string;
	secretKey: string;
	baseUrl: string;
}

const DATA_DIRNAME = '.agent-tech-pay';
const CONFIG_FILENAME = 'config.json';
const SESSIONS_DIRNAME = 'sessions';

export function getDataDir(): string {
	return join(homedir(), DATA_DIRNAME);
}

export function ensureDataDir(): void {
	mkdirSync(getDataDir(), { recursive: true });
}

export function getSessionDir(): string {
	return join(getDataDir(), SESSIONS_DIRNAME);
}

function getConfigPath(): string {
	return join(getDataDir(), CONFIG_FILENAME);
}

export function readConfig(): CliConfig | null {
	const path = getConfigPath();
	if (!existsSync(path)) {
		return null;
	}
	try {
		const raw = readFileSync(path, 'utf-8');
		const data = JSON.parse(raw) as CliConfig;
		if (!data.apiKey || !data.secretKey || !data.baseUrl) {
			return null;
		}
		return data;
	} catch {
		return null;
	}
}

export function writeConfig(config: CliConfig): void {
	ensureDataDir();
	const path = getConfigPath();
	writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
}

export function clearConfig(): boolean {
	const path = getConfigPath();
	if (!existsSync(path)) {
		return false;
	}
	unlinkSync(path);
	return true;
}

export function getConfigPathForDisplay(): string {
	return getConfigPath();
}
