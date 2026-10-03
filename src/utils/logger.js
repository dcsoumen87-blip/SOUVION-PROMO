function write(level, message, meta = {}) {
  const safe = JSON.stringify(meta, (k,v) => /token|secret|password|authorization/i.test(k) ? '[REDACTED]' : v);
  console.log(`[${level}] ${message}${Object.keys(meta).length ? ` ${safe}` : ''}`);
}
module.exports = { info:(m,x)=>write('INFO',m,x), warn:(m,x)=>write('WARN',m,x), error:(m,x)=>write('ERROR',m,x), debug:(m,x)=>write('DEBUG',m,x) };
