const logger=require('../utils/logger');
class RecoveryService{
 constructor({campaignRepo,checkpointService,queueService,logRepo}){Object.assign(this,{campaignRepo,checkpointService,queueService,logRepo});}
 async scan(){const campaigns=await this.campaignRepo.list();const recoverable=[];for(let c of campaigns.filter(x=>['running','recovering','cancelling'].includes(x.status))){try{const cp=await this.checkpointService.latestValid(c.campaign_id);if(!cp)throw new Error('No valid checkpoint');if(c.status==='running'){await this.campaignRepo.update(c.campaign_id,{status:'recovering',recovery_count:(c.recovery_count||0)+1,recovery_started_at:new Date().toISOString()});c={...c,status:'recovering'};} recoverable.push({campaign:c,checkpoint:cp});}catch(err){await this.campaignRepo.update(c.campaign_id,{status:'failed',recovery_error:err.message,recovery_error_at:new Date().toISOString()});logger.error('Recovery validation failed',{campaignId:c.campaign_id,error:err.message});}}return recoverable;}
 async recover(id){const c=await this.campaignRepo.get(id);if(!c)throw new Error('Campaign not found');const cp=await this.checkpointService.latestValid(id);if(!cp)throw new Error('No valid checkpoint');await this.campaignRepo.update(id,{status:'recovering',recovery_count:(c.recovery_count||0)+1});await this.queueService.enqueue(id,true);return cp;}
}
module.exports={RecoveryService};
