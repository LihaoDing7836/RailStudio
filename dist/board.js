// Model-space board polygons, in millimetres. Old rectangular files stay valid.
export function boardOutline(board){return board.outline||[{x:0,y:0},{x:board.width,y:0},{x:board.width,y:board.height},{x:0,y:board.height}];}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const on=(p,a,b)=>Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||on(a,c,d)||on(b,c,d)||on(c,a,b)||on(d,a,b);}
export function validateOutline(points,width,height){
 if(!Array.isArray(points)||points.length<3||points.length>64)throw Error('轮廓需要 3–64 个顶点');
 for(const p of points)if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>width||p.y>height)throw Error('顶点必须位于沙盘宽度和深度范围内');
 let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1)throw Error('相邻顶点间距至少 1 mm');area+=a.x*b.y-b.x*a.y;for(let j=i+1;j<points.length;j++){if(j===i+1||i===0&&j===points.length-1)continue;if(intersects(a,b,points[j],points[(j+1)%points.length]))throw Error('轮廓不能交叉或重叠');}}
 if(Math.abs(area)<200)throw Error('沙盘面积过小');return points.map(({x,y})=>({x,y}));
}
export function containsPoint(p,outline){let inside=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[j],b=outline[i];if(on(p,a,b))return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function containsSegment(a,b,outline){
 if(!containsPoint(a,outline)||!containsPoint(b,outline))return false;
 const ts=[0,1],dx=b.x-a.x,dy=b.y-a.y;
 for(let i=0;i<outline.length;i++){const c=outline[i],d=outline[(i+1)%outline.length],ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/den,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/den;if(t>0&&t<1&&u>=0&&u<=1)ts.push(t);}
 ts.sort((a,b)=>a-b);return ts.slice(1).every((t,i)=>{const m=(t+ts[i])/2;return containsPoint({x:a.x+dx*m,y:a.y+dy*m},outline);});
}
export function boardPath(board){return boardOutline(board).map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')+' Z';}
export function boardPreset(type,w,h){if(type==='L')return [{x:0,y:0},{x:w,y:0},{x:w,y:h*.4},{x:w*.4,y:h*.4},{x:w*.4,y:h},{x:0,y:h}];if(type==='U')return [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:w*.7,y:h},{x:w*.7,y:h*.35},{x:w*.3,y:h*.35},{x:w*.3,y:h},{x:0,y:h}];return boardOutline({width:w,height:h});}
