const { EmbedBuilder } = require('discord.js');
const { truncate } = require('./formatters');

function infoEmbed(
  title,
  fields = [],
  description = null
) {
  const embed = new EmbedBuilder()
    .setTitle(String(title))
    .setTimestamp();

  // Description থাকলেই setDescription করবে
  if (
    description !== null &&
    description !== undefined &&
    String(description).trim().length > 0
  ) {
    embed.setDescription(
      String(description)
    );
  }

  for (const field of fields) {

    if (
      !field ||
      field.name === undefined ||
      field.value === undefined
    ) {
      continue;
    }

    const value =
      truncate(
        String(field.value),
        1024
      );

    embed.addFields({
      name: String(field.name),
      value: value || '—',
      inline:
        field.inline ?? true
    });
  }

  return embed;
}

module.exports = {
  infoEmbed
};
