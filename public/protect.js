// ping a protected endpoint to verify session
(async ()=>{
  const res = await fetch('/api/farmers');
  if(res.status===401){ location.href='/login.html'; }
})();
document.getElementById('logout')?.addEventListener('click', async ()=>{
  await fetch('/api/logout',{method:'POST'});
  location.href='/login.html';
});
document.getElementById('download')?.addEventListener('click', ()=>{
  location.href='/api/farmers-export';
});
