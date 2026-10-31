// Shared terminal location for library thumbnails, SVG exports and the 3D viewer.
export function bufferStopPose(part,paths){
 if(!part.bufferStop&&part.geometry?.type!=='buffer')return null;
 const pts=paths[0]?.points;if(!pts?.length)return null;
 const end=pts.at(-1),before=pts.at(-2)||{x:end.x-1,y:end.y};
 return {x:end.x,y:end.y,z:end.z||0,angle:Math.atan2(end.y-before.y,end.x-before.x),style:part.bufferStop?.style||'steel'};
}
export function bufferStopMarkup(part,paths){
 const p=bufferStopPose(part,paths);if(!p)return '';
 const led=p.style==='led',wide=p.style==='wide',h=wide?13:8;
 return `<g data-buffer-stop="${p.style}" transform="translate(${p.x} ${p.y}) rotate(${p.angle*180/Math.PI})"><path d="M-8 ${-h}L0 ${-h}V${h}H-8M-8 ${-h}L0 0L-8 ${h}" fill="none" stroke="#4d5457" stroke-width="2.4"/><path d="M-1 ${-h-1}V${h+1}" stroke="#bd704d" stroke-width="3.5"/>${led?'<circle cx="-2" cy="0" r="2.4" fill="#ffdb70" stroke="#614d31" stroke-width=".7"/>':''}</g>`;
}
