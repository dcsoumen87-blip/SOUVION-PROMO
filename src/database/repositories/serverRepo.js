class ServerRepo{constructor(db){this.db=db;} list(){return this.db.read('servers.json');} async upsert(s){return this.db.update('servers.json',a=>{const i=a.findIndex(x=>x.guild_id===s.guild_id);if(i<0)a.push(s);else a[i]={...a[i],...s};return a;});} async get(id){return (await this.list()).find(x=>x.guild_id===id)||null;}}
module.exports={ServerRepo};
