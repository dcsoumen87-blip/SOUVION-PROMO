const logger=require('../utils/logger');
module.exports=async(guild,ctx)=>{await ctx.serverService.registerGuild(guild);logger.info('Guild registered',{guildId:guild.id,guildName:guild.name});};
