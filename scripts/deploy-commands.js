require('dotenv').config();

const {
  REST,
  Routes
} = require('discord.js');

const config =
  require('../src/config/config');


// ========================================
// PROMO COMMANDS
// ========================================

const promoCommands = [
  'create',
  'preview',
  'start',
  'pause',
  'resume',
  'cancel',
  'recover',
  'status',
  'history',
  'test_dm'
];


// ========================================
// SERVER COMMANDS
// ========================================

const serverCommands = [
  'list',
  'stats'
];


// ========================================
// LOAD COMMAND
// ========================================

function loadCommand(folder, name) {

  const command =
    require(
      `../src/commands/${folder}/${name}.js`
    );


  if (!command) {

    throw new Error(
      `Command not found: ${folder}/${name}`
    );

  }


  if (!command.data) {

    throw new Error(
      `Command ${folder}/${name} does not export "data".`
    );

  }


  if (
    typeof command.data.toJSON !==
    'function'
  ) {

    throw new Error(
      `Command ${folder}/${name} does not use a valid SlashCommandBuilder.`
    );

  }


  return command.data.toJSON();

}


// ========================================
// BUILD PROMO COMMAND
// ========================================

function buildPromoCommand() {

  const commands =
    promoCommands.map(
      name =>
        loadCommand(
          'promo',
          name
        )
    );


  return {

    name: 'promo',

    description:
      'Manage educational promotion simulations',

    type: 1,

    options: commands

  };

}


// ========================================
// BUILD SERVER COMMAND
// ========================================

function buildServerCommand() {

  const commands =
    serverCommands.map(
      name =>
        loadCommand(
          'server',
          name
        )
    );


  return {

    name: 'server',

    description:
      'View registered server information',

    type: 1,

    options: commands

  };

}


// ========================================
// BUILD ADMIN COMMAND
// ========================================

function buildAdminCommand() {

  const settings =
    loadCommand(
      'admin',
      'settings'
    );


  const blacklist =
    loadCommand(
      'admin',
      'blacklist'
    );


  return {

    name: 'admin',

    description:
      'Manage simulator administration',

    type: 1,

    options: [

      settings,

      {

        type: 2,

        name: 'blacklist',

        description:
          'Manage simulator blacklist',

        options:
          blacklist.options || []

      }

    ]

  };

}


// ========================================
// MAIN
// ========================================

async function main() {

  // --------------------------------------
  // Validate configuration
  // --------------------------------------

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


  // --------------------------------------
  // Build commands
  // --------------------------------------

  const commands = [

    buildPromoCommand(),

    buildServerCommand(),

    buildAdminCommand()

  ];


  console.log(
    `Preparing ${commands.length} top-level commands...`
  );


  console.log(
    ''
  );


  console.log(
    'Commands:'
  );


  console.log(
    '  /promo'
  );


  for (
    const command of promoCommands
  ) {

    console.log(
      `    /promo ${command}`
    );

  }


  console.log(
    '  /server'
  );


  for (
    const command of serverCommands
  ) {

    console.log(
      `    /server ${command}`
    );

  }


  console.log(
    '  /admin'
  );


  console.log(
    '    /admin settings'
  );


  console.log(
    '    /admin blacklist add'
  );


  console.log(
    '    /admin blacklist remove'
  );


  console.log(
    '    /admin blacklist list'
  );


  console.log(
    ''
  );


  // --------------------------------------
  // Discord REST
  // --------------------------------------

  const rest =
    new REST({
      version: '10'
    }).setToken(
      config.discordToken
    );


  console.log(
    'Deploying slash commands to Discord...'
  );


  // --------------------------------------
  // Deploy
  // --------------------------------------

  await rest.put(

    Routes.applicationCommands(
      config.clientId
    ),

    {
      body: commands
    }

  );


  console.log(
    ''
  );


  console.log(
    'Successfully deployed Souvion Promo commands.'
  );


  console.log(
    ''
  );

}


// ========================================
// ERROR HANDLER
// ========================================

main().catch(error => {

  console.error(
    ''
  );

  console.error(
    'Slash command deployment failed:'
  );

  console.error(
    error.stack || error
  );

  process.exit(1);

});
