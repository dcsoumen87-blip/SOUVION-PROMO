const { SlashCommandBuilder } = require('discord.js');
const { requireBotOwner } = require('../../config/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test_dm')
    .setDescription('Send a test DM to the bot owner'),

  async execute(interaction, ctx) {
    if (!requireBotOwner(interaction, ctx.config)) {
      return interaction.reply({
        content: '❌ Bot owner only.',
        ephemeral: true
      });
    }

    try {
      await interaction.user.send(
        [
          '🧪 **SOUVION PROMO TEST**',
          '',
          '✅ Discord DM delivery is working.',
          '✅ Bot connection is working.',
          '✅ Owner-only test completed.',
          '',
          'No campaign members were contacted.'
        ].join('\n')
      );

      return interaction.reply({
        content: '✅ Test DM sent successfully.',
        ephemeral: true
      });

    } catch (error) {
      ctx.logger.error('Test DM failed', {
        error: error.message
      });

      return interaction.reply({
        content: `❌ Test DM failed: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
