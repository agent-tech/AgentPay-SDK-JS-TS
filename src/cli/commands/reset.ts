import { rmSync } from 'node:fs';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import type { Command } from 'commander';
import { clearConfig, getDataDir } from '../config.js';
import { clearAllSessions } from '../session.js';

async function confirmReset(): Promise<boolean> {
	const rl = createInterface({ input, output });
	try {
		const answer = await rl.question(
			'This will remove all agent-pay data (config + sessions). Continue? (y/N) ',
		);
		const normalized = answer.trim().toLowerCase();
		return normalized === 'y' || normalized === 'yes';
	} finally {
		rl.close();
	}
}

export function registerResetCommand(program: Command): void {
	program
		.command('reset')
		.description('Remove all stored config and session data')
		.option('--yes', 'Skip confirmation prompt')
		.action(async (opts: { yes?: boolean }) => {
			const ok = opts.yes ? true : await confirmReset();
			if (!ok) {
				console.log('Cancelled.');
				return;
			}

			const sessionsRemoved = clearAllSessions();
			const configRemoved = clearConfig();
			rmSync(getDataDir(), { recursive: true, force: true });

			console.log(
				`Reset complete. Sessions removed: ${sessionsRemoved}. Config removed: ${configRemoved ? 'yes' : 'no'}.`,
			);
		});
}
