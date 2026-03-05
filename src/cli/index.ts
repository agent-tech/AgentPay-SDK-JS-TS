#!/usr/bin/env node

import { getVersion } from './version.macro.js' with { type: 'macro' };
import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerBalanceCommands } from './commands/balance.js';
import { registerIntentCommands } from './commands/intent.js';
import { registerResetCommand } from './commands/reset.js';

const program = new Command();

program
	.name('agent-pay')
	.description('CLI for Agent Tech Pay API')
	.version(getVersion());

registerAuthCommands(program);
registerBalanceCommands(program);
registerIntentCommands(program);
registerResetCommand(program);

program.parse();
