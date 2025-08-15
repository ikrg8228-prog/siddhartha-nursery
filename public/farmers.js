const tbody = document.querySelector('tbody');
const q = document.getElementById('q');
const sort = document.getElementById('sort');

async function load(){
  const params = new URLSearchParams();
  if(q.value.trim()) params.set('q', q.value.trim());
  params.set('sort', sort.value);
  const res = await api('/api/farmers?'+params.toString());
  if(!res.ok) return;
  tbody.innerHTML = '';
  for(const f of res.data){
    const tr = document.createElement('tr');
    const seedStr = (f.seeds||[]).map(s=>\`\${s.name}:\${s.trays}\`).join(', ');
    tr.innerHTML = \`
      <td>\${fmtDate(f.createdAt)}</td>
      <td><input value="\${f.name}" data-k="name"/></td>
      <td><input value="\${f.village}" data-k="village"/></td>
      <td><input value="\${f.phone||''}" data-k="phone"/></td>
      <td><input value="\${seedStr}" data-k="seeds"/></td>
      <td><input type="number" value="\${f.totalTrays}" disabled/></td>
      <td><input type="number" value="\${f.pricePerTray}" data-k="pricePerTray"/></td>
      <td><input type="number" value="\${f.advance}" data-k="advance"/></td>
      <td>\${fmtMoney(f.totalBill)}</td>
      <td>\${fmtMoney(f.balance)}</td>
      <td>\${f.status}</td>
      <td class="right">
        <button class="btn secondary" data-act="save">Save</button>
        <button class="btn danger" data-act="del">Delete</button>
      </td>
    \`;
    tr.dataset.id = f._id;
    tr.addEventListener('click', async (e)=>{
      if(!(e.target instanceof HTMLElement)) return;
      const act = e.target.dataset.act;
      if(!act) return;
      if(act==='del'){
        if(confirm('Delete this record?')){
          await api('/api/farmers/'+tr.dataset.id,{method:'DELETE'});
          load();
        }
      } else if(act==='save'){
        // parse the "seeds" field back to array
        const get = k => tr.querySelector('[data-k="'+k+'"]').value;
        const payload = {
          name: get('name'),
          village: get('village'),
          phone: get('phone'),
          pricePerTray: Number(get('pricePerTray')||0),
          advance: Number(get('advance')||0),
          seeds: (get('seeds')||'').split(',').map(s=>s.trim()).filter(Boolean).map(pair=>{
            const [name, trays] = pair.split(':').map(x=>x.trim());
            return { name, trays: Number(trays||0) };
          })
        };
        await api('/api/farmers/'+tr.dataset.id, {method:'PUT', body: JSON.stringify(payload)});
        load();
      }
    });
    tbody.appendChild(tr);
  }
}
q.oninput = load;
sort.onchange = load;
load();
