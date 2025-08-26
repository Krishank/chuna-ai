#!/usr/bin/env node
import {
  loadConfigFromPath,
  startMcpServer
} from "./chunk-SIDCB3ZG.js";

// src/cli.ts
function printHelp() {
  console.log(
    [
      "chuna-ai - Expose any HTTP API as an MCP server (StdIO)",
      "",
      "Usage:",
      "  chuna-ai serve -c <configPath>",
      "",
      "Options:",
      "  -c, --config   Path to JSON config file or directory (split config)",
      "  -h, --help     Show help",
      ""
    ].join("\n")
  );
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help") || args.length === 0) {
    printHelp();
    process.exit(0);
  }
  const cmd = args[0];
  if (cmd !== "serve") {
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }
  const configFlagIndex = Math.max(args.indexOf("-c"), args.indexOf("--config"));
  if (configFlagIndex === -1 || !args[configFlagIndex + 1]) {
    console.error("Error: Missing -c/--config <path>");
    process.exit(1);
  }
  const configPath = args[configFlagIndex + 1];
  const config = await loadConfigFromPath(configPath);
  await startMcpServer({ config });
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
//# sourceMappingURL=cli.js.map