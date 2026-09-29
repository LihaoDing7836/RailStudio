import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/visits.js',import.meta.url),'utf8');
async function run(hostname,result,ok=true){const target={textContent:''},calls=[];
const context={location:{hostname},document:{querySelector:()=>target},crypto:{randomUUID:()=> '38d60e0e-8e62-4ad6-a61a-1834320a62fc'},URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{calls.push({url,options});return {ok,json:async()=>result};}};
vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));return {target,calls};}
test('local previews never send a count request',async()=>{const {calls,target}=await run('127.0.0.1',{});assert.equal(calls.length,0);assert.equal(target.textContent,'本地预览不计数');});
test('a public document sends one POST and displays server total',async()=>{const {calls,target}=await run('zhenxingtrain.com',{count:12345});assert.equal(calls.length,1);assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.body.get('event'),'38d60e0e-8e62-4ad6-a61a-1834320a62fc');assert.equal(target.textContent,'12,345');});
test('unavailable or invalid counters never display a made-up number',async()=>{for(const [data,ok] of [[{},false],[{count:-1},true],[{count:'100'},true]]){const {target}=await run('zhenxingtrain.com',data,ok);assert.equal(target.textContent,'暂不可用');}});
