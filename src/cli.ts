#!/usr/bin/env node
import { startMcpServer } from './mcp/server.js';
import { loadConfigFromPath } from './config/loader.js';

function printHelp(): void {
  console.log(
    [
      'chuna-ai - Expose any HTTP API as an MCP server (StdIO)',
      '',
      'Usage:',
      '  chuna-ai serve -c <configPath>',
      '',
      'Options:',
      '  -c, --config   Path to JSON config file or directory (split config)',
      '  -h, --help     Show help',
      '',
    ].join('\n'),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help') || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const cmd = args[0];
  if (cmd !== 'serve') {
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }

  const configFlagIndex = Math.max(args.indexOf('-c'), args.indexOf('--config'));
  if (configFlagIndex === -1 || !args[configFlagIndex + 1]) {
    console.error('Error: Missing -c/--config <path>');
    process.exit(1);
  }

  const configPath = args[configFlagIndex + 1];
  const config = await loadConfigFromPath(configPath);

  await startMcpServer({ config });
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((error) => {
  console.error(error);
  process.exit(1);
});


