#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerIntentCommands } from './commands/intent.js';

const program = new Command();

program
	.name('agent-pay')
	.description('CLI for Agent Tech Pay API')
	.version('0.1.0');

registerAuthCommands(program);
registerIntentCommands(program);

program.parse();
