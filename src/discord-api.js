import { logger } from './logger.js';

const API_BASE = 'https://discord.com/api/v10';

export class DiscordAPI {
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
