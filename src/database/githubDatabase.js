const path=require('node:path');
const fs=require('node:fs/promises');
const {GitHubService}=require('../services/githubService');
const {AppError}=require('../utils/errors');
const FILES=['servers.json','members.json','campaigns.json','checkpoints.json','delivery_logs.json','blacklist.json','settings.json'];
class GitHubDatabase{
  constructor(config,{githubService=null,localMode=false,dataDir=null}={}){this.config=config;this.github=githubService||new GitHubService(config.github);this.localMode=localMode;this.dataDir=dataDir||config.dataDir;this.locks=new Map();}
  file(name){if(!FILES.includes(name))throw new AppError(`Unsupported database file: ${name}`,'INVALID_FILE');return `data/${name}`;}
  async init(){if(this.localMode){await fs.mkdir(this.dataDir,{recursive:true});for(const f of FILES){const p=path.join(this.dataDir,f);try{await fs.access(p)}catch{await fs.writeFile(p,f==='settings.json'?JSON.stringify({default_batch_size:25,dashboard_enabled:true,max_batch_size:100,simulator_only:true},null,2):'[]');}}return;} for(const f of FILES) await this.github.ensureJson(this.file(f),f==='settings.json'?{default_batch_size:25,dashboard_enabled:true,max_batch_size:100,simulator_only:true}:[]);}
  async read(name){if(this.localMode){const raw=await fs.readFile(path.join(this.dataDir,name),'utf8');return JSON.parse(raw);}return (await this.github.getJson(this.file(name)))?.json;}
  async update(name,mutator){ if(this.localMode){return this.withLock(name,async()=>{const current=await this.read(name);const next=await mutator(structuredClone(current));await fs.writeFile(path.join(this.dataDir,name),JSON.stringify(next,null,2));return next;});} return this.github.updateJson(this.file(name),mutator); }
  async withLock(key,fn){const prev=this.locks.get(key)||Promise.resolve();let release;const current=new Promise(r=>release=r);this.locks.set(key,current);await prev;try{return await fn();}finally{release();if(this.locks.get(key)===current)this.locks.delete(key);}}
}
module.exports={GitHubDatabase,FILES};
