// Sweep a closed trapezoidal earthwork beneath the existing rail elevation.
// Width/slope are schematic. Track positions and connection heights never change.
export function embankmentMesh(points,{topWidth=28,shoulder=20,ground=()=>0}={}){
 const faces=[],seams=[];if(points.length<2)return {faces,seams};
 const tri=(a,b,c)=>faces.push(a.x,a.z,a.y,b.x,b.z,b.y,c.x,c.z,c.y);
 const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
 const rows=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],L=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L;
  const point=(d,base)=>{const x=p.x+nx*d,y=p.y+ny*d;return {x,y,z:base?Math.min(p.z,ground(x,y)):p.z};};return [point(-topWidth/2,false),point(topWidth/2,false),point(-topWidth/2-shoulder,true),point(topWidth/2+shoulder,true)];});
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];quad(a[0],b[0],b[1],a[1]);quad(a[2],b[2],b[0],a[0]);quad(a[1],b[1],b[3],a[3]);quad(a[3],b[3],b[2],a[2]);}
 for(const i of [0,rows.length-1]){const r=rows[i];quad(r[0],r[1],r[3],r[2]);}
 // Crosswise concrete ribs emphasize the sloping sidewalls without image textures.
 let carry=0;for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],L=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(!L)continue;for(let d=carry;d<L;d+=24){const t=d/L,m=a.map((v,j)=>({x:v.x+(b[j].x-v.x)*t,y:v.y+(b[j].y-v.y)*t,z:v.z+(b[j].z-v.z)*t+.15}));for(const [u,v] of [[m[2],m[0]],[m[1],m[3]]])seams.push(u.x,u.z,u.y,v.x,v.z,v.y);}carry=((carry-L)%24+24)%24;}
 return {faces,seams};
}
