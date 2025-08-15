let seeds = [];
const els = {
  name: document.getElementById('name'),
  village: document.getElementById('village'),
  phone: document.getElementById('phone'),
  pricePerTray: document.getElementById('pricePerTray'),
  seedName: document.getElementById('seedName'),
  seedTrays: document.getElementById('seedTrays'),
  seedList: document.getElementById('seedList'),
  advance: document.getElementById('advance'),
  pTrays: document.getElementById('pTrays'),
  pTotal: document.getElementById('pTotal'),
  pPay: document.getElementById('pPay'),
  pStatus: document.getElementById('pStatus'),
  list: document.getElementById('list'),
  search: document.getElementById('search'),
};

function renderSeeds(){
  els.seedList.innerHTML = '';
  seeds.forEach((s, i)=>{
    const row = document.createElement('div');
    row.className='seed-row';
    row.innerHTML = \`
      <input value="\${s.name}" data-i="\${i}" data-k="name"/>
      <input type="number" value="\${s.trays}" data-i="\${i}" data-k="trays"/>
      <button class="btn danger" data-i="\${i}">✕</button>
    \`;
    row.querySelectorAll('input').forEach(inp=>{
      inp.oninput = e => {
        const i = Number(e.target.dataset.i);
        const k = e.target.dataset.k;
        seeds[i][k] = k==='trays' ? Number(e.target.value||0) : e.target.value;
        updateTotals();
      };
    });
    row.querySelector('button').onclick = e => {
      const i = Number(e.target.dataset.i);
      seeds.splice(i,1);
      renderSeeds();
      updateTotals();
    };
    els.seedList.appendChild(row);
  });
}

function updateTotals(){
  const trays = seeds.reduce((s,x)=>s + Number(x.trays||0), 0);
  const total = trays * Number(els.pricePerTray.value||0);
  const yet = Math.max(0, total - Number(els.advance.value||0));
  els.pTrays.textContent = 'Total Trays: '+trays;
  els.pTotal.textContent = 'Total Bill: '+fmtMoney(total);
  els.pPay.textContent = 'Yet to Pay: '+fmtMoney(yet);
  els.pStatus.textContent = 'Status: ' + (yet===0 ? 'Done' : 'Pending');
}

document.getElementById('addSeed').onclick = ()=>{
  const name = els.seedName.value.trim();
  const trays = Number(els.seedTrays.value||0);
  if(!name) return;
  seeds.push({ name, trays });
  els.seedName.value=''; els.seedTrays.value='0';
  renderSeeds(); updateTotals();
};
['pricePerTray','advance'].forEach(id=>{
  document.getElementById(id).addEventListener('input', updateTotals);
});

document.getElementById('save').onclick = async ()=>{
  const payload = {
    name: els.name.value.trim(),
    village: els.village.value.trim(),
    phone: els.phone.value.trim(),
    pricePerTray: Number(els.pricePerTray.value||0),
    seeds,
    advance: Number(els.advance.value||0),
  };
  if(!payload.name || !payload.village){ alert('Name & village required'); return; }
  const r = await api('/api/farmers',{method:'POST', body: JSON.stringify(payload)});
  if(r.ok){ alert('Saved'); seeds=[]; renderSeeds(); updateTotals(); loadList(); }
  else { alert('Save failed'); }
};

async function loadList(){
  const q = els.search.value.trim();
  const res = await api('/api/farmers'+(q?('?q='+encodeURIComponent(q)) : ''));
  if(!res.ok) return;
  els.list.innerHTML = res.data.map(f=>{
    const seedStr = (f.seeds||[]).map(s=>\`\${s.name}:\${s.trays}\`).join(', ');
    return \`<div class="pill">\${f.name} — \${seedStr} — Bill \${fmtMoney(f.totalBill)} — \${f.status}</div>\`;
  }).join('');
}
els.search.oninput = loadList;

// init
renderSeeds(); updateTotals(); loadList();
