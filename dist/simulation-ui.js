import {buildRailNetwork,traceRoute,trainBounds,trainPoses,advanceTrain} from './simulation.js?v=163a119ad935399b';
import {TRAIN_MODELS,getTrainConsist} from './train-models.js?v=163a119ad935399b';
import {geometry,pathData} from './geometry.js?v=163a119ad935399b';
import {isTrack} from './scenery-geometry.js?v=163a119ad935399b';
import {layerVisible} from './elevation-schema.js?v=163a119ad935399b';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function thumbnail(m){return `<img src="train-previews/${m.id}-v3.png" alt="${esc(m.name)} 三维模型" width="320" height="120" decoding="async">`;}

export class SimulationUI{
 constructor(api){
  this.api=api;this.modelId='cr400af';this.carCount=4;this.kmh=80;this.follow=false;this.switches={};this.route=null;this.running=false;this.state=null;this.pathIndex=0;this.frame=null;this.layoutKey='';this.reversedRoute=false;
  this.visibility=()=>{if(document.hidden&&this.running)this.pause('页面已切到后台，运行已暂停。');};document.addEventListener('visibilitychange',this.visibility);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(this.frame);this.running=false;},{once:true});
  this.render();
 }
 get model(){return TRAIN_MODELS.find(m=>m.id===this.modelId)||TRAIN_MODELS[0];}
 get tracks(){return this.api.project().pieces.filter(p=>{const part=this.api.byId()[p.partId];return isTrack(part)&&part.geometry?.type&&geometry(part,p).paths.length;});}
 get start(){return this.tracks.find(p=>p.id===this.startId);}
 get scale(){return this.start&&this.api.byId()[this.start.partId].scale==='HO'?this.model.scaleDenominator/87:1;}
 get denominator(){return this.start&&this.api.byId()[this.start.partId].scale==='HO'?87:this.model.scaleDenominator;}
 get speed(){return this.kmh/3.6*1000/this.denominator;}
 open(selected=[]){
  this.api.clear();const preferred=this.tracks.find(p=>selected.includes(p.id));
  if(preferred&&preferred.id!==this.startId){this.startId=preferred.id;this.pathIndex=0;this.route=null;}
  if(!this.startId||!this.tracks.some(p=>p.id===this.startId))this.startId=this.tracks[0]?.id;
  this.renderStarts();if(!this.route)this.prepare();else this.draw();
 }
 render(){
  $('#simulation-panel').innerHTML=`<section><div class="sim-heading"><h2>模拟运行</h2><small>RAIL / LIVE</small></div><p class="sim-top-note">在自己的沙盘上，开出第一班列车。</p><div class="sim-models">${TRAIN_MODELS.map(m=>`<button class="sim-model ${m.id===this.modelId?'active':''}" data-train-model="${m.id}" aria-pressed="${m.id===this.modelId}">${thumbnail(m)}<b>${esc(m.name)}</b><small>${m.type==='commuter'?'城市通勤':m.type==='double-deck'?'双层高速列车':'高速动车组'}</small></button>`).join('')}</div><p id="sim-model-detail" class="sim-model-detail"></p><div class="two-fields sim-settings"><label>车厢数<input id="sim-car-count" type="number" min="1" max="16" step="1" value="${this.carCount}"></label><label>编组长度<input id="sim-length" readonly aria-label="编组长度"></label></div><p class="sim-note">六种实车参考外形，头车与中间车分别建模。可自由设置 1–16 节；车型比例与参考资料可在下方查看。</p></section>
  <section><div class="section-heading"><h2>线路与方向</h2><button id="sim-use-selection" class="text-btn">用选中轨道</button></div><label class="field">起始轨道<select id="sim-start" class="sim-track-select" aria-label="起始轨道"></select></label><label class="field">起始轨内部路径<select id="sim-path" aria-label="起始轨内部路径"></select></label><label class="check-row"><input id="sim-route-reverse" type="checkbox">反向铺放列车</label><p class="sim-note">也可先在 2D 选中轨道，再点「用选中轨道」。道岔进路在发车前选择，修改线路会停车并重新放车。</p><details class="sim-route-options"><summary id="sim-switch-count">道岔进路</summary><div id="sim-switches"></div></details><div id="sim-route-summary" class="sim-route-summary" role="status"></div></section>
  <section><div class="sim-speed"><span><strong id="sim-speed-value">${this.kmh}</strong> <small>km/h · 等效速度</small></span><small id="sim-model-speed"></small></div><input id="sim-speed" type="range" min="0" max="320" step="5" value="${this.kmh}" aria-label="列车等效速度"><div class="sim-controls"><button id="sim-play" class="primary">▶ 开始运行</button><button id="sim-reset">↺ 回到起点</button><button id="sim-direction">⇄ 改为倒车</button><button id="sim-remove">移走列车</button></div><div id="sim-state" class="sim-state" aria-live="polite"></div><progress id="sim-progress" max="1" value="0" aria-label="列车在线路中的位置"></progress><div class="sim-telemetry"><span id="sim-distance">里程 —</span><span id="sim-height">高度 —</span><span id="sim-grade">坡度 —</span></div><div class="sim-camera"><button id="sim-show-3d">整列视角</button><button id="sim-detail-3d">车头特写</button><label class="sim-follow-label"><input id="sim-follow" type="checkbox">镜头跟随</label></div><p class="sim-note">开放线路到端点自动停车；可以倒车返回。切到后台或改动布局会暂停。运行不改变设计文件中的轨道。</p></section><section><h2>车型与参考</h2><p id="sim-model-note" class="sim-note"></p><a class="sim-reference-link" href="train-models-reference.html" target="_blank" rel="noopener">查看实车资料与建模说明 ↗</a></section><section><h2>运行范围</h2><p class="sim-note">当前为单列车沿轨道的运动演示，支持坡道及已接受的容差闭合。暂不计算牵引力、脱轨、车体碰撞或自动调度；隧道内列车可用「透视地形」查看。</p></section>`;
  const sections=$('#simulation-panel').querySelectorAll(':scope > section');$('#simulation-panel').insertBefore(sections[2],sections[1]);
  document.querySelectorAll('[data-train-model]').forEach(b=>b.onclick=()=>{this.modelId=b.dataset.trainModel;document.querySelectorAll('[data-train-model]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});this.prepare();});
  $('#sim-car-count').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>16){e.target.value=this.carCount;this.api.toast('编组请输入 1–16 节整数');return;}this.carCount=n;this.prepare();};
  $('#sim-start').onchange=e=>{this.startId=e.target.value;this.pathIndex=0;this.renderPaths();this.prepare();};
  $('#sim-path').onchange=e=>{this.pathIndex=Number(e.target.value);this.prepare();};
  $('#sim-route-reverse').onchange=e=>{this.reversedRoute=e.target.checked;this.prepare();};
  $('#sim-use-selection').onclick=()=>{const p=this.tracks.find(p=>this.api.selected().includes(p.id));if(!p){this.api.toast('请先在 2D 选中一段轨道');return;}this.startId=p.id;this.pathIndex=0;this.renderStarts();this.prepare();};
  $('#sim-speed').oninput=e=>{this.kmh=Number(e.target.value);if(this.state)this.state.speed=this.speed;this.updateSpeed();};
  $('#sim-play').onclick=()=>this.running?this.pause('已暂停，可以调速或继续运行。'):this.play();
  $('#sim-reset').onclick=()=>this.prepare();
  $('#sim-remove').onclick=()=>{this.pause();this.route=null;this.state=null;this.api.viewer()?.clearTrain();$('#simulation-overlay').innerHTML='';this.message('列车已移走。点「开始运行」重新放车。');};
  $('#sim-direction').onclick=()=>{if(!this.state)this.prepare();if(!this.state)return;this.state.direction*=-1;this.state.stopped=false;$('#sim-direction').textContent=this.state.direction===1?'⇄ 改为倒车':'⇄ 改为前进';this.message(this.state.direction===1?'已切换为前进。':'已切换为倒车，车厢位置保持不变。');};
  $('#sim-show-3d').onclick=async()=>{await this.api.show3D();this.draw();this.api.viewer()?.focusTrain();};
  $('#sim-detail-3d').onclick=async()=>{await this.api.show3D();this.draw();this.api.viewer()?.focusTrain({detail:true});};
  $('#sim-follow').onchange=async e=>{this.follow=e.target.checked;if(this.follow){await this.api.show3D();this.draw();this.api.viewer()?.focusTrain();}else this.draw();};
 }
 renderStarts(){
  const tracks=this.tracks,counts=new Map();
  if(!tracks.some(p=>p.id===this.startId))this.startId=tracks[0]?.id;
  $('#sim-start').innerHTML=tracks.length?tracks.map(p=>{const part=this.api.byId()[p.partId],n=(counts.get(part.id)||0)+1;counts.set(part.id,n);return `<option value="${esc(p.id)}" ${p.id===this.startId?'selected':''}>${esc(part.brand+' '+part.label)} · ${n} · H${Math.round(p.z||0)}</option>`;}).join(''):'<option value="">请先铺设轨道</option>';
  this.renderPaths();
 }
 renderPaths(){const p=this.start,paths=p?geometry(this.api.byId()[p.partId],p).paths:[];if(this.pathIndex>=paths.length)this.pathIndex=0;$('#sim-path').innerHTML=paths.map((path,i)=>`<option value="${i}" ${i===this.pathIndex?'selected':''}>路径 ${i+1} · ${Math.round(path.length)} mm</option>`).join('');$('#sim-path').disabled=paths.length<2;}
 prepare(){
  this.pause();this.api.viewer()?.clearTrain();$('#simulation-overlay').innerHTML='';this.route=null;this.state=null;
  const p=this.start;if(!p){this.message('请先铺设轨道，或使用设计页的 KATO 双环示例。');this.summary('当前没有可运行轨道。',true);$('#sim-play').disabled=true;return;}
  try{
   const project=this.api.project(),key=JSON.stringify([project.pieces,project.layers,project.closures]);
   if(!this.network||key!==this.layoutKey){this.network=buildRailNetwork(project,this.api.byId());this.layoutKey=key;this.switches={};}
   this.route=traceRoute(this.network,{pieceId:p.id,pathIndex:this.pathIndex,reverse:this.reversedRoute,switches:this.switches});
   const routePieces=new Set(this.route.segments.map(s=>s.pieceId)),hidden=project.pieces.filter(q=>routePieces.has(q.id)&&!layerVisible(q,project.layers));if(hidden.length)throw Error('运行线路经过隐藏楼层，请先在「设计」中勾选显示对应楼层。');
   const m=this.model,scale=this.scale;
   $('#sim-model-note').textContent=m.dimensionNote;
   this.state={distance:0,speed:this.speed,carCount:this.carCount,carLength:m.carLength*scale,carSpecs:getTrainConsist(m.id,this.carCount,{scale}),couplerGap:m.couplerGap*scale,direction:1};
   const limits=trainBounds(this.route,this.state);$('#sim-length').value=Math.round(limits.length)+' mm';$('#sim-model-detail').textContent=m.description+' · '+(this.api.byId()[p.partId].scale==='PLARAIL'?'玩具轨上的观赏示意':`1:${this.denominator} · ${this.denominator===87?'HO':'N'} 比例`);
   this.renderSwitches();$('#sim-direction').textContent='⇄ 改为倒车';this.updateSpeed();
   if(!limits.fits)throw Error(limits.reason||'线路不足以容纳整列，请减少车厢或延长线路。');
   this.state.distance=this.route.closed?this.route.startDistance:clamp(this.route.startDistance,limits.min,limits.max);
   this.initialDistance=this.state.distance;
   this.summary(`${this.route.closed?'环线 · 可连续运行':'开放线路 · 到端点停车'}<br>${(this.route.length/1000).toFixed(2)} m 线路 · ${this.carCount} 节 / ${Math.round(limits.length)} mm`);
   const warnings=[...(this.route.warnings||[])];
   this.message(warnings.length?'已放车。'+warnings.join('；'):'列车已就位，点击开始运行。');$('#sim-play').disabled=false;this.draw();
  }catch(e){this.state=null;this.route=null;this.summary(esc(e.message),true);this.message('可减少车厢数、换一段起始轨道，或继续铺设线路。');$('#sim-play').disabled=true;console.warn('Simulation:',e.message);}
 }
 renderSwitches(){
  const switches=this.network?.switches||[];$('#sim-switch-count').textContent=`道岔进路 · ${switches.length} 处`;
  $('#sim-switches').innerHTML=switches.length?switches.map((s,i)=>`<label>${esc(s.label||'道岔 '+(i+1))}<select data-sim-switch="${esc(s.id)}" aria-label="${esc(s.label||'道岔进路')}"><option value="">默认路径</option>${s.options.map(o=>`<option value="${o.pathIndex}" ${this.switches[s.id]===o.pathIndex?'selected':''}>${esc(o.label||'路径 '+(o.pathIndex+1))}</option>`).join('')}</select></label>`).join(''):'此线路中没有可选道岔。';
  document.querySelectorAll('[data-sim-switch]').forEach(el=>el.onchange=()=>{if(el.value==='')delete this.switches[el.dataset.simSwitch];else this.switches[el.dataset.simSwitch]=Number(el.value);this.prepare();});
 }
 summary(html,error=false){const el=$('#sim-route-summary');el.innerHTML=html;el.classList.toggle('error',error);}
 message(text){$('#sim-state').textContent=text;}
 updateSpeed(){$('#sim-speed-value').textContent=this.kmh;$('#sim-model-speed').textContent=Math.round(this.speed)+' mm/s';}
 play(){
  if(!this.route||!this.state)this.prepare();if(!this.route||!this.state)return;
  this.api.clear();this.running=true;this.lastTime=null;this.state.stopped=false;$('#sim-play').textContent='Ⅱ 暂停';this.message('运行中 · '+(this.state.direction===1?'前进':'倒车'));cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 pause(message){cancelAnimationFrame(this.frame);this.running=false;this.lastTime=null;if($('#sim-play'))$('#sim-play').textContent='▶ 开始运行';if(message)this.message(message);}
 tick(time){
  if(!this.running)return;const dt=this.lastTime===null?0:Math.min(.1,(time-this.lastTime)/1000);this.lastTime=time;this.state=advanceTrain(this.route,this.state,dt);this.draw();
  if(this.state.stopped){this.pause('已到线路端点，自动停车。切换倒车后可返回。');return;}
  this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 draw(){
  if(!this.route||!this.state)return;
  const poses=trainPoses(this.route,this.state),m=this.model,w=m.width*this.scale;
  $('#simulation-overlay').innerHTML=`${!this.running?`<path class="sim-route-highlight" d="${pathData(this.route.points)}" fill="none" stroke="#e4b159" stroke-opacity=".55" stroke-width="3"/>`:''}<g class="sim-train-2d">${[...poses].reverse().map(p=>{const L=p.carLength;return `<g transform="translate(${p.x} ${p.y}) rotate(${p.heading*180/Math.PI})"><rect x="${-L/2}" y="${-w/2}" width="${L}" height="${w}" rx="${Math.min(w*.45,9)}" fill="${m.colors.body}" stroke="#516975" stroke-width="1"/><path d="M${-L*.42} ${-w*.35}H${L*.42}M${-L*.42} ${w*.35}H${L*.42}" stroke="${m.colors.accent}" stroke-width="2"/><path d="M${-L*.35} 0H${L*.3}" stroke="${m.colors.roof}" stroke-width="${w*.4}"/>${p.index===0?`<path d="M${L*.3} ${-w*.25}L${L*.43} 0L${L*.3} ${w*.25}" fill="none" stroke="#254455" stroke-width="2"/>`:''}</g>`;}).join('')}</g>`;
  if(this.api.is3D())this.api.viewer()?.setTrain({modelId:this.modelId,poses,scale:this.scale,gauge:this.api.byId()[this.start.partId].scale==='HO'?16.5:this.api.byId()[this.start.partId].brand==='PLARAIL'?26:9,follow:this.follow});
  const head=poses[0];if(head){$('#sim-height').textContent='高度 '+head.z.toFixed(1)+' mm';$('#sim-grade').textContent='坡度 '+(Math.tan(head.pitch)*100).toFixed(1)+'%';}
  const d=((this.state.distance%this.route.length)+this.route.length)%this.route.length;$('#sim-progress').value=this.route.closed?d/this.route.length:clamp(this.state.distance/this.route.length,0,1);$('#sim-distance').textContent='位置 '+(this.state.distance/1000).toFixed(2)+' m';
 }
 layoutChanged(){
  const p=this.api.project(),key=JSON.stringify([p.pieces,p.layers,p.closures]);if(key===this.layoutKey)return;
  this.layoutKey=key;this.pause();this.network=null;this.route=null;this.state=null;$('#simulation-overlay').innerHTML='';this.api.viewer()?.clearTrain();this.renderStarts();this.summary('布局已改变，请点击「回到起点」重新检查线路。');this.message('运行已暂停，轨道修改已保留。');$('#sim-play').disabled=false;
 }
}
