import type { Command } from 'commander';

const DEFAULT_BASE_RPC_URL = 'https://mainnet.base.org';

/** USDC contract on Base mainnet. */
const USDC_CONTRACT_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/** Ethereum address: 0x + 40 hex chars (case-insensitive). */
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** ERC20 balanceOf(address) selector. */
const BALANCE_OF_SELECTOR = '0x70a08231';

function padAddressTo32(address: string): string {
	const hex = address.slice(2).toLowerCase().padStart(64, '0');
	return `0x${hex}`;
}

function parseWeiToUsdc(weiHex: string): string {
	const raw = BigInt(weiHex);
	const usdc = Number(raw) / 1e6; // USDC has 6 decimals
	return usdc.toFixed(6).replace(/\.?0+$/, '') || '0';
}

async function fetchUsdcBalance(
	rpcUrl: string,
	address: string,
): Promise<{ raw: string; usdc: string }> {
	const callData = BALANCE_OF_SELECTOR + padAddressTo32(address).slice(2);

	const res = await fetch(rpcUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'eth_call',
			params: [
				{ to: USDC_CONTRACT_BASE, data: callData },
				'latest',
			],
		}),
	});

	if (!res.ok) {
		throw new Error(`RPC request failed: ${res.status} ${res.statusText}`);
	}

	const json = (await res.json()) as {
		jsonrpc?: string;
		id?: number;
		result?: string;
		error?: { code: number; message: string };
	};

	if (json.error) {
		throw new Error(`RPC error: ${json.error.message}`);
	}

	if (typeof json.result !== 'string') {
		throw new Error('Invalid RPC response: missing result');
	}

	const raw = json.result === '0x' ? '0x0' : json.result;
	const usdc = parseWeiToUsdc(raw);
	return { raw, usdc };
}

export function registerBalanceCommands(program: Command): void {
	const balance = program
		.command('balance')
		.description('Read agent balance from Base chain');

	balance
		.command('read')
		.description('Read USDC balance of an address on Base mainnet')
		.option(
			'--address <address>',
			'Agent wallet address (0x...) to query (or PAY_AGENT_ADDRESS)',
		)
		.option(
			'--rpc-url <url>',
			`Base RPC URL (default: ${DEFAULT_BASE_RPC_URL})`,
			DEFAULT_BASE_RPC_URL,
		)
		.action(
			async (opts: { address?: string; rpcUrl?: string }) => {
				const addr = (opts.address ?? process.env.PAY_AGENT_ADDRESS ?? '').trim();
				if (!addr) {
					console.error(
						'Error: --address or PAY_AGENT_ADDRESS is required.',
					);
					process.exit(1);
				}
				if (!ETH_ADDRESS_REGEX.test(addr)) {
					console.error(
						'Error: --address must be a valid Ethereum address (0x + 40 hex chars).',
					);
					process.exit(1);
				}

				const rpcUrl = (
					opts.rpcUrl ?? process.env.PAY_BASE_RPC_URL ?? DEFAULT_BASE_RPC_URL
				).replace(/\/+$/, '');

				try {
					const { raw, usdc } = await fetchUsdcBalance(rpcUrl, addr);
					console.log(
						JSON.stringify(
							{
								address: addr,
								usdcContract: USDC_CONTRACT_BASE,
								rpcUrl,
								balanceRaw: raw,
								balanceUsdc: usdc,
							},
							null,
							2,
						),
					);
				} catch (err) {
					console.error(err instanceof Error ? err.message : err);
					process.exit(1);
				}
			},
		);
}
