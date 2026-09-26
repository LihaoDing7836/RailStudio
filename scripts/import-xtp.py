"""Convert XTrackCAD GPL-2.0 parameter geometry to millimetres.
Modified 2026-09-26: retain track segments/ports, omit decorative graphics.
No XTrackCAD application code is included. See vendor/xtrkcad/COPYING.
"""
from pathlib import Path
import re,json,math,urllib.parse
ROOT=Path(__file__).resolve().parents[1];f=ROOT/'dist/catalog.json';data=json.loads(f.read_text());library={};sources={}
def transform(x,y,ox,oy,a):
 x-=ox;y-=oy;c=math.cos(a);s=math.sin(a);return {'x':round(x*c-y*s,6),'y':round(x*s+y*c,6)}
for path in sorted((ROOT/'vendor/xtrkcad').glob('*.xtp'),key=lambda p:(p.name[0].isupper(),p.name)):
 source=('https://sourceforge.net/p/xtrkcad-fork/xtrkcad/ci/default/tree/app/lib/params/'+urllib.parse.quote(path.name) if path.name[0].isupper() else 'https://github.com/sharkcz/xtrkcad/blob/hg/app/lib/params/'+path.name)
 text=path.read_bytes().decode('cp1252')
 for match in re.finditer(r'^TURNOUT\s+(\S+)\s+"(.*?)"\s*(?:\d+)?\s*\n(.*?)(?=^TURNOUT|^STRUCTURE|\Z)',text,re.M|re.S):
  scale,title,body=match.groups();fields=title.split('\t');sku=fields[-1];brand='TOMIX' if 'tomix' in path.name.lower() else 'KATO'
  if any(x in title.lower() for x in ['round house','roundhouse']):continue
  if not re.fullmatch(r'\d{4}' if brand=='TOMIX' else r'\d{1,2}-\d{3}[LR]?',sku):continue
  if scale not in ['N','HO']:continue
  endpoints=[];paths=[]
  for l in body.splitlines():
   v=l.strip().split()
   if not v:continue
   if v[0] in ['END','END$SEGS']:break
   if v[0]=='E':
    x,y,a=map(float,v[1:4]);endpoints.append({'x':x*25.4,'y':-y*25.4,'angle':(a-90)%360})
   if v[0]=='S':
    x1,y1,x2,y2=map(float,v[3:7]);pts=[{'x':x1*25.4,'y':-y1*25.4},{'x':x2*25.4,'y':-y2*25.4}];paths.append({'points':pts,'length':math.hypot(x2-x1,y2-y1)*25.4})
   if v[0]=='C':
    r,cx,cy,start,sweep=map(float,v[3:8]);r=abs(r);n=max(12,math.ceil(sweep/2));pts=[]
    for i in range(n+1):
     a=math.radians(start+sweep*i/n);pts.append({'x':(cx+r*math.sin(a))*25.4,'y':-(cy+r*math.cos(a))*25.4})
    paths.append({'points':pts,'length':r*math.radians(sweep)*25.4})
  if not endpoints or not paths:continue
  origin=endpoints[0];rotation=math.radians(180-origin['angle'])
  eps=[{**transform(e['x'],e['y'],origin['x'],origin['y'],rotation),'angle':round((e['angle']+math.degrees(rotation))%360,6)} for e in endpoints]
  segs=[]
  for p in paths:
   pts=[transform(q['x'],q['y'],origin['x'],origin['y'],rotation) for q in p['points']]
   # Segment endpoints for elevation interpolation; externally exposed ports use E entries.
   h1=math.degrees(math.atan2(pts[1]['y']-pts[0]['y'],pts[1]['x']-pts[0]['x']));h2=math.degrees(math.atan2(pts[-1]['y']-pts[-2]['y'],pts[-1]['x']-pts[-2]['x']))
   segs.append({'points':pts,'start':{**pts[0],'angle':(h1+180)%360},'end':{**pts[-1],'angle':h2%360},'length':p['length']})
  library[(brand,scale,sku)]={'geometry':{'type':'custom','paths':segs,'endpoints':eps},'geometrySource':source,'libraryName':title}
# Superseded products with the same manufacturer dimensional designation.
alias={('TOMIX','1633'):'1631',('KATO','40-103'):'40-102',('KATO','40-103-E'):'40-102',('KATO','40-104'):'40-101',('KATO','40-104-E'):'40-101',('KATO','40-212'):'40-210',('KATO','40-212-E'):'40-210',('KATO','40-213'):'40-211',('KATO','40-213-E'):'40-211',('TOMIX','1271'):'1241',('TOMIX','1272'):'1242',('TOMIX','1281'):'1241',('TOMIX','1282'):'1242',('TOMIX','1225'):'1241',('TOMIX','1226'):'1242',('TOMIX','1273'):'1243',('TOMIX','1274'):'1244',('TOMIX','1278'):'1248',('TOMIX','1279'):'1249',('KATO','2-852'):'2-850',('KATO','2-853'):'2-851'}
# A mixed turntable expansion set contains multiple distinct physical track pieces.
parent=next(p for p in data['parts'] if p['id']=='KATO-N-20-286')
data['parts'].remove(parent)
for suffix in ['L','R']:
 import copy
 p=copy.deepcopy(parent);p['id']+='-'+suffix;p['label']='转盘延伸曲轨 · '+suffix;p['name']+=' · '+suffix
 entry=library.get(('KATO','N','20-286'+suffix))
 if entry:p.update(entry);p['status']='library';p['notes']=['转盘曲线扩展套装中的独立曲轨；几何来自 XTrackCAD。']
 data['parts'].append(p)
for code,g in [('R381-10',{'type':'curve','radius':381,'angle':10}),('S62',{'type':'straight','length':62})]:
 p=copy.deepcopy(parent);p.update(id=parent['id']+'-'+code,label=code,name=parent['name']+' · '+code,geometry=g,status='dimensions',notes=['转盘曲线扩展套装内的独立轨道。']);data['parts'].append(p)
updated=[]
for p in data['parts']:
 if p['status'] not in ['pending','approximate']:continue
 key=(p['brand'],p['scale'],p['sku']);entry=library.get(key);aliased=False
 if not entry and (p['brand'],p['sku']) in alias:
  entry=library.get((p['brand'],p['scale'],alias[(p['brand'],p['sku'])]));aliased=bool(entry)
 if not entry:continue
 p.update(entry);p['status']='library';p['notes']=['几何来自 XTrackCAD 开源参数库（非厂商认证）；端点按库中独立定义建模。']
 if aliased:p['notes'].append('采用同几何规格的前代产品参数；具体道床与电气变化请核对当前产品。')
 updated.append(key)
# Turntable ports include all radial slots, but display one movable bridge only.
for p in data['parts']:
 if p['sku'] in ['20-283','1633'] and p['geometry'].get('type')=='custom':
  ports=p['geometry']['endpoints'];cx=sum(e['x'] for e in ports)/len(ports);cy=sum(e['y'] for e in ports)/len(ports)
  p['geometry']={'type':'turntable','length':160 if p['brand']=='KATO' else 212,'center':{'x':cx,'y':cy},'ports':ports,'step':10 if p['brand']=='KATO' else 15,'outerRadius':math.hypot(ports[0]['x']-cx,ports[0]['y']-cy)}
  p['notes'].append('径向端点用于规划；转盘桥轨角度可单独调整。转盘只在当前桥轨方向导通。')
# Preserve disclosed library discrepancies instead of claiming manufacturer certification.
for p in data['parts']:
 if p['geometry'].get('type')!='custom':continue
 ends=[pt for path in p['geometry']['paths'] for pt in [path['points'][0],path['points'][-1]]]
 delta=max(min(math.hypot(e['x']-q['x'],e['y']-q['y']) for q in ends) for e in p['geometry']['endpoints'])
 if delta>.6:
  p['status']='approximate';p['notes'].append(f'源参数端点与曲线有约 {delta:.2f} mm 偏差，当前以显式端点吸附；施工前需复核。')
data['counts']={s:sum(p['status']==s for p in data['parts']) for s in ['dimensions','library','approximate','pending']}
data['geometryAttribution']='Additional geometry: XTrackCAD parameter library, Dwyane Ward, Dave Bullis and contributors. GPL-2.0. Converted to mm on 2026-09-26; raw sources and license included.'
f.write_text(json.dumps(data,ensure_ascii=False,indent=2));print('Imported',len(updated),'geometries');print(data['counts']);print('Remaining:');print('\n'.join(p['brand']+' '+p['sku']+' '+p['name'] for p in data['parts'] if p['status']=='pending'))
