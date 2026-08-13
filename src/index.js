import { Command } from 'commander';
import dotenv from 'dotenv';
import { DiscordAPI } from './discord-api.js';
import { RoleManager } from './role-manager.js';
import { logger } from './logger.js';
import { readFileSync } from 'fs';

dotenv.config();

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

const program = new Command();

program
  .name('discord-role-manager')
  .description(pkg.description)
  .version(pkg.version)
  .requiredOption('-g, --guild <id>', 'Discord Server (Guild) ID')
  .requiredOption('-c, --channel <id>', 'Discord Channel ID')
  .requiredOption('-m, --message <id>', 'Discord Message ID')
  .requiredOption('-r, --role <id>', 'Discord Role ID to add/remove')
  .requiredOption('-a, --action <action>', 'Action to perform: add or remove', (val) => {
    const v = val.toLowerCase();
    if (v !== 'add' && v !== 'remove') {
      throw new Error('Action must be "add" or "remove"');
    }
    return v;
  })
  .option('-d, --dry-run', 'Show what would happen without actually changing roles', false);

program.parse(process.argv);
const options = program.opts();

async function main() {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      logger.error('DISCORD_TOKEN environment variable is not set. Please check your .env file.');
      process.exit(1);
    }

    logger.info(`Starting Discord Role Manager v${pkg.version}`);
    logger.info(`Action: ${options.action.toUpperCase()}`);
    if (options.dryRun) {
      logger.info('DRY RUN MODE ENABLED - No roles will actually be changed');
    }

    const api = new DiscordAPI(token);
    const manager = new RoleManager(api, options);

    await manager.execute();
  } catch (err) {
    logger.error(`Fatal Error: ${err.message}`);
    process.exit(1);
  }
}

main();
