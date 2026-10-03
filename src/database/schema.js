const schemas={
 server:{required:['guild_id','guild_name','owner_id','enabled','created_at']},
 campaign:{required:['campaign_id','name','source_guild_id','target_guild_ids','message','batch_size','status','created_at','updated_at']},
 checkpoint:{required:['checkpoint_id','campaign_id','version','status','current_batch','last_completed_batch','total_batches','total_users','processed_users','simulated_users','skipped_users','failed_users','started_at','updated_at','checkpoint_at']},
 delivery:{required:['delivery_id','campaign_id','user_id','batch_number','status','reason_code','idempotency_key','attempt','created_at','updated_at']}
};
module.exports={schemas};
