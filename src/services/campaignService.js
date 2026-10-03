const crypto=require('node:crypto');
const {validateCampaign,validateCampaignState}=require('../utils/validators');
const {ValidationError}=require('../utils/errors');
function now(){return new Date().toISOString();}
function batches(total,size){return Math.ceil(total/size);}
class CampaignService{
 constructor({campaignRepo,checkpointRepo,memberService,logRepo,checkpointService}){Object.assign(this,{campaignRepo,checkpointRepo,memberService,logRepo,checkpointService});}
 async create({name,message,sourceGuildId,targetGuildIds,batchSize}){if(!name||!message||!sourceGuildId||!targetGuildIds?.length)throw new ValidationError('Campaign name, message, source guild and target servers are required');const id=`CMP-${crypto.randomInt(100000,999999)}`;const t=now();const c={campaign_id:id,name,source_guild_id:sourceGuildId,target_guild_ids:[...new Set(targetGuildIds)],message,batch_size:batchSize,status:'draft',created_at:t,updated_at:t,recovery_count:0};const v=validateCampaign(c);if(!v.valid)throw new ValidationError('Invalid campaign',{errors:v.errors});await this.campaignRepo.create(c);return c;}
 async preview(id){const c=await this.get(id);const users=await this.memberService.eligible(c.target_guild_ids);const total=users.length;const totalB=batches(total,c.batch_size);return {campaign:c,total_users:total,total_batches:totalB,eligible_users:users};}
 async get(id){const c=await this.campaignRepo.get(id);if(!c)throw new ValidationError(`Campaign ${id} not found`);return c;}
 async setStatus(id,status,extra={}){const allowed=['draft','preview','running','paused','cancelling','cancelled','completed','failed','recovering'];if(!allowed.includes(status))throw new ValidationError(`Invalid campaign status ${status}`);return this.campaignRepo.update(id,{status,...extra});}
 async initializeCheckpoint(c,totalUsers,totalBatches){const t=now();const cp={checkpoint_id:`CHK-${crypto.randomInt(100000,999999)}`,campaign_id:c.campaign_id,version:1,status:totalBatches===0?'completed':'running',current_batch:totalBatches===0?null:1,last_completed_batch:0,total_batches:totalBatches,total_users:totalUsers,processed_users:0,simulated_users:0,skipped_users:0,failed_users:0,last_processed_user_id:null,processed_user_ids:[],started_at:c.started_at||t,updated_at:t,checkpoint_at:t};this.checkpointService.validateBatch(cp);await this.checkpointService.persist(cp);return cp;}
 async getLatestCheckpoint(id){return this.checkpointService.latestValid(id);}
}
module.exports={CampaignService,batches};
