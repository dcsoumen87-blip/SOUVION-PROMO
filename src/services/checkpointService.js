const {validateCheckpoint,validateBatchState}=require('../utils/validators');
const {ValidationError}=require('../utils/errors');
class CheckpointService{
 constructor({checkpointRepo}){this.repo=checkpointRepo;}
 async latestValid(campaignId){const cp=await this.repo.latest(campaignId);if(!cp)return null;const v=validateCheckpoint(cp);if(!v.valid)throw new ValidationError(`Invalid checkpoint ${cp.checkpoint_id}`,{errors:v.errors});return cp;}
 async persist(cp){const v=validateCheckpoint(cp);if(!v.valid)throw new ValidationError('Refusing invalid checkpoint',{errors:v.errors});return this.repo.save(cp);}
 validateBatch(cp){const v=validateBatchState(cp);if(!v.valid)throw new ValidationError('Invalid batch state',{errors:v.errors});return true;}
}
module.exports={CheckpointService};
