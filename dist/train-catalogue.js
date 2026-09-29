// Shared, DOM-free catalogue logic; missing prices always sort last.
export const PAGE_SIZE = 24;
export function normalizeSearch(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s‐‑–—−]/g, '').replace(/增结/g,'増結').replace(/新干线/g,'新幹線');
}
export function filterTrains(trains, state) {
  const query = normalizeSearch(state.q);
  const cars = /^(\d+)-(\d+)$/.exec(state.cars || '');
  const result = trains.filter(t => (!state.brand || t.brand === state.brand)
    && (!state.category || t.category === state.category)
    && (!state.set || t.set_type === state.set)
    && (!state.limited || t.limited)
    && (!state.cars || (state.cars === 'unknown' ? !t.cars : cars && t.cars >= +cars[1] && t.cars <= +cars[2]))
    && (!query || normalizeSearch([t.name,t.sku,t.brand,t.category,t.composition || ''].join(' ')).includes(query)));
  return result.sort((a,b) => {
    let difference=0;
    if (state.sort==='price-low' || state.sort==='price-high') {
      if (a.price==null && b.price!=null) return 1;
      if (b.price==null && a.price!=null) return -1;
      difference=(a.price-b.price)*(state.sort==='price-high'?-1:1);
    } else if (state.sort==='cars') difference=(a.cars??Infinity)-(b.cars??Infinity);
    return difference || a.brand.localeCompare(b.brand) || a.sku.localeCompare(b.sku,'en',{numeric:true});
  });
}
export function stateFromQuery(search) {
  const q=new URLSearchParams(search);
  return {q:q.get('q')||'',brand:['TOMIX','KATO'].includes(q.get('brand'))?q.get('brand'):'',category:q.get('category')||'',set:q.get('set')||'',cars:q.get('cars')||'',limited:q.get('limited')==='1',sort:q.get('sort')||'sku',page:Math.max(1,Number.parseInt(q.get('page'),10)||1)};
}
export function queryFromState(state) {
  const params=new URLSearchParams();
  for (const key of ['q','brand','category','set','cars']) if(state[key])params.set(key,state[key]);
  if(state.limited)params.set('limited','1');
  if(state.sort!=='sku')params.set('sort',state.sort);
  if(state.page>1)params.set('page',state.page);
  return params.toString();
}
export function escapeHTML(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
