// Appearance widths are drawing conventions, not manufacturer clearance envelopes.
import {pathData} from './geometry.js?v=d4452c6508974d83';
export function trackStyle(part){
 const n=(part.name||'')+' '+(part.label||''),gauge=part.scale==='HO'?16.5:9;
 const type=part.appearance||(/築堤|\bEM\b/.test(n)?'embankment':/スラブ|スラブ|SL/.test(n)?'slab':/鉄橋|トラス|ガーダー/.test(n)?'bridge':/高架/.test(n)?'viaduct':/ワイド|-WP|－WP/.test(n)?'wide':/トラム|-WT/.test(n)?'tram':/PC|コンクリート/.test(n)?'pc':'standard');
 const styles={standard:['普通轨','',gauge+13,'#c9c1ae','#776b54'],pc:['PC 枕木轨','PC',gauge+13,'#b7c3c5','#e9eeea'],wide:['WP 宽版轨','WP',37,'#c1d1db','#f1f4ef'],slab:['板式轨','SL',gauge+22,'#c8c4d5','#827e97'],viaduct:['高架轨','高架',gauge+24,'#d2d4d1','#9ba5a4'],bridge:['桥梁轨','桥梁',gauge+24,'#b0c2b9','#667b71'],embankment:['EM 堤坝轨','EM',62,'#a6ba8c','#796e54'],tram:['路面轨','路面',37,'#abb4b8','#a2abad'],adapter:['跨品牌转接轨','转接',gauge+15,'#e5c68e','#a07842']};
 const [name,tag,width,bed,tie]=styles[type]||styles.standard;return {type,name,tag,width,bed,tie,gauge,rail:part.brand==='TOMIX'?'#3e6481':'#345747'};
}
export function offsetTrack(points,d){return points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],L=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:p.x-(b.y-a.y)/L*d,y:p.y+(b.x-a.x)/L*d};});}
export function trackSurfaceMarkup(part,paths,selected=false){const v=trackStyle(part);let out='';
 const stroke=(points,color,width,dash='')=>`<path d="${pathData(points)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 // All roadbeds first: branch paths must not cover each other's rails.
 for(const p of paths){if(selected)out+=stroke(p.points,'#d79040',v.width+4);out+=stroke(p.points,v.bed,v.width);
  if(v.type==='embankment'){out+=stroke(p.points,'#768d64',v.width-4,'2 5');out+=stroke(p.points,'#c9c1ae',v.gauge+16);}
  if(v.type==='wide')for(const d of [-v.width/2+2,v.width/2-2])out+=stroke(offsetTrack(p.points,d),'#edf5f7',1.4);
  if(['viaduct','bridge'].includes(v.type))for(const d of [-v.width/2+1,v.width/2-1]){out+=stroke(offsetTrack(p.points,d),'#6e8585',3);if(v.type==='bridge')out+=stroke(offsetTrack(p.points,d),'#dae5dd',1.8,'4 6');}
  if(v.type==='slab')out+=stroke(p.points,'#a8a4ba',v.gauge+9,'22 3');
  if(v.type==='adapter')for(const sign of [-1,1])out+=stroke(offsetTrack(p.points,sign*(v.width/2-2)),'#ae783b',2,'5 3');
 }
 if(!['tram','slab'].includes(v.type))for(const path of paths){let traveled=0,next=0;for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],L=Math.hypot(b.x-a.x,b.y-a.y);if(!L)continue;for(;next<=traveled+L;next+=7){const f=(next-traveled)/L,x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,dx=(b.x-a.x)/L,dy=(b.y-a.y)/L,h=v.gauge/2+3;out+=stroke([{x:x-dy*h,y:y+dx*h},{x:x+dy*h,y:y-dx*h}],v.tie,2.5);}traveled+=L;}}
 for(const p of paths)for(const d of [-v.gauge/2,v.gauge/2])out+=stroke(offsetTrack(p.points,d),v.rail,1.8);
 return `<g data-track-style="${v.type}">${out}</g>`;
}
