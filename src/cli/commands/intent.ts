import type { Command } from 'commander';
import { PublicPayClient } from '../../browser.js';
import { PayClient } from '../../server.js';
import { readConfig } from '../config.js';
import {
	getLatestActiveSession,
	isSessionExpired,
	listSessions,
	readSession,
	writeSession,
} from '../session.js';

function getBaseUrlFromConfigOrEnv(): string | null {
	const config = readConfig();
	if (config?.baseUrl) return config.baseUrl;
	return process.env.PAY_BASE_URL ?? null;
}

function requireAuthConfig(): {
	apiKey: string;
	secretKey: string;
	baseUrl: string;
} {
	const config = readConfig();
	if (!config) {
		console.error(
			'Error: No auth config. Run: agent-pay auth set --api-key <key> --secret-key <key> --base-url <url>',
		);
		process.exit(1);
	}
	return config;
}

function resolveIntentId(positional?: string): {
	intentId: string;
	fromSession: boolean;
} {
	if (positional) return { intentId: positional, fromSession: false };
	if (process.env.PAY_INTENT_ID) {
		return { intentId: process.env.PAY_INTENT_ID, fromSession: false };
	}
	const session = getLatestActiveSession();
	if (!session) {
		console.error(
			'Error: intent-id is required (no active session found). Provide [intent-id] or set PAY_INTENT_ID, or run: agent-pay intent create ...',
		);
		process.exit(1);
	}
	return { intentId: session.intentId, fromSession: true };
}

function tryUpdateSessionStatus(intentId: string, status: string): void {
	const existing = readSession(intentId);
	if (!existing) return;
	writeSession({
		...existing,
		status: status as never,
		lastUpdatedAt: new Date().toISOString(),
	});
}

export function registerIntentCommands(program: Command): void {
	const intent = program
		.command('intent')
		.description('Payment intent operations');

	intent
		.command('create')
		.description('Create a payment intent (server-side, requires auth)')
		.option('--amount <amount>', 'Amount to pay')
		.option('--payer-chain <chain>', 'Payer chain')
		.option('--email <email>', 'Recipient email (use email OR recipient)')
		.option(
			'--recipient <address>',
			'Recipient wallet address (use email OR recipient)',
		)
		.action(
			async (opts: {
				amount?: string;
				payerChain?: string;
				email?: string;
				recipient?: string;
			}) => {
				const config = requireAuthConfig();
				const amount = opts.amount ?? process.env.PAY_AMOUNT;
				const payerChain = opts.payerChain ?? process.env.PAY_PAYER_CHAIN;
				const email = opts.email ?? process.env.PAY_EMAIL;
				const recipient = opts.recipient ?? process.env.PAY_RECIPIENT;

				if (!amount || !payerChain) {
					console.error('Error: --amount and --payer-chain are required.');
					process.exit(1);
				}
				if (!!email === !!recipient) {
					console.error(
						'Error: Exactly one of --email or --recipient must be provided.',
					);
					process.exit(1);
				}

				const client = new PayClient({
					baseUrl: config.baseUrl,
					auth: { apiKey: config.apiKey, secretKey: config.secretKey },
				});

				const request = {
					amount,
					payerChain,
					...(email ? { email } : { recipient: recipient! }),
				};

				try {
					const res = await client.createIntent(request);
					console.log(JSON.stringify(res, null, 2));
					writeSession({
						intentId: res.intentId,
						createdAt: res.createdAt,
						expiresAt: res.expiresAt,
						maxTimeoutSeconds: res.paymentRequirements.maxTimeoutSeconds,
						status: res.status,
						lastUpdatedAt: new Date().toISOString(),
						response: res,
					});
					console.error(
						`Session saved: ${res.intentId}. Expires at ${res.expiresAt} (${res.paymentRequirements.maxTimeoutSeconds} seconds).`,
					);
				} catch (err) {
					console.error(err instanceof Error ? err.message : err);
					process.exit(1);
				}
			},
		);

	intent
		.command('execute [intent-id]')
		.description('Execute intent (server-side, requires auth)')
		.action(async (intentId: string | undefined) => {
			const resolved = resolveIntentId(intentId);
			const id = resolved.intentId;
			if (resolved.fromSession) {
				console.error(`Using intent from session: ${id}`);
			}

			const config = requireAuthConfig();
			const client = new PayClient({
				baseUrl: config.baseUrl,
				auth: { apiKey: config.apiKey, secretKey: config.secretKey },
			});

			try {
				const res = await client.executeIntent(id);
				console.log(JSON.stringify(res, null, 2));
				tryUpdateSessionStatus(id, res.status);
			} catch (err) {
				console.error(err instanceof Error ? err.message : err);
				process.exit(1);
			}
		});

	intent
		.command('get [intent-id]')
		.description('Get intent status (server-side, requires auth)')
		.action(async (intentId: string | undefined) => {
			const resolved = resolveIntentId(intentId);
			const id = resolved.intentId;
			if (resolved.fromSession) {
				console.error(`Using intent from session: ${id}`);
			}

			const config = requireAuthConfig();
			const client = new PayClient({
				baseUrl: config.baseUrl,
				auth: { apiKey: config.apiKey, secretKey: config.secretKey },
			});

			try {
				const res = await client.getIntent(id);
				console.log(JSON.stringify(res, null, 2));
				tryUpdateSessionStatus(id, res.status);
			} catch (err) {
				console.error(err instanceof Error ? err.message : err);
				process.exit(1);
			}
		});

	intent
		.command('sessions')
		.description('List intent sessions (stored locally)')
		.option('--expired', 'Show only expired sessions')
		.action((opts: { expired?: boolean }) => {
			const all = listSessions();
			const filtered = opts.expired
				? all.filter((s) => isSessionExpired(s))
				: all;
			console.log(JSON.stringify(filtered, null, 2));
		});

	intent
		.command('submit-proof <intent-id>')
		.description('Submit settle proof (client-side, no auth)')
		.option('--proof <proof>', 'Settle proof from X402 payment')
		.option('--base-url <url>', 'API base URL (overrides config)')
		.action(
			async (
				intentId: string | undefined,
				opts: { proof?: string; baseUrl?: string },
			) => {
				const id = intentId ?? process.env.PAY_INTENT_ID;
				if (!id) {
					console.error('Error: intent-id is required.');
					process.exit(1);
				}

				const proof = opts.proof ?? process.env.PAY_SETTLE_PROOF;
				if (!proof) {
					console.error('Error: --proof is required.');
					process.exit(1);
				}

				const baseUrl = opts.baseUrl ?? getBaseUrlFromConfigOrEnv();
				if (!baseUrl) {
					console.error(
						'Error: baseUrl required. Use --base-url or run: agent-pay auth set --base-url <url>',
					);
					process.exit(1);
				}

				const client = new PublicPayClient({ baseUrl });

				try {
					const res = await client.submitProof(id, proof);
					console.log(JSON.stringify(res, null, 2));
				} catch (err) {
					console.error(err instanceof Error ? err.message : err);
					process.exit(1);
				}
			},
		);
}
