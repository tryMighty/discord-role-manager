import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// ============================================================================
// 🛠️ CONFIGURATION ZONE 🛠️
// Swap in your new variables below to use the script.
// Follow the README for a step-by-step guide on how to find these IDs.
// ============================================================================

// 1. Your Discord Bot Token (can also be set in a .env file as DISCORD_TOKEN)
const CONFIG_DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// 2. The ID of your Discord Server
const CONFIG_GUILD_ID      = 'YOUR_SERVER_ID_HERE';

// 3. The ID of the specific message or poll with the reactions
const CONFIG_MESSAGE_ID    = 'YOUR_MESSAGE_ID_HERE';

// 4. The ID of the role you want to add or remove
const CONFIG_ROLE_ID       = 'YOUR_ROLE_ID_HERE';

// 5. The action you want to perform: type 'add' to give the role, or 'remove' to take it away
const CONFIG_ACTION        = 'add'; 

// 6. Set to true if you want to test the script without actually changing any roles
const CONFIG_DRY_RUN       = false; 
// ============================================================================
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const logger = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  dryRun: (msg) => console.log(`${colors.magenta}[DRY RUN]${colors.reset} ${msg}`)
};

// ==========================================
// DISCORD API
// ==========================================
const API_BASE = 'https://discord.com/api/v10';

class DiscordAPI {
  constructor(token) {
    if (!token) {
      throw new Error('Discord token is required');
    }
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Authorization': `Bot ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 429) {
          const rateLimitData = await response.json();
          const retryAfter = rateLimitData.retry_after * 1000 || 5000;
          logger.warn(`Rate limited. Waiting ${retryAfter}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          retries--;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Discord API Error (${response.status}): ${JSON.stringify(errorData)}`);
        }

        if (response.status === 204) {
          return null;
        }

        return await response.json();
      } catch (error) {
        if (retries === 1) throw error;
        logger.warn(`Request failed, retrying... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async getGuildChannels(guildId) {
    return this.request(`/guilds/${guildId}/channels`);
  }

  async findMessageChannel(guildId, messageId) {
    const channels = await this.getGuildChannels(guildId);
    if (!channels || !Array.isArray(channels)) {
      throw new Error('Failed to retrieve guild channels.');
    }

    // Filter to text-based channels that can have messages
    const textChannels = channels.filter(c => c.type === 0 || c.type === 2 || c.type === 5 || c.type === 11 || c.type === 12);
    
    logger.info(`Searching for message ${messageId} across ${textChannels.length} text channels...`);
    
    for (const channel of textChannels) {
      try {
        const message = await this.getMessage(channel.id, messageId);
        if (message && message.id === messageId) {
          logger.success(`Found message in channel ${channel.id} (${channel.name})`);
          return channel.id;
        }
      } catch (err) {
        // Message not found in this channel or no access, ignore and continue
        if (err.message.includes('10008') || err.message.includes('403') || err.message.includes('404')) {
          continue;
        }
      }
    }
    throw new Error(`Message ${messageId} not found in any accessible channel in guild ${guildId}`);
  }

  async getMessage(channelId, messageId) {
    return this.request(`/channels/${channelId}/messages/${messageId}`);
  }

  async getReactions(channelId, messageId, emoji, after = null) {
    let endpoint = `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}?limit=100`;
    if (after) {
      endpoint += `&after=${after}`;
    }
    return this.request(endpoint);
  }

  async getPollVoters(channelId, messageId, answerId, after = null) {
    let endpoint = `/channels/${channelId}/polls/${messageId}/answers/${answerId}?limit=100`;
    if (after) {
      endpoint += `&after=${after}`;
    }
    return this.request(endpoint);
  }

  async addRole(guildId, userId, roleId) {
    return this.request(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'PUT'
    });
  }

  async removeRole(guildId, userId, roleId) {
    return this.request(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE'
    });
  }
}

// ==========================================
// ROLE MANAGER
// ==========================================
class RoleManager {
  constructor(api, options) {
    this.api = api;
    this.guildId = options.guild;
    this.channelId = options.channel;
    this.messageId = options.message;
    this.roleId = options.role;
    this.action = options.action; // 'add' or 'remove'
    this.dryRun = options.dryRun || false;
  }

  async execute() {
    try {
      if (!this.channelId) {
        logger.info(`Channel ID not provided. Searching for message ${this.messageId} in guild ${this.guildId}...`);
        this.channelId = await this.api.findMessageChannel(this.guildId, this.messageId);
      }

      logger.info(`Fetching message ${this.messageId} in channel ${this.channelId}...`);
      const message = await this.api.getMessage(this.channelId, this.messageId);
      
      const userIds = new Set();

      if (message.poll) {
        logger.info('Message is a poll. Fetching voters...');
        for (const answer of message.poll.answers) {
          await this.collectPollVoters(answer.answer_id, userIds);
        }
      } else if (message.reactions && message.reactions.length > 0) {
        logger.info('Message has reactions. Fetching reactors...');
        for (const reaction of message.reactions) {
          const emoji = reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;
          await this.collectReactors(emoji, userIds);
        }
      } else {
        logger.warn('Message has no poll and no reactions.');
        return;
      }

      const users = Array.from(userIds);
      logger.info(`Found ${users.length} unique users.`);

      if (users.length === 0) {
        logger.warn('No users to process.');
        return;
      }

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const userId of users) {
        if (this.action === 'add') {
          if (this.dryRun) {
            logger.dryRun(`Would add role ${this.roleId} to user ${userId}`);
          } else {
            try {
              await this.api.addRole(this.guildId, userId, this.roleId);
              logger.success(`Added role to user ${userId}`);
              successCount++;
            } catch (err) {
              logger.error(`Failed to add role to user ${userId}: ${err.message}`);
              errorCount++;
            }
          }
        } else if (this.action === 'remove') {
          if (this.dryRun) {
            logger.dryRun(`Would remove role ${this.roleId} from user ${userId}`);
          } else {
            try {
              await this.api.removeRole(this.guildId, userId, this.roleId);
              logger.success(`Removed role from user ${userId}`);
              successCount++;
            } catch (err) {
              logger.error(`Failed to remove role from user ${userId}: ${err.message}`);
              errorCount++;
            }
          }
        }
        
        if (!this.dryRun) {
          await new Promise(r => setTimeout(r, 100)); // Small delay
        }
      }

      logger.info('Finished processing all users.');

      console.log('\n--- Summary ---');
      if (this.dryRun) {
        console.log(`Total users found: ${users.length} (dry run - no changes made)`);
      } else {
        console.log(`Total users found: ${users.length}`);
        console.log(`Roles ${this.action === 'add' ? 'added' : 'removed'}: ${successCount}`);
        console.log(`Already had role / skipped: ${skipCount}`);
        console.log(`Errors: ${errorCount}`);
      }
    } catch (error) {
      logger.error(`RoleManager Error: ${error.message}`);
      throw error;
    }
  }

  async collectPollVoters(answerId, userIdsSet) {
    let after = null;
    let hasMore = true;
    while (hasMore) {
      const response = await this.api.getPollVoters(this.channelId, this.messageId, answerId, after);
      const usersArray = Array.isArray(response) ? response : (response.users || []);
      if (!usersArray || usersArray.length === 0) {
        hasMore = false;
        break;
      }
      for (const user of usersArray) {
        if (!user.bot) userIdsSet.add(user.id);
      }
      if (usersArray.length < 100) {
        hasMore = false;
      } else {
        after = usersArray[usersArray.length - 1].id;
      }
    }
  }

  async collectReactors(emoji, userIdsSet) {
    let after = null;
    let hasMore = true;
    while (hasMore) {
      const users = await this.api.getReactions(this.channelId, this.messageId, emoji, after);
      if (!users || users.length === 0) {
        hasMore = false;
        break;
      }
      for (const user of users) {
        if (!user.bot) userIdsSet.add(user.id);
      }
      if (users.length < 100) {
        hasMore = false;
      } else {
        after = users[users.length - 1].id;
      }
    }
  }
}

// Exporting classes for testing
export { DiscordAPI, RoleManager, logger };

// ==========================================
// SCRIPT EXECUTION
// ==========================================
async function main() {
  try {
    if (!CONFIG_DISCORD_TOKEN || CONFIG_DISCORD_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
      logger.error('Discord Bot Token is missing! Please put your token in the CONFIGURATION ZONE.');
      process.exit(1);
    }
    
    if (CONFIG_GUILD_ID === 'YOUR_SERVER_ID_HERE' || CONFIG_MESSAGE_ID === 'YOUR_MESSAGE_ID_HERE' || CONFIG_ROLE_ID === 'YOUR_ROLE_ID_HERE') {
      logger.error('You need to fill in your Guild ID, Message ID, and Role ID in the CONFIGURATION ZONE.');
      process.exit(1);
    }

    const action = CONFIG_ACTION.toLowerCase();
    if (action !== 'add' && action !== 'remove') {
      logger.error('Action must be either "add" or "remove"');
      process.exit(1);
    }

    logger.info(`Starting Discord Role Manager v${pkg.version}`);
    logger.info(`Action: ${action.toUpperCase()}`);
    if (CONFIG_DRY_RUN) {
      logger.info('DRY RUN MODE ENABLED - No roles will actually be changed');
    }

    const api = new DiscordAPI(CONFIG_DISCORD_TOKEN);
    const manager = new RoleManager(api, {
      guild: CONFIG_GUILD_ID,
      message: CONFIG_MESSAGE_ID,
      role: CONFIG_ROLE_ID,
      action: action,
      dryRun: CONFIG_DRY_RUN
    });

    await manager.execute();
  } catch (err) {
    logger.error(`Fatal Error: ${err.message}`);
    process.exit(1);
  }
}

// Ensure main only runs if this file is executed directly (not when imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
