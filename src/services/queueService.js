const crypto=require('node:crypto');
const logger=require('../utils/logger');
const {chunk}=require('./batchService');
class QueueService{
 constructor({campaignService,memberService,logRepo,checkpointService,simulator,config}){Object.assign(this,{campaignService,memberService,logRepo,checkpointService,simulator,config});this.queue=[];this.running=false;this.active=new Map();this.locks=new Map();this.shutdownRequested=false;}
 async enqueue(campaignId,recovery=false){if(this.active.has(campaignId)||this.queue.some(x=>x.id===campaignId))return false;this.queue.push({id:campaignId,recovery});this.pump();return true;}
 requestShutdown(){this.shutdownRequested=true;}
 async pump(){if(this.running||this.shutdownRequested)return;this.running=true;try{while(this.queue.length&&!this.shutdownRequested){const job=this.queue.shift();await this.run(job.id,job.recovery);}}finally{this.running=false;}}
 async persistProgress(id, cp){const logs=await this.logRepo.list();const campLogs=logs.filter(x=>x.campaign_id===id&&['simulated','skipped','failed','duplicate'].includes(x.status));const ids=[...new Set(campLogs.map(x=>x.user_id))];cp.processed_user_ids=ids;cp.processed_users=ids.length;cp.simulated_users=campLogs.filter(x=>x.status==='simulated').length;cp.skipped_users=campLogs.filter(x=>x.status==='skipped'||x.status==='duplicate').length;cp.failed_users=campLogs.filter(x=>x.status==='failed').length;cp.last_processed_user_id=ids.at(-1)||null;cp.updated_at=new Date().toISOString();cp.checkpoint_at=cp.updated_at;this.checkpointService.validateBatch(cp);await this.checkpointService.persist(cp);}
 async run(id,recovery=false){const existingLock=this.locks.get(id);if(existingLock&&existingLock.expiresAt>Date.now())return;if(existingLock)this.locks.delete(id);const workerId=`WORKER-${crypto.randomUUID()}`;const currentCampaign=await this.campaignService.get(id);const lock=currentCampaign.lock;if(lock&&lock.expires_at&&Date.parse(lock.expires_at)>Date.now()&&lock.worker_id!==workerId)return;await this.campaignService.campaignRepo.update(id,{lock:{worker_id:workerId,locked_at:new Date().toISOString(),expires_at:new Date(Date.now()+10*60_000).toISOString()}});this.locks.set(id,{workerId,lockedAt:Date.now(),expiresAt:Date.now()+10*60_000});this.active.set(id,true);try{let c=await this.campaignService.get(id);let cp=await this.campaignService.getLatestCheckpoint(id);if(!cp)throw new Error('Missing valid checkpoint');if(recovery){c=await this.campaignService.setStatus(id,'recovering',{recovered_by:workerId});}
      const users=await this.memberService.eligible(c.target_guild_ids);const terminal=await this.logRepo.list();const done=new Set(terminal.filter(x=>x.campaign_id===id&&['simulated','skipped','failed','duplicate'].includes(x.status)).map(x=>x.user_id));const chunks=chunk(users.filter(u=>!done.has(u.user_id)),c.batch_size);const totalUsers=users.length;const totalBatches=Math.ceil(totalUsers/c.batch_size);
      if(totalBatches===0){if(!cp||cp.total_batches!==0)cp=await this.campaignService.initializeCheckpoint(c,0,0);await this.campaignService.setStatus(id,'completed',{completed_at:new Date().toISOString()});return;}
      if(cp.total_batches!==totalBatches) throw new Error(`Checkpoint total_batches mismatch: ${cp.total_batches} != ${totalBatches}`);
      if(cp.last_completed_batch===totalBatches && cp.current_batch===null){await this.campaignService.setStatus(id,'completed',{completed_at:c.completed_at||new Date().toISOString(),worker_id:null});return;}
      if(c.status==='paused'||c.status==='cancelled')return;
      await this.campaignService.setStatus(id,'running',{worker_id:workerId});
      // Rebuild remaining work by batch based on authoritative user order and delivery logs.
      const allById=new Map(users.map(u=>[u.user_id,u]));
      for(let batchNumber=cp.last_completed_batch+1;batchNumber<=totalBatches;batchNumber++){
        if(this.shutdownRequested)break;
        c=await this.campaignService.get(id); if(c.status==='paused'||c.status==='cancelled')break; if(c.status==='cancelling'){await this.campaignService.setStatus(id,'cancelled',{cancelled_at:new Date().toISOString()});break;}
        cp=await this.campaignService.getLatestCheckpoint(id); if(!cp)throw new Error('Missing checkpoint during processing');
        const fullBatch=users.slice((batchNumber-1)*c.batch_size,batchNumber*c.batch_size);
        const currentDone=new Set((await this.logRepo.list()).filter(x=>x.campaign_id===id&&['simulated','skipped','failed','duplicate'].includes(x.status)).map(x=>x.user_id));
        const batchUsers=fullBatch.filter(u=>!currentDone.has(u.user_id));
        cp.current_batch=batchNumber;cp.status='running';cp.updated_at=new Date().toISOString();this.checkpointService.validateBatch(cp);
        for(const user of batchUsers){if(this.shutdownRequested)break;const campaign=await this.campaignService.get(id);if(campaign.status==='paused'||campaign.status==='cancelled'||campaign.status==='cancelling')break;const result=await this.simulator.process({campaign,user,batchNumber,sourceGuildId:c.source_guild_id});await this.logRepo.append(result);}
        if(this.shutdownRequested){await this.persistProgress(id,cp);break;}
        c=await this.campaignService.get(id);if(['paused','cancelled','cancelling'].includes(c.status))break;
        const logs=await this.logRepo.list();const campLogs=logs.filter(x=>x.campaign_id===id&&['simulated','skipped','failed','duplicate'].includes(x.status));const ids=[...new Set(campLogs.map(x=>x.user_id))];cp.processed_user_ids=ids;cp.processed_users=ids.length;cp.simulated_users=campLogs.filter(x=>x.status==='simulated').length;cp.skipped_users=campLogs.filter(x=>x.status==='skipped'||x.status==='duplicate').length;cp.failed_users=campLogs.filter(x=>x.status==='failed').length;cp.last_processed_user_id=ids.at(-1)||null;cp.last_completed_batch=batchNumber;cp.current_batch=batchNumber<totalBatches?batchNumber+1:null;cp.version+=1;cp.status=batchNumber===totalBatches?'completed':'running';cp.updated_at=new Date().toISOString();cp.checkpoint_at=cp.updated_at;this.checkpointService.validateBatch(cp);await this.checkpointService.persist(cp);logger.info(`Batch ${batchNumber} completed`,{campaignId:id});
        if(batchNumber===totalBatches){await this.campaignService.setStatus(id,'completed',{completed_at:new Date().toISOString(),worker_id:null});}
      }
    }catch(err){logger.error('Campaign worker failed',{campaignId:id,error:err.message});try{await this.campaignService.setStatus(id,'failed',{error:err.message,error_at:new Date().toISOString()});}catch(e){logger.error('Failed to persist campaign failure',{campaignId:id,error:e.message});}}
    finally{this.active.delete(id);this.locks.delete(id);try{const latest=await this.campaignService.get(id);if(latest.lock?.worker_id===workerId)await this.campaignService.campaignRepo.update(id,{lock:null});}catch(e){logger.warn('Campaign lock release failed',{campaignId:id,error:e.message});}}
 }
}
module.exports={QueueService};
