const {generate}=require('./resultGenerator');
class DeliverySimulator{constructor({logRepo}){this.logRepo=logRepo;}async simulate({campaign,user,batchNumber}){return generate({campaign,user,batchNumber});}}
module.exports={DeliverySimulator};
