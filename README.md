# Discord Role Manager

This is a simple Node.js script that automatically adds or removes a specific Discord role for everyone who reacted to a message or voted on a poll.

## Setup

1. Open `index.js` in a text editor.
2. At the very top of the file, locate the **CONFIGURATION ZONE**.
3. Insert your Discord Bot Token, Server ID, Message ID, and Role ID into the corresponding variables.
4. (Optional) Set `CONFIG_ACTION` to `'remove'` if you want to take the role away instead of adding it.

## Running the Script

1. Ensure you have Node.js installed on your system.
2. Open your terminal in this directory and install the dependencies:
   ```bash
   npm install
   ```
3. Run the script using the node command:
   ```bash
   node index.js
   ```
