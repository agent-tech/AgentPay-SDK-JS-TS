import type { Command } from 'commander';
import {
	clearConfig,
	getConfigPathForDisplay,
	readConfig,
	writeConfig,
} from '../config.js';

function maskSecret(value: string): string {
	if (!value || value.length < 8) {
		return '****';
	}
	return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
}

export function registerAuthCommands(program: Command): void {
	const auth = program.command('auth').description('Manage auth credentials');

	auth
		.command('set')
		.description('Set API key, secret key, and base URL')
		.option('--api-key <key>', 'API key')
		.option('--secret-key <key>', 'Secret key')
		.option(
			'--base-url <url>',
			'API base URL (e.g. https://api-pay.agent.tech)',
		)
		.action(
			(opts: { apiKey?: string; secretKey?: string; baseUrl?: string }) => {
				const apiKey = opts.apiKey ?? process.env.PAY_API_KEY;
				const secretKey = opts.secretKey ?? process.env.PAY_SECRET_KEY;
				const baseUrl = opts.baseUrl ?? process.env.PAY_BASE_URL;

				if (!apiKey || !secretKey || !baseUrl) {
					console.error(
						'Error: apiKey, secretKey, and baseUrl are required. Use --api-key, --secret-key, --base-url or PAY_API_KEY, PAY_SECRET_KEY, PAY_BASE_URL env vars.',
					);
					process.exit(1);
				}

				writeConfig({ apiKey, secretKey, baseUrl });
				console.log(`Config saved to ${getConfigPathForDisplay()}`);
			},
		);

	auth
		.command('show')
		.description('Show current config (secret key masked)')
		.action(() => {
			const config = readConfig();
			if (!config) {
				console.log(
					'No config found. Run: agent-pay auth set --api-key <key> --secret-key <key> --base-url <url>',
				);
				return;
			}
			console.log(`Config file: ${getConfigPathForDisplay()}`);
			console.log(`  apiKey:    ${config.apiKey}`);
			console.log(`  secretKey: ${maskSecret(config.secretKey)}`);
			console.log(`  baseUrl:   ${config.baseUrl}`);
		});

	auth
		.command('clear')
		.description('Remove stored config')
		.action(() => {
			const removed = clearConfig();
			if (removed) {
				console.log(
					"Config cleared. Sessions preserved. Use 'agent-pay reset' to remove all data.",
				);
			} else {
				console.log(
					"No config found. Sessions preserved. Use 'agent-pay reset' to remove all data.",
				);
			}
		});
}
