let seq=0;
function deliveryId(){seq+=1;return `DLV-${String(seq).padStart(6,'0')}`;}
function generate({campaign,user,batchNumber,status='simulated',reasonCode='SIMULATION_ONLY',reasonMessage='Educational simulation'}){const now=new Date().toISOString();return {delivery_id:deliveryId(),campaign_id:campaign.campaign_id,user_id:user.user_id,source_guild_id:campaign.source_guild_id,target_guild_id:user.guild_id,batch_number:batchNumber,status,reason_code:reasonCode,reason_message:reasonMessage,idempotency_key:`${campaign.campaign_id}:${user.user_id}`,attempt:1,created_at:now,updated_at:now};}
module.exports={generate};
