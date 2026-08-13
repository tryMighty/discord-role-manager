# Discord Role Manager

A Node.js CLI tool that adds or removes a Discord role from users who reacted to a specified message or voted on a poll message.

## Features
- Works with message reactions and Discord polls.
- Automatically handles pagination for fetching all users.
- Handles Discord API rate limits gracefully.
- Native fetch, zero heavy Discord libraries like discord.js.
- Dry run support to test without making actual changes.

## Prerequisites
- **Node.js**: v18.0.0 or higher
- **Discord Bot**: A Discord application with a bot token.

### Getting a Discord Bot Token
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a "New Application".
3. Navigate to the **Bot** tab on the left sidebar.
4. Click "Reset Token" and copy your new token.
5. Make sure the bot has the "Server Members Intent" enabled in the Privileged Gateway Intents section if necessary (usually only if fetching member details, but good to have).
6. Invite the bot to your server: Go to **OAuth2 -> URL Generator**, select `bot` scope, and `Manage Roles` permission. Open the generated URL and authorize it for your server.

### Important: Role Hierarchy
Make sure your Bot's role is **above** the role it is trying to assign or remove in the Discord server settings!

## Setup

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your bot token:
   ```env
   DISCORD_TOKEN=your_token_here
   ```

## Finding IDs in Discord
To use this CLI, you will need several IDs from Discord. You must enable **Developer Mode** in Discord to copy these IDs.
- *Enable Developer Mode*: Go to User Settings -> Advanced -> toggle "Developer Mode".
- **Guild ID**: Right-click the server icon on the left -> Copy Server ID.
- **Channel ID**: Right-click the channel name -> Copy Channel ID.
- **Message ID**: Right-click the message -> Copy Message ID.
- **Role ID**: Go to Server Settings -> Roles -> right-click the role -> Copy Role ID.

## Usage

```bash
node src/index.js --guild <server-id> --channel <channel-id> --message <message-id> --role <role-id> --action <add|remove>
```

### Options
- `-g, --guild <id>` : Discord Server (Guild) ID
- `-c, --channel <id>` : Discord Channel ID
- `-m, --message <id>` : Discord Message ID
- `-r, --role <id>` : Discord Role ID to add/remove
- `-a, --action <action>` : Action to perform: `add` or `remove`
- `-d, --dry-run` : Show what would happen without actually changing roles
- `-h, --help` : Show help message

### Examples

**Add a role to all users who reacted to a message:**
```bash
node src/index.js -g 123456789 -c 987654321 -m 1122334455 -r 5566778899 -a add
```

**Remove a role from all users who reacted to a message:**
```bash
node src/index.js -g 123456789 -c 987654321 -m 1122334455 -r 5566778899 -a remove
```

**Test what would happen (Dry Run):**
```bash
node src/index.js -g 123456789 -c 987654321 -m 1122334455 -r 5566778899 -a add --dry-run
```

## Troubleshooting
- **Failed to add role**: This usually means the bot doesn't have the `Manage Roles` permission, or the bot's highest role is lower than the role you are trying to assign.
- **Message not found**: Make sure the Channel ID and Message ID are correct and that the bot has permission to view the channel where the message is located.

## License
MIT License.
