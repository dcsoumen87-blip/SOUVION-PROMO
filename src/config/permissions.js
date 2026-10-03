function isBotOwner(userId, config) { return userId === config.botOwnerId; }
function isServerAdmin(interaction) { return Boolean(interaction.memberPermissions?.has('Administrator')) || interaction.guild?.ownerId === interaction.user.id; }
function requireBotOwner(interaction, config) { return isBotOwner(interaction.user.id, config); }
function requireServerManager(interaction, config) { return isBotOwner(interaction.user.id, config) || isServerAdmin(interaction); }
module.exports = { isBotOwner, isServerAdmin, requireBotOwner, requireServerManager };
