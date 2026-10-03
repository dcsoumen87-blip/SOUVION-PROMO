const { ConflictError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

class GitHubService {
  constructor(config, fetchImpl = fetch) { this.config=config; this.fetch=fetchImpl; this.base='https://api.github.com'; }
  url(file){ return `${this.base}/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/contents/${file}`; }
  headers(){ return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${this.config.token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'}; }
  async request(url, options={}, retries=3){
    let delay=250;
    for(let attempt=1;attempt<=retries;attempt++){
      try{ const r=await this.fetch(url,{...options,headers:{...this.headers(),...(options.headers||{})}}); if(r.status===409||r.status===412) throw new ConflictError('GitHub SHA/version conflict'); if(r.status===429||r.status>=500){ if(attempt===retries) throw new AppError(`GitHub request failed with ${r.status}`,'GITHUB_RETRY_EXHAUSTED'); await new Promise(x=>setTimeout(x,delay)); delay*=2; continue; } if(!r.ok){const t=await r.text(); throw new AppError(`GitHub API error ${r.status}: ${t}`,'GITHUB_API_ERROR');} return r.status===204?null:r.json(); } catch(err){ if(err.code==='CONFLICT') throw err; if(attempt===retries) throw err; await new Promise(x=>setTimeout(x,delay)); delay*=2; }
    }
  }
  async getJson(file){
    try{ const data=await this.request(this.url(file),{method:'GET'}); const raw=Buffer.from(data.content.replace(/\n/g,''),'base64').toString('utf8'); let json; try{json=JSON.parse(raw);}catch(e){throw new AppError(`Invalid JSON in GitHub file ${file}`,'CORRUPT_JSON');} return {json,sha:data.sha}; }
    catch(err){ if(err.code==='GITHUB_API_ERROR' && /404/.test(err.message)) return null; throw err; }
  }
  async getFileSha(file){ const x=await this.getJson(file); return x?.sha||null; }
  async putJson(file,json,sha,message){ if(json===undefined) throw new AppError('Refusing to write undefined JSON','INVALID_WRITE'); const body=JSON.stringify(json,null,2)+'\n'; const payload={message,content:Buffer.from(body).toString('base64'),branch:this.config.branch}; if(sha)payload.sha=sha; const r=await this.request(this.url(file),{method:'PUT',body:JSON.stringify(payload)}); logger.info('GitHub JSON committed',{file,commit:r?.commit?.sha}); return r; }
  async ensureJson(file,defaultValue){ const existing=await this.getJson(file); if(existing)return existing; await this.putJson(file,defaultValue,null,`chore: initialize ${file}`); return this.getJson(file); }
  async updateJson(file,mutator,{message=`chore: update ${file}`,retries=5}={}){
    for(let attempt=1;attempt<=retries;attempt++){
      const current=await this.getJson(file); const base=current?.json ?? []; const sha=current?.sha ?? null; const next=await mutator(structuredClone(base)); if(next===undefined) throw new AppError('Mutator returned undefined','INVALID_WRITE');
      try{ await this.putJson(file,next,sha,message); return next; } catch(err){ if(err.code!=='CONFLICT'||attempt===retries) throw err; logger.warn('GitHub conflict; refetching latest data',{file,attempt}); await new Promise(x=>setTimeout(x,150*attempt)); }
    }
    throw new AppError('GitHub update exhausted retries','GITHUB_WRITE_FAILED');
  }
}
module.exports={GitHubService};
