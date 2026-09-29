const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const buildingSize=(part,piece={})=>piece.buildingSize||part.dimensions;
export function buildingMarkup(part,piece,{selected=false,ghost=false,exporting=false}={}){
 const {width:w,depth:d}=buildingSize(part,piece),kind=part.buildingKind||'house';
 const margin=Math.min(w,d)*.12,x=margin,y=margin,rw=w-2*margin,rd=d-2*margin;
 const roof=part.roofColor||(['temple','house','station'].includes(kind)?'#667a82':'#b8bab6');
 let detail='';
 if(['house','temple','station','shop'].includes(kind)){
  detail=`<rect x="${x}" y="${y}" width="${rw}" height="${rd}" fill="${roof}"/><path d="M${x} ${y}L${w/2} ${y+rd*.13}V${y+rd*.87}L${x} ${y+rd}Z" fill="#fff" opacity=".18"/><path d="M${w/2} ${y+rd*.13}L${x+rw} ${y}V${y+rd}L${w/2} ${y+rd*.87}Z" fill="#172a32" opacity=".22"/><path d="M${w/2} ${y+rd*.13}V${y+rd*.87}" stroke="#dce4e3" stroke-width="1.3"/>`;
  for(let k=1;k<12;k++)detail+=`<path d="M${x} ${y+rd*k/12}H${x+rw}" stroke="#263c42" opacity=".25" stroke-width=".6"/>`;
 }else{
  detail=`<rect x="${x}" y="${y}" width="${rw}" height="${rd}" fill="${roof}" stroke="#82908c" stroke-width="1.5"/><rect x="${x+3}" y="${y+3}" width="${Math.max(1,rw-6)}" height="${Math.max(1,rd-6)}" fill="#d5d7d2"/>`;
  for(let k=0;k<3;k++)detail+=`<rect x="${x+rw*.2}" y="${y+rd*(.17+k*.23)}" width="${rw*.24}" height="${rd*.13}" rx="1" fill="#8d9b9c" stroke="#6b7b7f" stroke-width=".7"/><path d="M${x+rw*.23} ${y+rd*(.21+k*.23)}h${rw*.18}" stroke="#e4e8e6"/>`;
  if(kind==='factory')for(let k=1;k<5;k++)detail+=`<path d="M${x+rw*k/5} ${y+3}V${y+rd-3}" stroke="#9ba8a9" stroke-width="1"/>`;
 }
 return `<g ${exporting?'':`data-piece="${esc(piece.id)}" class="building-piece"`} transform="translate(${piece.x} ${piece.y}) rotate(${piece.angle||0}) scale(1 ${piece.flip||1})" opacity="${ghost?.6:1}"><title>${esc(part.brand+' '+part.sku+' '+part.name)} · ${w} × ${d} mm</title><rect width="${w}" height="${d}" fill="#dce2d5" stroke="${selected?'#d88b3e':'#abb5a5'}" stroke-width="${selected?2:1}"/><path d="M0 ${d*.86}H${w}" stroke="#c3c6bc" stroke-width="${d*.16}"/><rect x="${x+2}" y="${y+3}" width="${rw}" height="${rd}" fill="#344a49" opacity=".23"/>${detail}<rect x="${w*.42}" y="${y+rd}" width="${w*.16}" height="${margin*.75}" fill="#b6a187"/><circle cx="${margin*.5}" cy="${d*.72}" r="${margin*.4}" fill="#79966c"/><circle cx="${w-margin*.5}" cy="${d*.26}" r="${margin*.38}" fill="#6f8d68"/><text x="${w/2}" y="${d-margin*.25}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.min(7,w/10)}" fill="#344a49">${esc(part.sku)}</text></g>`;
}
