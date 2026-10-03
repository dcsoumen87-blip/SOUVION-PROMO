require('dotenv').config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} = require('discord.js');

const config = require('../src/config/config');

const PROMO_COMMANDS = [
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

const SERVER_COMMANDS = [
  'list',
  'stats'
];

const ADMIN_COMMANDS = [
  'settings',
  'blacklist'
];

/**
 * Load a command module and return its JSON definition.
 */
function loadCommand(folder, name) {
  const command = require(`../src/commands/${folder}/${name}.js`);

  if (!command || !command.data) {
    throw new Error(
      `Command ${folder}/${name} does not export "data".`
    );
  }

  if (typeof command.data.toJSON !== 'function') {
    throw new Error(
      `Command ${folder}/${name} data is invalid.`
    );
  }

  return command.data.toJSON();
}

/**
 * Convert a normal command JSON definition
 * into a SlashCommandSubcommandBuilder.
 */
function buildSubcommand(commandData) {
  const subcommand = new SlashCommandSubcommandBuilder()
    .setName(commandData.name)
    .setDescription(
      commandData.description || `Run ${commandData.name}`
    );

  for (const option of commandData.options || []) {
    /*
     * Discord option types:
     *
     * 3  STRING
     * 4  INTEGER
     * 5  BOOLEAN
     * 6  USER
     * 7  CHANNEL
     * 8  ROLE
     * 9  MENTIONABLE
     * 10 NUMBER
     * 11 ATTACHMENT
     *
     * Type 1 = SUB_COMMAND
     * Type 2 = SUB_COMMAND_GROUP
     */
    if (option.type === 3) {
      subcommand.addStringOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Option')
          .setRequired(Boolean(option.required));

        if (
          option.min_length !== undefined &&
          typeof o.setMinLength === 'function'
        ) {
          o.setMinLength(option.min_length);
        }

        if (
          option.max_length !== undefined &&
          typeof o.setMaxLength === 'function'
        ) {
          o.setMaxLength(option.max_length);
        }

        if (
          Array.isArray(option.choices) &&
          option.choices.length
        ) {
          o.addChoices(...option.choices);
        }

        return o;
      });
    }

    else if (option.type === 4) {
      subcommand.addIntegerOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Option')
          .setRequired(Boolean(option.required));

        if (
          option.min_value !== undefined &&
          typeof o.setMinValue === 'function'
        ) {
          o.setMinValue(option.min_value);
        }

        if (
          option.max_value !== undefined &&
          typeof o.setMaxValue === 'function'
        ) {
          o.setMaxValue(option.max_value);
        }

        if (
          Array.isArray(option.choices) &&
          option.choices.length
        ) {
          o.addChoices(...option.choices);
        }

        return o;
      });
    }

    else if (option.type === 5) {
      subcommand.addBooleanOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Option')
          .setRequired(Boolean(option.required));

        return o;
      });
    }

    else if (option.type === 6) {
      subcommand.addUserOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'User')
          .setRequired(Boolean(option.required));

        return o;
      });
    }

    else if (option.type === 7) {
      subcommand.addChannelOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Channel')
          .setRequired(Boolean(option.required));

        return o;
      });
    }

    else if (option.type === 8) {
      subcommand.addRoleOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Role')
          .setRequired(Boolean(option.required));

        return o;
      });
    }

    else if (option.type === 9) {
      subcommand.addMentionableOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Mentionable')
          .setRequired(Boolean(option.required));

        return o;
      });
    }

    else if (option.type === 10) {
      subcommand.addNumberOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Number')
          .setRequired(Boolean(option.required));

        if (
          option.min_value !== undefined &&
          typeof o.setMinValue === 'function'
        ) {
          o.setMinValue(option.min_value);
        }

        if (
          option.max_value !== undefined &&
          typeof o.setMaxValue === 'function'
        ) {
          o.setMaxValue(option.max_value);
        }

        return o;
      });
    }

    else if (option.type === 11) {
      subcommand.addAttachmentOption(o => {
        o.setName(option.name)
          .setDescription(option.description || 'Attachment')
          .setRequired(Boolean(option.required));

        return o;
      });
    }

    else {
      throw new Error(
        `Unsupported option type ${option.type} in command ${commandData.name}.`
      );
    }
  }

  return subcommand;
}

/**
 * Build a subcommand group.
 *
 * Example:
 *
 * /admin blacklist add
 * /admin blacklist remove
 * /admin blacklist list
 */
function buildSubcommandGroup(commandData) {
  const group = new SlashCommandSubcommandGroupBuilder()
    .setName(commandData.name)
    .setDescription(
      commandData.description || `Manage ${commandData.name}`
    );

  for (const subcommandData of commandData.options || []) {
    if (subcommandData.type !== 1) {
      continue;
    }

    const subcommand = new SlashCommandSubcommandBuilder()
      .setName(subcommandData.name)
      .setDescription(
        subcommandData.description ||
        `Run ${subcommandData.name}`
      );

    for (const option of subcommandData.options || []) {
      /*
       * Reuse the normal option conversion by creating
       * a temporary command definition.
       */
      const tempCommand = buildSubcommand({
        name: subcommandData.name,
        description: subcommandData.description,
        options: subcommandData.options || []
      });

      /*
       * The temporary builder already contains all options.
       * Convert it to JSON and rebuild the actual subcommand.
       */
      const json = tempCommand.toJSON();

      const rebuilt = new SlashCommandSubcommandBuilder()
        .setName(json.name)
        .setDescription(json.description);

      for (const jsonOption of json.options || []) {
        if (jsonOption.type === 3) {
          rebuilt.addStringOption(o => {
            o.setName(jsonOption.name)
              .setDescription(jsonOption.description)
              .setRequired(Boolean(jsonOption.required));

            if (
              jsonOption.min_length !== undefined &&
              typeof o.setMinLength === 'function'
            ) {
              o.setMinLength(jsonOption.min_length);
            }

            if (
              jsonOption.max_length !== undefined &&
              typeof o.setMaxLength === 'function'
            ) {
              o.setMaxLength(jsonOption.max_length);
            }

            return o;
          });
        }

        else if (jsonOption.type === 6) {
          rebuilt.addUserOption(o => {
            o.setName(jsonOption.name)
              .setDescription(jsonOption.description)
              .setRequired(Boolean(jsonOption.required));

            return o;
          });
        }

        else if (jsonOption.type === 4) {
          rebuilt.addIntegerOption(o => {
            o.setName(jsonOption.name)
              .setDescription(jsonOption.description)
              .setRequired(Boolean(jsonOption.required));

            if (jsonOption.min_value !== undefined) {
              o.setMinValue(jsonOption.min_value);
            }

            if (jsonOption.max_value !== undefined) {
              o.setMaxValue(jsonOption.max_value);
            }

            return o;
          });
        }
      }

      /*
       * Only add once.
       */
      group.addSubcommand(rebuilt);

      /*
       * The complete subcommand has already been added,
       * so stop processing this loop iteration.
       */
      break;
    }
  }

  return group;
}

/**
 * Build /promo
 */
function buildPromoCommand() {
  const command = new SlashCommandBuilder()
    .setName('promo')
    .setDescription(
      'Manage educational promotion simulations'
    );

  for (const name of PROMO_COMMANDS) {
    const data = loadCommand('promo', name);

    command.addSubcommand(
      buildSubcommand(data)
    );
  }

  return command;
}

/**
 * Build /server
 */
function buildServerCommand() {
  const command = new SlashCommandBuilder()
    .setName('server')
    .setDescription(
      'View registered server information'
    );

  for (const name of SERVER_COMMANDS) {
    const data = loadCommand('server', name);

    command.addSubcommand(
      buildSubcommand(data)
    );
  }

  return command;
}

/**
 * Build /admin
 */
function buildAdminCommand() {
  const command = new SlashCommandBuilder()
    .setName('admin')
    .setDescription(
      'Manage simulator administration'
    );

  /*
   * /admin settings
   */
  const settings = loadCommand(
    'admin',
    'settings'
  );

  command.addSubcommand(
    buildSubcommand(settings)
  );

  /*
   * /admin blacklist add
   * /admin blacklist remove
   * /admin blacklist list
   */
  const blacklist = loadCommand(
    'admin',
    'blacklist'
  );

  command.addSubcommandGroup(
    buildSubcommandGroup(blacklist)
  );

  return command;
}

/**
 * Deploy commands.
 */
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

  console.log(
    'Building Souvion Promo slash commands...'
  );

  const commands = [
    buildPromoCommand().toJSON(),
    buildServerCommand().toJSON(),
    buildAdminCommand().toJSON()
  ];

  console.log(
    `Prepared ${commands.length} top-level commands.`
  );

  const rest = new REST({
    version: '10'
  }).setToken(
    config.discordToken
  );

  console.log(
    'Deploying commands to Discord...'
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
    'Successfully deployed Souvion Promo commands.'
  );

  console.log('');
  console.log('/promo');
  console.log('  /promo create');
  console.log('  /promo preview');
  console.log('  /promo start');
  console.log('  /promo pause');
  console.log('  /promo resume');
  console.log('  /promo cancel');
  console.log('  /promo recover');
  console.log('  /promo status');
  console.log('  /promo history');

  console.log('');
  console.log('/server');
  console.log('  /server list');
  console.log('  /server stats');

  console.log('');
  console.log('/admin');
  console.log('  /admin settings');
  console.log('  /admin blacklist add');
  console.log('  /admin blacklist remove');
  console.log('  /admin blacklist list');
}

main().catch(error => {
  console.error(
    'Slash command deployment failed.'
  );

  console.error(
    error?.stack || error
  );

  process.exit(1);
});
