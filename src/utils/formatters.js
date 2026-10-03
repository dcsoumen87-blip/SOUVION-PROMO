function fmt(n){return Number(n||0).toLocaleString('en-IN');}
function duration(ms){if(ms<1000)return `${ms}ms`; const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60); return h?`${h}h ${m%60}m`:m?`${m}m ${s%60}s`:`${s}s`;}
function truncate(s,n=1000){return String(s||'').length>n?`${String(s).slice(0,n-1)}…`:String(s||'');}
module.exports={fmt,duration,truncate};
