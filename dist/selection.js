// World-space bounds keep selection independent of zoom and drag direction.
export function selectionRect(start,end){
 return {minX:Math.min(start.x,end.x),minY:Math.min(start.y,end.y),maxX:Math.max(start.x,end.x),maxY:Math.max(start.y,end.y)};
}
export function boxedSelection(items,start,end,previous=[]){
 const r=selectionRect(start,end),ids=new Set(previous),epsilon=1e-7;
 for(const {id,bounds:b} of items){
  if(b&&b.minX>=r.minX-epsilon&&b.minY>=r.minY-epsilon&&b.maxX<=r.maxX+epsilon&&b.maxY<=r.maxY+epsilon)ids.add(id);
 }
 return ids;
}
