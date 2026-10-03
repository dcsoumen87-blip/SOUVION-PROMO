const path = require('node:path');
require('dotenv').config();

const required = ['DISCORD_TOKEN','CLIENT_ID','GITHUB_TOKEN','GITHUB_OWNER','GITHUB_REPO','BOT_OWNER_ID'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  github: { token: process.env.GITHUB_TOKEN, owner: process.env.GITHUB_OWNER, repo: process.env.GITHUB_REPO, branch: process.env.GITHUB_BRANCH || 'main' },
  botOwnerId: process.env.BOT_OWNER_ID,
  port: Number(process.env.PORT || 3000),
  rootDir: path.resolve(__dirname, '../..'),
  dataDir: path.resolve(__dirname, '../../data')
};
