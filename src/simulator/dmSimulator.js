const {generate}=require('./resultGenerator');
class DMSimulator{
 constructor({logRepo,blacklistRepo}){this.logRepo=logRepo;this.blacklistRepo=blacklistRepo;}
 async process({campaign,user,batchNumber,sourceGuildId}){
   const key=`${campaign.campaign_id}:${user.user_id}`;const existing=await this.logRepo.findByKey(key);if(existing&&['simulated','skipped','failed','duplicate'].includes(existing.status))return generate({campaign,user,batchNumber,status:'duplicate',reasonCode:'DUPLICATE',reasonMessage:'Idempotency key already has a terminal record'});
   const blacklist=await this.blacklistRepo.list();if(blacklist.some(x=>x.user_id===user.user_id))return generate({campaign,user,batchNumber,status:'skipped',reasonCode:'BLACKLISTED',reasonMessage:'User is blacklisted'});
   // SAFETY BOUNDARY: this class never calls Discord DM APIs. It only returns a simulated record.
   return generate({campaign,user,batchNumber,status:'simulated',reasonCode:'SIMULATION_ONLY',reasonMessage:'Educational simulation; no Discord message was sent'});
 }
}
module.exports={DMSimulator};
