# 🎮 Discord Role Manager Script

Welcome! If you want to automatically give (or remove) a specific Discord role to everyone who reacted to a message or voted on a poll, you've come to the right place!

This guide is designed to hold your hand through the entire process. Don't worry if you aren't a programmer—just follow these steps one by one, and you'll have it running in no time! 🚀

---

## 🛠️ Step 1: Install Requirements

Before you can use this script, you need a program called **Node.js** installed on your computer. 
Node.js is what runs JavaScript code outside of a web browser.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download and install the **LTS (Long Term Support)** version.
3. Once installed, open your computer's terminal (Command Prompt or PowerShell on Windows, Terminal on Mac).
4. Run this command to make sure it installed correctly:
   ```bash
   node -v
   ```
   *You should see a version number like `v18.x.x` or higher.*

5. Now, navigate to the folder where you saved this project in your terminal. 
6. Type the following command and hit Enter to install the required background packages:
   ```bash
   npm install
   ```

---

## 🤖 Step 2: Get a Discord Bot Token

To interact with Discord, the script acts like a "bot" in your server. You need to create a bot account and get its secret password, known as a **Token**.

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click the **New Application** button in the top right. Give it a name (like "Role Manager") and click **Create**.
3. On the left menu, click **Bot**.
4. Look for the **"Reset Token"** button. Click it, confirm, and copy the long string of text it gives you. 
   ⚠️ **CRITICAL:** *Never share this token with anyone! It is the password to your bot.*
5. **Turn on Privileged Intents**: Scroll down on the Bot page until you see **Privileged Gateway Intents**. 
   - Turn **ON** the "Server Members Intent".
   - Turn **ON** the "Message Content Intent".
   - Save your changes!

---

## 📩 Step 3: Invite the Bot to Your Server

The bot needs to actually be inside your Discord server to manage roles.

1. Still in the Developer Portal, click **OAuth2** on the left menu, then click **URL Generator**.
2. Under "Scopes", check the box for **bot**.
3. Under "Bot Permissions", check the box for **Manage Roles**.
4. Scroll to the bottom and copy the **Generated URL**.
5. Paste that URL into your web browser, select your server, and click **Authorize**.

---

## 🔑 Step 4: Find Your IDs

Discord uses unique number strings (IDs) to identify things like your server, roles, and messages. You'll need to find these numbers.

### Enable Developer Mode in Discord
You must turn this on to see IDs:
1. Open your Discord app.
2. Go to **User Settings** (the gear icon near your name).
3. Go to **Advanced** (under App Settings).
4. Turn on **Developer Mode**.

### Find Your Server ID
1. Right-click your server's icon on the very left side of Discord.
2. Click **Copy Server ID**.

### Find Your Role ID
1. Go to your server settings -> **Roles**.
2. Right-click the role you want to add/remove and click **Copy Role ID**.
   *(Note: Make sure your bot's role is HIGHER on the role list than the role it is trying to give out, or Discord will block it!)*

### Find Your Message ID
1. Go to the channel with the message or poll you want to check.
2. Right-click the message and click **Copy Message ID**.

---

## ✍️ Step 5: Put the IDs into the Script

Now it's time to open the script file!

1. Open the file named `index.js` in a text editor (Notepad, VS Code, or TextEdit).
2. Right at the very top of the file, you will see the **🛠️ CONFIGURATION ZONE 🛠️**.
3. It looks like this:

```javascript
// 1. Your Discord Bot Token 
const CONFIG_DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// 2. The ID of your Discord Server
const CONFIG_GUILD_ID      = 'YOUR_SERVER_ID_HERE';

// 3. The ID of the specific message or poll with the reactions
const CONFIG_MESSAGE_ID    = 'YOUR_MESSAGE_ID_HERE';

// 4. The ID of the role you want to add or remove
const CONFIG_ROLE_ID       = 'YOUR_ROLE_ID_HERE';
```

4. Replace `'YOUR_BOT_TOKEN_HERE'` with the Bot Token you got in Step 2. (Keep the single quotes around it!)
5. Do the same for your Server ID, Message ID, and Role ID.
6. By default, `CONFIG_ACTION` is set to `'add'`, which means it gives the role. If you want to take a role away, change it to `'remove'`.
7. **Save the file!**

---

## 🚀 Step 6: Run the Script!

You're finally ready!

1. Go back to your terminal window.
2. Run the script by typing:
   ```bash
   node index.js
   ```

You will see beautiful, colorful text telling you exactly what the script is doing. It will search for your message, find everyone who reacted or voted, and begin giving out the role! 

Once it's finished, it will print a neat summary of exactly how many people were processed.

---

## 🛡️ Dry Run Mode (Optional)

If you are nervous and just want to see *who* would get the role without actually giving it to them, you can change this line in the Configuration Zone:

```javascript
const CONFIG_DRY_RUN       = false; 
```
Change `false` to `true`. When you run the script, it will pretend to add the roles and tell you what it *would* have done!

---
*Happy managing!* 🎉
