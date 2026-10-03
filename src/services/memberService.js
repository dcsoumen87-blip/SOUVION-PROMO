class MemberService{
  constructor({memberRepo,blacklistRepo}){this.memberRepo=memberRepo;this.blacklistRepo=blacklistRepo;}
  async eligible(targetGuildIds){const blacklist=new Set((await this.blacklistRepo.list()).map(x=>x.user_id));const users=await this.memberRepo.getEligible(targetGuildIds);return users.map(u=>({...u,blacklisted:blacklist.has(u.user_id)}));}
}
module.exports={MemberService};
