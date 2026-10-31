const fmt=n=>Number(n.toFixed(1)).toString();
const positive=n=>Number.isFinite(n)&&n>0;
// Manufacturer nominal dimensions and imported model extents stay distinct.
export function trackDimensions(part,piece={}){
 const g=part.geometry||{},rows=[];
 const add=(name,value,unit='mm',basis='geometry')=>{if(positive(value))rows.push({name,value:fmt(value),unit,basis});};
 for(const s of part.dimensionSpecs||[])add(s.name,s.value,s.unit,'official');
 if(g.type==='custom'){
  const points=g.paths.flatMap(p=>p.points);
  if(points.length){const xs=points.map(p=>p.x),ys=points.map(p=>p.y),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
   const nominal=rows.find(r=>r.name==='长度');
   if(!nominal||Math.abs(w-Number(nominal.value))>.1)rows.push({name:'模型轴线范围',value:h>.05?`${fmt(w)} × ${fmt(h)}`:fmt(w),unit:'mm',basis:'model'});
  }
  const radius=part.name?.match(/R(\d+(?:\.\d+)?)/);if(radius&&!rows.some(r=>r.name==='半径'))add('标称半径',Number(radius[1]),'mm','name');
 }else if(g.type){
  if(!(part.dimensionSpecs||[]).length)add(g.type==='turntable'?'桥轨长度':'长度',piece.length??g.length);
  if(g.minLength&&g.maxLength)rows.push({name:'可调范围',value:`${fmt(g.minLength)}–${fmt(g.maxLength)}`,unit:'mm',basis:'geometry'});
  add(g.type==='doubleCurve'?'外侧半径':'半径',g.radius);if(g.type==='doubleCurve')add('内侧半径',g.radius-g.spacing);
  add('角度',Math.abs(g.angle||0),'°');if(g.type?.startsWith('double')||['transition','crossover'].includes(g.type))add('线间距',g.spacing);
  if(g.type==='transition')add('出口线间距',g.endSpacing);
  if(g.type==='turntable'){add('模型外径',g.outerRadius*2);add('端口角间隔',g.step,'°');}
  if(g.type==='flex')rows.push({name:'弯曲角度',value:fmt(piece.bend||0),unit:'°',basis:'geometry'});
 }
 return rows;
}
export function trackDimensionSummary(part,piece={}){
 const rows=trackDimensions(part,piece);
 return rows.length?rows.map(r=>`${r.name} ${r.value}${r.unit==='°'?'':' '}${r.unit}`).join(' · '):'尺寸待核实';
}
export function trackDimensionLabel(part,piece={}){
 const rows=trackDimensions(part,piece),first=rows.find(r=>r.name==='长度')||rows.find(r=>r.name==='模型轴线范围')||rows[0];
 return first?`${first.basis==='model'?'轴线约 ':''}${first.value}${first.unit}`:'';
}
