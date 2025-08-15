async function api(path, opts={}){
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type':'application/json' }}, opts));
  if (res.status === 401) { location.href = '/login.html'; return { ok:false }; }
  try { return await res.json(); } catch(e){ return { ok:false }; }
}
function fmtMoney(n){ return '₹' + (Number(n||0).toLocaleString('en-IN')); }
function fmtDate(s){ const d=new Date(s); return d.toLocaleDateString()+' '+d.toLocaleTimeString(); }
