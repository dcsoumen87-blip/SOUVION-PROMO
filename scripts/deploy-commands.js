require('dotenv').config();

const {
  REST,
  Routes
} = require('discord.js');

const config = require('../src/config/config');

const promoCommands = [
  'create',
  'preview',
  'start',
  'pause',
  'resume',
  'cancel',
  'recover',
  'status',
  'history'
];

const serverCommands = [
  'list',
  'stats'
];

function loadCommand(folder, name) {
  const command = require(
    `../src/commands/${folder}/${name}.js`
  );

  if (!command || !command.data) {
    throw new Error(
      `Invalid command: ${folder}/${name}`
    );
  }

  if (typeof command.data.toJSON !== 'function') {
    throw new Error(
      `Command ${folder}/${name} does not export a valid SlashCommandBuilder.`
    );
  }

  return command.data.toJSON();
}

function buildPromoCommand() {
  const commands = promoCommands.map(name =>
    loadCommand('promo', name)
  );

  return {
    name: 'promo',
    description: 'Manage educational promotion simulations',
    type: 1,
    options: commands
  };
}

function buildServerCommand() {
  const commands = serverCommands.map(name =>
    loadCommand('server', name)
  );

  return {
    name: 'server',
    description: 'View registered server information',
    type: 1,
    options: commands
  };
}

function buildAdminCommand() {
  const settings = loadCommand(
    'admin',
    'settings'
  );

  const blacklist = loadCommand(
    'admin',
    'blacklist'
  );

  return {
    name: 'admin',
    description: 'Manage simulator administration',
    type: 1,

    options: [
      settings,

      {
        type: 2,
        name: 'blacklist',
        description: 'Manage simulator blacklist',
        options: blacklist.options || []
      }
    ]
  };
}

async function main() {
  if (!config.discordToken) {
    throw new Error(
      'DISCORD_TOKEN is missing.'
    );
  }

  if (!config.clientId) {
    throw new Error(
      'CLIENT_ID is missing.'
    );
  }

  const commands = [
    buildPromoCommand(),
    buildServerCommand(),
    buildAdminCommand()
  ];

  console.log(
    `Preparing ${commands.length} top-level commands...`
  );

  console.log(
    'Commands:'
  );

  console.log(
    '  /promo'
  );

  console.log(
    '  /server'
  );

  console.log(
    '  /admin'
  );

  const rest = new REST({
    version: '10'
  }).setToken(
    config.discordToken
  );

  console.log(
    'Deploying slash commands to Discord...'
  );

  await rest.put(
    Routes.applicationCommands(
      config.clientId
    ),
    {
      body: commands
    }
  );

  console.log(
    'Successfully deployed slash commands.'
  );
}

main().catch(error => {
  console.error(
    'Slash command deployment failed:'
  );

  console.error(
    error.stack || error
  );

  process.exit(1);
});
