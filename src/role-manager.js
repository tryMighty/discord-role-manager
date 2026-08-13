import { logger } from './logger.js';

export class RoleManager {
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

      for (const userId of users) {
        if (this.action === 'add') {
          if (this.dryRun) {
            logger.dryRun(`Would add role ${this.roleId} to user ${userId}`);
          } else {
            try {
              await this.api.addRole(this.guildId, userId, this.roleId);
              logger.success(`Added role to user ${userId}`);
            } catch (err) {
              logger.error(`Failed to add role to user ${userId}: ${err.message}`);
            }
          }
        } else if (this.action === 'remove') {
          if (this.dryRun) {
            logger.dryRun(`Would remove role ${this.roleId} from user ${userId}`);
          } else {
            try {
              await this.api.removeRole(this.guildId, userId, this.roleId);
              logger.success(`Removed role from user ${userId}`);
            } catch (err) {
              logger.error(`Failed to remove role from user ${userId}: ${err.message}`);
            }
          }
        }
        
        if (!this.dryRun) {
          await new Promise(r => setTimeout(r, 100)); // Small delay
        }
      }

      logger.info('Finished processing all users.');
    } catch (error) {
      logger.error(`RoleManager Error: ${error.message}`);
    }
  }

  async collectPollVoters(answerId, userIdsSet) {
    let after = null;
    let hasMore = true;
    while (hasMore) {
      const response = await this.api.getPollVoters(this.channelId, this.messageId, answerId, after);
      const usersArray = response.users || response;
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
