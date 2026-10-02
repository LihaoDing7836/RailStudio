import { PAGE_SIZE, filterTrains, stateFromQuery, queryFromState, escapeHTML as e } from './train-catalogue.js?v=97347951e1560da0';
const page=document.body.dataset.page;
const $=selector=>document.querySelector(selector);
$('[data-header]').innerHTML=`<a class="site-brand" href="./" aria-label="枕星 Train 首页"><img src="brand/zhenxing-mark.png" width="43" height="43" alt=""><span><span class="brand-title">枕星<em>Train</em></span><span class="brand-subtitle">A WORLD IN MINIATURE</span></span></a><nav class="site-nav" aria-label="主导航"><a href="./" ${page==='home'?'aria-current="page"':''}>首页</a><a href="trains.html" ${['trains','detail'].includes(page)?'aria-current="page"':''}>列车图鉴</a><a href="designer.html" class="nav-design">沙盘设计 ↗</a></nav>`;
$('[data-footer]').innerHTML=`<div><a class="footer-name" href="./">枕星 Train</a><span>小小比例，无限旅程。</span></div><div>个人铁路模型兴趣网站 · <a href="designer.html">沙盘设计</a> / <a href="trains.html">列车图鉴</a><small class="visit-counter">网站点击量：<span data-visit-count aria-live="polite">加载中…</span></small></div>`;
import('./visits.js?v=97347951e1560da0');
function safeOfficial(url) {
  try {const u=new URL(url);return u.protocol==='https:'&&['www.tomytec.co.jp','www.katomodels.com','s3-ap-northeast-1.amazonaws.com'].includes(u.hostname)?e(u.href):'#';}catch{return '#';}
}
function money(t) {return t.price==null?'暂未查到目录价':`¥ ${Number(t.price).toLocaleString('en-US')}`;}
function photoURL(url) {return /^train-images\/[a-f0-9]{24}\.(?:jpe?g|png|gif|webp)$/.test(url||'')?url:safeOfficial(url);}
function photo(t,large=false,url=t.image_url) {
  const source=photoURL(url),available=source!=='#';
  return `<span class="photo-frame ${available?'':'image-unavailable'}"><span class="photo-fallback">${available?'官网图片加载中…':'暂无官方图片'}</span>${available?`<img class="official-photo" src="${source}" alt="${e(t.brand+' '+t.sku+' 官网产品配图')}" loading="${large?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`:''}</span>`;
}
// A failed manufacturer image remains explicit; never substitute a mock train.
document.addEventListener('error',event=>{
  if(!event.target.matches?.('img.official-photo'))return;
  const frame=event.target.closest('.photo-frame');
  event.target.hidden=true;frame.classList.add('image-unavailable');
  frame.querySelector('.photo-fallback').textContent='官网图片暂时无法加载';
},true);
document.addEventListener('load',event=>{
  if(event.target.matches?.('img.official-photo'))event.target.closest('.photo-frame').classList.add('image-loaded');
},true);
function chips(t) {return `<div class="chips"><span class="chip">${e(t.category)}</span><span class="chip">${e(t.set_type)}</span>${t.limited?'<span class="chip">限定 / 企划</span>':''}${t.archived?'<span class="chip">历史记录</span>':''}</div>`;}
function card(t,back='') {
  const href=`train.html?id=${encodeURIComponent(t.id)}${back?'&back='+encodeURIComponent(back):''}`;
  return `<a class="train-card" href="${e(href)}"><div class="train-visual ${t.brand==='KATO'?'kato':''}"><div class="visual-top"><b>${e(t.brand)}</b><span>N SCALE</span></div>${photo(t)}<span class="visual-caption">${e(t.brand)} 官方配图</span></div><div class="train-card-copy"><div class="sku-line"><code>${e(t.sku)}</code><span>${t.cars?e(t.cars)+' 辆':'辆数待确认'}</span></div><h3 lang="ja">${e(t.name)}</h3>${chips(t)}<div class="price-row"><div><strong class="${t.price==null?'price-empty':''}">${money(t)}</strong><small>${t.price!=null?(t.announced_price?'预计价格 · ':'')+'JPY · 官网含税目录价':'保留官方来源供核对'}</small></div><span class="card-arrow" aria-hidden="true">↗</span></div></div></a>`;
}
async function getData() {
  const response=await fetch('data/trains.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('无法读取目录');
  const payload=await response.json();
  if(!Array.isArray(payload.trains)||!payload.trains.length)throw new Error('目录数据为空');
  return payload;
}
function showError(target,retry) {
  target.setAttribute('aria-busy','false');
  target.innerHTML='<div class="empty-state"><h2>图鉴暂时没有打开</h2><p>数据读取失败，请检查网络后重试。沙盘设计仍然可以正常进入。</p><button type="button" id="retry-data">重新读取</button><a class="text-link" href="designer.html">进入沙盘设计 →</a></div>';
  $('#retry-data').addEventListener('click',retry,{once:true});
}
if(page==='trains') {
  let data,state=stateFromQuery(location.search),timer;
  const controls={q:$('#train-search'),category:$('#category-filter'),set:$('#set-filter'),cars:$('#cars-filter'),sort:$('#sort-filter'),limited:$('#limited-filter')};
  function setControls() {
    for(const [k,input] of Object.entries(controls)) {
      if(k==='limited')input.checked=state[k];
      else {input.value=state[k];if(input.tagName==='SELECT'&&!input.value){input.selectedIndex=0;state[k]=input.value;}}
    }
    document.querySelectorAll('[data-brand]').forEach(b=>{b.classList.toggle('selected',state.brand===b.dataset.brand);b.setAttribute('aria-pressed',String(state.brand===b.dataset.brand));});
  }
  function render(changeURL=true) {
    if(!data)return;
    const results=filterTrains(data.trains,state),pages=Math.max(1,Math.ceil(results.length/PAGE_SIZE));
    state.page=Math.min(state.page,pages);
    const query=queryFromState(state);
    if(changeURL&&location.search.slice(1)!==query)history.replaceState(null,'',location.pathname+(query?'?'+query:''));
    $('#results-count').innerHTML=`<strong>${results.length.toLocaleString()}</strong> 套列车 <span> / 图鉴共 ${data.trains.length.toLocaleString()} 套</span>`;
    const grid=$('#train-grid');grid.setAttribute('aria-busy','false');
    grid.innerHTML=results.length?results.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).map(t=>card(t,query)).join(''):'<div class="empty-state"><h2>这一站，还没找到。</h2><p>试试产品编号或官方日文车名，也可以放宽筛选条件。</p><button type="button" id="empty-reset">清除筛选</button></div>';
    $('#empty-reset')?.addEventListener('click',reset);
    const visible=[...new Set([1,state.page-1,state.page,state.page+1,pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
    $('#pagination').innerHTML=results.length>PAGE_SIZE?`<button data-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="上一页">←</button>`+visible.map((n,i)=>(i&&n-visible[i-1]>1?'<span aria-hidden="true">…</span>':'')+`<button data-page="${n}" ${n===state.page?'aria-current="page"':''} aria-label="第 ${n} 页">${n}</button>`).join('')+`<button data-page="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="下一页">→</button>`:'';
  }
  function change() {clearTimeout(timer);state.q=controls.q.value.trim();state.page=1;setControls();render();}
  function reset(){clearTimeout(timer);state=stateFromQuery('');setControls();render();}
  async function load(){try {data=await getData();$('#coverage-note').textContent=data.coverage_note;$('#sync-date').textContent='资料同步：'+data.updated;setControls();render();}catch {$('#results-count').textContent='目录暂时无法读取';showError($('#train-grid'),load);}}
  controls.q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.q=controls.q.value.trim();change();},180);});
  $('#search-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);state.q=controls.q.value.trim();change();});
  for(const [key,input] of Object.entries(controls))if(key!=='q')input.addEventListener('change',()=>{state[key]=key==='limited'?input.checked:input.value;change();});
  document.querySelectorAll('[data-brand]').forEach(b=>b.addEventListener('click',()=>{state.brand=b.dataset.brand;change();}));
  $('#reset-filters').addEventListener('click',reset);
  $('#pagination').addEventListener('click',event=>{const b=event.target.closest('button[data-page]');if(!b||b.disabled)return;state.page=Number(b.dataset.page);render();$('.results-heading').scrollIntoView({block:'start'});$('#pagination [aria-current="page"]')?.focus({preventScroll:true});});
  addEventListener('popstate',()=>{state=stateFromQuery(location.search);setControls();render(false);});
  addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){event.preventDefault();controls.q.focus();}});
  setControls();load();
}
if(page==='detail') {
  const params=new URLSearchParams(location.search),back=queryFromState(stateFromQuery(params.get('back')||''));
  $('#back-to-trains').href='trains.html'+(back?'?'+back:'');
  async function load() {
    const target=$('#train-detail');
    try {
      const data=await getData(),t=data.trains.find(t=>t.id===params.get('id'));
      target.setAttribute('aria-busy','false');
      if(!t){target.innerHTML='<div class="empty-state"><h2>没有找到这份列车档案</h2><p>编号可能已变更，或链接不完整。可以返回图鉴重新查找。</p><a class="button primary" href="trains.html">返回列车图鉴 →</a></div>';return;}
      document.title=`${t.brand} ${t.sku} · ${t.name} · 枕星 Train`;
      const parts=(t.composition||'').split('●').map(s=>s.trim()).filter(Boolean);
      const related=data.trains.filter(x=>x.source_url===t.source_url&&x.id!==t.id);
      target.innerHTML=`<section class="detail-hero"><div class="detail-photo-panel"><div class="detail-photo-main">${photo(t,true,t.image_gallery?.[0]||t.image_url)}</div>${(t.image_gallery||[]).length>1?`<div class="photo-thumbnails" aria-label="官方产品图库">${t.image_gallery.map((url,i)=>`<button type="button" data-photo="${photoURL(url)}" aria-label="查看官方图片 ${i+1}" aria-pressed="${i===0}">${photo(t,false,url)}</button>`).join('')}</div>`:''}<p class="image-credit">图片来源：<a href="${safeOfficial(t.image_source||t.source_url)}" target="_blank" rel="noopener noreferrer">${e(t.brand)} 官网 ↗</a>${t.image_scope==='series'?'<br>官网同系列配图，基本组、增结组及再版外观请按产品编号核对。':''}</p></div><div class="detail-summary"><p class="eyebrow">${e(t.brand)} / PRODUCT NO. ${e(t.sku)}</p><h1 lang="ja">${e(t.name)}</h1>${chips(t)}<div class="detail-price"><strong>${money(t)}</strong><span>${t.price!=null?'JPY · 含税<br>'+(t.announced_price?'官网预告价格':'官网当前目录价'):'当前来源未提供价格'}</span></div><a class="button primary" href="${safeOfficial(t.source_url)}" target="_blank" rel="noopener noreferrer">查看品牌官方页面 ↗</a></div></section>
      <section class="detail-block"><h2>这套列车的档案</h2><dl class="specs"><div><dt>品牌</dt><dd>${e(t.brand)}</dd></div><div><dt>产品编号</dt><dd>${e(t.sku)}</dd></div><div><dt>比例类别</dt><dd>N 比例</dd></div><div><dt>套装辆数</dt><dd>${t.cars?e(t.cars)+' 辆':'官方文字暂未确认'}</dd></div><div><dt>套装类型</dt><dd>${e(t.set_type)}</dd></div><div><dt>JAN 商品码</dt><dd>${e(t.jan||'暂未收录')}</dd></div><div><dt>官网标注发行 / 出货日期</dt><dd>${e(t.date_as_listed||'暂未收录')}</dd></div><div><dt>资料同步</dt><dd>${e(t.retrieved)}</dd></div></dl><p class="subtext">官网日期可能是再生产或预告日期，不等同于首次发售日期；是否在售请以品牌或经销商信息为准。</p></section>
      <section class="detail-block"><h2>车辆组成</h2>${parts.length?`<ul class="composition-list" lang="ja">${parts.map(p=>`<li>${e(p)}</li>`).join('')}</ul><p class="subtext">以上为官网列出的套装内容；显示次序不保证对应实际连挂顺序。M 通常表示带动力，T 通常表示无动力。</p>`:`<p class="subtext">${t.cars?'这套产品包含 '+e(t.cars)+' 辆车。':''}官网的逐车编组${t.formation_url?'以图片形式发布，可打开官方编组图核对。':'尚未收录，请前往官方产品页核对。'}</p>`}${t.formation_url?`<p style="margin-top:18px"><a class="formation-link" href="${safeOfficial(t.formation_url)}" target="_blank" rel="noopener noreferrer">打开官方编组图 ↗</a></p><p class="subtext">同一张官方图可能同时包含基本组、增结组及不同年份产品，请按编号 ${e(t.sku)} 对照。</p>`:''}</section>
      ${related.length?`<section class="detail-block"><h2>同一官方页面的其他套装</h2><div class="related-grid">${related.map(x=>card(x,back)).join('')}</div></section>`:''}
      <p class="detail-data-note">资料来自 ${e(t.brand)} 官方产品目录，品牌名称及产品编号仅用于识别。价格为资料同步时官方列出的日元含税价格，非首发价、成交价或购买报价。历史信息可能缺失，原始资料以官方页面为准。</p>`;
      target.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{
        target.querySelector('.detail-photo-main').innerHTML=photo(t,true,button.dataset.photo);
        target.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      }));
    }catch {showError(target,load);}
  }
  load();
}
