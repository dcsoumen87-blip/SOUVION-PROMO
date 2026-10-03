const { EmbedBuilder } = require('discord.js');
const { truncate } = require('./formatters');
function infoEmbed(title, fields=[], description=''){ const e=new EmbedBuilder().setTitle(title).setDescription(description).setTimestamp(); for(const f of fields)e.addFields({name:f.name,value:truncate(f.value,1024),inline:f.inline??true}); return e; }
module.exports={infoEmbed};
