import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../dist/ids.js',import.meta.url),'utf8').replace('export function uid','function uid');
const load=environment=>vm.runInNewContext(source+'\nuid;',environment);
test('secure browsers retain native UUID generation with the correct receiver',()=>{
 const crypto={randomUUID(){assert.equal(this,crypto);return 'native-id';}};assert.equal(load({crypto})(),'native-id');
});
test('HTTP fallback works without randomUUID and generates distinct UUIDs',()=>{
 const crypto={getRandomValues(bytes){assert.equal(this,crypto);return webcrypto.getRandomValues(bytes);}},uid=load({crypto});
 const ids=Array.from({length:1000},()=>uid());assert.equal(new Set(ids).size,1000);for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('legacy fallback still works with no crypto and avoids same-tick collisions',()=>{
 const uid=load({Date:{now:()=>100},Math:{random:()=>.5}});assert.notEqual(uid(),uid());
});
