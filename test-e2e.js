import { DiscordAPI } from './src/discord-api.js';
import { RoleManager } from './src/role-manager.js';
import { logger } from './src/logger.js';

// Mock Discord API
class MockDiscordAPI {
  async getGuildChannels(guildId) {
    return [{ id: 'channel_1', name: 'general', type: 0 }];
  }

  async findMessageChannel(guildId, messageId) {
    return 'channel_1';
  }

  async getMessage(channelId, messageId) {
    if (channelId !== 'channel_1' || messageId !== 'message_1') throw new Error('Not found');
    return {
      id: 'message_1',
      reactions: [{ emoji: { name: '👍' } }]
    };
  }

  async getReactions(channelId, messageId, emoji, after = null) {
    if (after) return [];
    return [{ id: 'user_1', bot: false }, { id: 'user_2', bot: false }];
  }

  async addRole(guildId, userId, roleId) {
    if (userId === 'user_1') throw new Error('User already has role'); // Mock already has role
    return true;
  }

  async removeRole(guildId, userId, roleId) {
    if (userId === 'user_1') throw new Error('User does not have role'); // Mock doesn't have role
    return true;
  }
}

async function runTests() {
  console.log('--- STARTING E2E MOCK TESTS ---');
  const api = new MockDiscordAPI();

  console.log('\nTesting ADD mode...');
  const addManager = new RoleManager(api, {
    guild: 'guild_1',
    message: 'message_1',
    role: 'role_1',
    action: 'add',
    dryRun: false
  });
  
  await addManager.execute();

  console.log('\nTesting REMOVE mode...');
  const removeManager = new RoleManager(api, {
    guild: 'guild_1',
    message: 'message_1',
    role: 'role_1',
    action: 'remove',
    dryRun: false
  });

  await removeManager.execute();
  console.log('--- TESTS COMPLETE ---');
}

runTests();
