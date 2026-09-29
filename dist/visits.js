// One page view per loaded document. No visitor IDs, cookies or local counters.
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const target=document.querySelector('[data-visit-count]');
if(local){if(target){target.textContent='本地预览不计数';target.title='正式部署并启用统计接口后显示全站累计访问次数';}}
else{
 const event=globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 fetch('./api/visits.ashx',{method:'POST',body:new URLSearchParams({event}),cache:'no-store',credentials:'same-origin',signal:controller.signal})
 .then(r=>{if(!r.ok)throw Error('Counter unavailable');return r.json();})
 .then(data=>{if(!Number.isSafeInteger(data.count)||data.count<0)throw Error('Invalid count');if(target){target.textContent=data.count.toLocaleString('zh-CN');target.title='全站累计页面访问次数（PV），刷新页面也计入；非独立访客数';}})
 .catch(()=>{if(target){target.textContent='暂不可用';target.title='统计接口暂时不可用，不影响网站其他功能';}})
 .finally(()=>clearTimeout(timer));
}
