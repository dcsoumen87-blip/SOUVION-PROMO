const logger=require('../utils/logger');
class ServerService{
  constructor({serverRepo,memberRepo}){this.serverRepo=serverRepo;this.memberRepo=memberRepo;}
  async registerGuild(guild){const record={guild_id:guild.id,guild_name:guild.name,owner_id:guild.ownerId,enabled:true,created_at:new Date().toISOString()};await this.serverRepo.upsert(record);return record;}
  async syncGuildMembers(guild){try{const members=await guild.members.fetch();const rows=[...members.values()].filter(m=>!m.user.bot).map(m=>({guild_id:guild.id,user_id:m.id,username:m.user.username,display_name:m.displayName||m.user.username,updated_at:new Date().toISOString()}));await this.memberRepo.replaceForGuild(guild.id,rows);return rows.length;}catch(err){logger.warn('Member sync failed; simulation may use existing data',{guildId:guild.id,error:err.message});return 0;}}
  async listServers(){return this.serverRepo.list();}
}
module.exports={ServerService};
