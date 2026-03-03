import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { CreateIntentResponse, IntentStatusValue } from '../types.js';
import { ensureDataDir, getSessionDir } from './config.js';

export interface IntentSession {
	intentId: string;
	createdAt: string;
	expiresAt: string;
	maxTimeoutSeconds: number;
	status: IntentStatusValue;
	lastUpdatedAt: string;
	response: CreateIntentResponse;
}

function ensureSessionDir(): void {
	ensureDataDir();
	mkdirSync(getSessionDir(), { recursive: true });
}

function getSessionPath(intentId: string): string {
	return join(getSessionDir(), `${intentId}.json`);
}

export function writeSession(session: IntentSession): void {
	ensureSessionDir();
	writeFileSync(
		getSessionPath(session.intentId),
		JSON.stringify(session, null, 2),
		'utf-8',
	);
}

export function readSession(intentId: string): IntentSession | null {
	const path = getSessionPath(intentId);
	if (!existsSync(path)) {
		return null;
	}
	try {
		const raw = readFileSync(path, 'utf-8');
		return JSON.parse(raw) as IntentSession;
	} catch {
		return null;
	}
}

function isExpired(expiresAt: string, nowMs: number): boolean {
	const t = Date.parse(expiresAt);
	if (Number.isNaN(t)) return true;
	return t <= nowMs;
}

export function listSessions(): IntentSession[] {
	const dir = getSessionDir();
	if (!existsSync(dir)) {
		return [];
	}

	const sessions: IntentSession[] = [];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.json')) continue;
		const fullPath = join(dir, file);
		try {
			const raw = readFileSync(fullPath, 'utf-8');
			const parsed = JSON.parse(raw) as IntentSession;
			if (parsed?.intentId) {
				sessions.push(parsed);
			}
		} catch {
			// ignore unreadable session files
		}
	}

	sessions.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
	return sessions;
}

export function getLatestActiveSession(): IntentSession | null {
	const nowMs = Date.now();
	for (const s of listSessions()) {
		if (!isExpired(s.expiresAt, nowMs)) {
			return s;
		}
	}
	return null;
}

export function clearAllSessions(): number {
	const dir = getSessionDir();
	if (!existsSync(dir)) {
		return 0;
	}
	const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
	for (const f of files) {
		rmSync(join(dir, f), { force: true });
	}
	return files.length;
}

export function isSessionExpired(session: IntentSession): boolean {
	return isExpired(session.expiresAt, Date.now());
}
