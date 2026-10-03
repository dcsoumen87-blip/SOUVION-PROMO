const {
  requireServerManager
} = require('../config/permissions');

module.exports = async (
  interaction,
  ctx,
  commands
) => {

  try {

    // ========================================
    // CHAT INPUT COMMANDS
    // ========================================

    if (
      interaction.isChatInputCommand()
    ) {

      let key;


      // ======================================
      // PROMO
      // /promo create
      // /promo test_dm
      // ======================================

      if (
        interaction.commandName === 'promo'
      ) {

        const subcommand =
          interaction.options.getSubcommand();

        key =
          `promo:${subcommand}`;
      }


      // ======================================
      // SERVER
      // /server list
      // /server stats
      // ======================================

      else if (
        interaction.commandName === 'server'
      ) {

        const subcommand =
          interaction.options.getSubcommand();

        key =
          `server:${subcommand}`;
      }


      // ======================================
      // ADMIN
      // /admin settings
      // /admin blacklist add
      // /admin blacklist remove
      // /admin blacklist list
      // ======================================

      else if (
        interaction.commandName === 'admin'
      ) {

        const group =
          interaction.options
            .getSubcommandGroup(false);


        // ------------------------------
        // /admin blacklist ...
        // ------------------------------

        if (
          group === 'blacklist'
        ) {

          key =
            'admin:blacklist';

        }


        // ------------------------------
        // /admin settings
        // ------------------------------

        else {

          const subcommand =
            interaction.options.getSubcommand();

          key =
            `admin:${subcommand}`;
        }
      }


      // ======================================
      // OTHER COMMAND
      // ======================================

      else {

        key =
          interaction.commandName;
      }


      // ======================================
      // FIND COMMAND
      // ======================================

      const command =
        commands.get(key);


      if (!command) {

        return interaction.reply({
          content:
            '❌ Command handler not found.',
          ephemeral: true
        });

      }


      // ======================================
      // DEFER IMMEDIATELY
      // Prevent Discord 3-second timeout
      // ======================================

      await interaction.deferReply({
        ephemeral: true
      });


      // ======================================
      // COMMAND PROXY
      // Converts reply() → editReply()
      // ======================================

      const proxy =
        new Proxy(
          interaction,
          {

            get(
              target,
              property
            ) {

              // --------------------------------
              // reply()
              // --------------------------------

              if (
                property === 'reply'
              ) {

                return async (
                  options = {}
                ) => {

                  return target.editReply(
                    options
                  );

                };
              }


              // --------------------------------
              // followUp()
              // --------------------------------

              if (
                property === 'followUp'
              ) {

                return async (
                  options = {}
                ) => {

                  return target.followUp(
                    options
                  );

                };
              }


              // --------------------------------
              // Default properties
              // --------------------------------

              return Reflect.get(
                target,
                property,
                target
              );

            }

          }
        );


      // ======================================
      // EXECUTE COMMAND
      // ======================================

      return await command.execute(
        proxy,
        ctx
      );
    }


    // ========================================
    // BUTTON INTERACTIONS
    // ========================================

    if (
      interaction.isButton()
    ) {

      const [
        scope,
        action,
        id
      ] =
        interaction.customId.split(':');


      // --------------------------------------
      // Only promo buttons
      // --------------------------------------

      if (
        scope !== 'promo'
      ) {

        return;

      }


      // --------------------------------------
      // Permission check
      // --------------------------------------

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


      // --------------------------------------
      // Defer button interaction
      // --------------------------------------

      await interaction.deferUpdate();


      // --------------------------------------
      // Get campaign
      // --------------------------------------

      const campaign =
        await ctx.campaignService.get(id);


      if (!campaign) {

        return interaction.editReply({
          content:
            `❌ Campaign ${id} not found.`,
          embeds: [],
          components: []
        });

      }


      // ======================================
      // CANCEL
      // ======================================

      if (
        action === 'cancel'
      ) {

        await ctx.campaignService.setStatus(
          id,
          'cancelled',
          {
            cancelled_at:
              new Date().toISOString()
          }
        );


        return interaction.editReply({

          content:
            `🛑 ${id} cancelled.`,

          embeds: [],

          components: []

        });
      }


      // ======================================
      // START
      // ======================================

      if (
        action === 'start'
      ) {

        // ------------------------------------
        // Validate status
        // ------------------------------------

        if (
          ![
            'draft',
            'preview',
            'paused',
            'recovering'
          ].includes(
            campaign.status
          )
        ) {

          return interaction.editReply({

            content:
              `Campaign cannot be started from status ${campaign.status}.`,

            embeds: [],

            components: []

          });
        }


        // ------------------------------------
        // Generate preview
        // ------------------------------------

        const preview =
          await ctx.campaignService.preview(
            id
          );


        // ------------------------------------
        // Get checkpoint
        // ------------------------------------

        const checkpoint =
          await ctx.campaignService
            .getLatestCheckpoint(id);


        // ------------------------------------
        // Initialize checkpoint
        // ------------------------------------

        if (
          !checkpoint ||
          checkpoint.total_batches === 0
        ) {

          await ctx.campaignService
            .initializeCheckpoint(
              campaign,
              preview.total_users,
              preview.total_batches
            );

        }


        // ------------------------------------
        // Set running
        // ------------------------------------

        await ctx.campaignService.setStatus(
          id,
          'running',
          {
            started_at:
              campaign.started_at ||
              new Date().toISOString()
          }
        );


        // ------------------------------------
        // Start queue
        // ------------------------------------

        await ctx.queueService.enqueue(
          id,
          false
        );


        // ------------------------------------
        // Response
        // ------------------------------------

        return interaction.editReply({

          content:
            `▶️ ${id} started in simulation mode. No Discord DMs will be sent.`,

          embeds: [],

          components: []

        });
      }


      // ======================================
      // UNKNOWN ACTION
      // ======================================

      return interaction.editReply({

        content:
          `❌ Unknown campaign action: ${action}`,

        embeds: [],

        components: []

      });
    }

  }


  // ========================================
  // ERROR HANDLER
  // ========================================

  catch (error) {

    ctx.logger.error(
      'Interaction failed',
      {
        error: error.message,
        stack: error.stack
      }
    );


    const payload = {

      content:
        `❌ Error: ${error.message}`,

      ephemeral: true

    };


    try {

      // --------------------------------------
      // Already deferred/replied
      // --------------------------------------

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        return await interaction.editReply(
          payload
        );

      }


      // --------------------------------------
      // Not acknowledged yet
      // --------------------------------------

      return await interaction.reply(
        payload
      );

    }

    catch (replyError) {

      ctx.logger.error(
        'Failed to send interaction error',
        {
          error:
            replyError.message
        }
      );

    }

  }

};
