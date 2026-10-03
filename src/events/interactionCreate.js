const { ButtonInteraction } = require('discord.js');
const { requireServerManager } = require('../config/permissions');

module.exports = async (interaction, ctx, commands) => {
  try {

    // =========================
    // CHAT INPUT COMMANDS
    // =========================
    if (interaction.isChatInputCommand()) {

      let key;

      if (interaction.commandName === 'promo') {

        const sub = interaction.options.getSubcommand();
        key = `promo:${sub}`;

      } else if (interaction.commandName === 'server') {

        const sub = interaction.options.getSubcommand();
        key = `server:${sub}`;

      } else if (interaction.commandName === 'admin') {

        const group =
          interaction.options.getSubcommandGroup(false);

        if (group === 'blacklist') {

          // /admin blacklist add/remove/list
          key = 'admin:blacklist';

        } else {

          // /admin settings
          const sub = interaction.options.getSubcommand();
          key = `admin:${sub}`;
        }

      } else {

        key = interaction.commandName;
      }

      const command = commands.get(key);

      if (!command) {
        return interaction.reply({
          content: 'Command handler not found.',
          ephemeral: true
        });
      }

      /*
       * Discord requires an interaction acknowledgement
       * within approximately 3 seconds.
       *
       * Some commands perform GitHub/database/member
       * operations which can take longer.
       *
       * Defer immediately, then convert command.reply()
       * into editReply().
       */

      await interaction.deferReply({
        ephemeral: true
      });

      const deferredInteraction = new Proxy(
        interaction,
        {
          get(target, property) {

            if (property === 'reply') {

              return async (options = {}) => {

                return target.editReply(options);
              };
            }

            if (property === 'followUp') {

              return async (options = {}) => {

                return target.followUp(options);
              };
            }

            return Reflect.get(
              target,
              property,
              target
            );
          }
        }
      );

      await command.execute(
        deferredInteraction,
        ctx
      );

      return;
    }


    // =========================
    // BUTTON INTERACTIONS
    // =========================
    if (interaction.isButton()) {

      const [
        scope,
        action,
        id
      ] = interaction.customId.split(':');

      if (scope !== 'promo') {
        return;
      }

      if (
        !requireServerManager(
          interaction,
          ctx.config
        )
      ) {
        return interaction.reply({
          content:
            'You need server administration permission.',
          ephemeral: true
        });
      }

      /*
       * Acknowledge button immediately because
       * campaign/database operations can take time.
       */

      await interaction.deferUpdate();

      const c =
        await ctx.campaignService.get(id);

      // =========================
      // CANCEL
      // =========================

      if (action === 'cancel') {

        await ctx.campaignService.setStatus(
          id,
          'cancelled',
          {
            cancelled_at:
              new Date().toISOString()
          }
        );

        return interaction.editReply({
          content: `🛑 ${id} cancelled.`,
          embeds: [],
          components: []
        });
      }


      // =========================
      // START
      // =========================

      if (action === 'start') {

        if (
          ![
            'draft',
            'preview',
            'paused',
            'recovering'
          ].includes(c.status)
        ) {

          return interaction.editReply({
            content:
              `Campaign cannot be started from status ${c.status}.`,
            embeds: [],
            components: []
          });
        }

        const p =
          await ctx.campaignService.preview(id);

        const cp =
          await ctx.campaignService.getLatestCheckpoint(id);

        if (
          !cp ||
          cp.total_batches === 0
        ) {

          await ctx.campaignService.initializeCheckpoint(
            c,
            p.total_users,
            p.total_batches
          );
        }

        await ctx.campaignService.setStatus(
          id,
          'running',
          {
            started_at:
              c.started_at ||
              new Date().toISOString()
          }
        );

        await ctx.queueService.enqueue(
          id,
          false
        );

        return interaction.editReply({
          content:
            `▶️ ${id} started in simulation mode. No Discord DMs will be sent.`,
          embeds: [],
          components: []
        });
      }

      return interaction.editReply({
        content: 'Unknown campaign action.',
        embeds: [],
        components: []
      });
    }

  } catch (err) {

    ctx.logger.error(
      'Interaction failed',
      {
        error: err.message,
        stack: err.stack
      }
    );

    const payload = {
      content:
        `Error: ${err.message}`,
      ephemeral: true
    };

    try {

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        return await interaction.editReply(
          payload
        );
      }

      return await interaction.reply(
        payload
      );

    } catch (replyError) {

      ctx.logger.error(
        'Failed to send interaction error',
        {
          error: replyError.message
        }
      );
    }
  }
};
