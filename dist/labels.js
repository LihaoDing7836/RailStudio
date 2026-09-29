import {worldGeometry} from './geometry.js?v=0a42dd42ad0934d2';

const number=n=>Number(n.toFixed(1)).toString();
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function trackSpecification(part,piece){
 const g=part.geometry,L=piece.length??g.length;
 if(g.type==='curve'||g.type==='doubleCurve')return `${g.type==='doubleCurve'?'D':''}R${number(g.radius)}${g.type==='doubleCurve'?'/'+number(g.radius-g.spacing):''}–${number(g.angle)}°`;
 if(g.type==='flex')return `柔性轨 ${number(L)}mm / ${number(piece.bend||0)}°`;
 if(g.type==='straight')return `S${number(L)}`;
 if(g.type==='doubleStraight')return `DS${number(L)}`;
 if(g.type==='buffer')return `车挡 S${number(L)}`;
 if(g.type==='turntable')return `转盘 ${number(L)}mm`;
 // Catalog labels carry the model's geometry description, not its sales SKU.
 const label=part.label.replace(/^電動3方ポイント/,'三开道岔 ').replace(/^電動ポイント/,'道岔 ');
 if(part.category==='道岔'&&!label.includes('道岔'))return `道岔 ${label}`;
 return label;
}

// Half the actual route length, not the middle sample (a straight has only two).
function anchorOnTrack(points){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
 let remaining=lengths.reduce((a,b)=>a+b,0)/2;
 for(let i=0;i<lengths.length;i++){
  const length=lengths[i];if(length<=0)continue;
  if(remaining<=length||i===lengths.length-1){const a=points[i],b=points[i+1],t=remaining/length;
   let angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
   if(angle>90)angle-=180;if(angle<=-90)angle+=180;
   return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle};}
  remaining-=length;
 }
 return {...points[0],angle:0};
}

export function layoutTrackLabels(pieces,byId,{unit=1,viewport=null}={}){
 return pieces.filter(piece=>byId[piece.partId].kind!=='building').flatMap(piece=>{
  const part=byId[piece.partId],points=worldGeometry(part,piece).paths[0]?.points;if(!points?.length)return [];
  const anchor=anchorOnTrack(points);
  if(viewport&&(anchor.x<viewport.x||anchor.y<viewport.y||anchor.x>viewport.x+viewport.w||anchor.y>viewport.y+viewport.h))return [];
  return [{anchor,text:trackSpecification(part,piece),pieceId:piece.id,brand:part.brand,approximate:part.status==='approximate',unit}];
 });
}

export function trackLabelsMarkup(pieces,byId,options={}){
 const selected=options.selected||new Set();
 return '<g class="track-labels" pointer-events="none" style="user-select:none">'+layoutTrackLabels(pieces,byId,options).map(l=>{
  const u=l.unit,color=selected.has(l.pieceId)?'#8a410c':l.brand==='TOMIX'?'#143f69':'#173c2c';
  // One line on the centreline. The halo masks sleepers without displacing
  // the label; all SVG export styles are self-contained.
  return `<g data-label-piece="${escape(l.pieceId)}" transform="translate(${l.anchor.x} ${l.anchor.y}) rotate(${l.anchor.angle})"><text text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="${13*u}" font-weight="700" fill="${color}" stroke="white" stroke-width="${2.5*u}" stroke-linejoin="round" paint-order="stroke fill">${escape(l.text)}${l.approximate?' ≈':''}</text></g>`;
 }).join('')+'</g>';
}
