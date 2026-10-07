"""Verified set components and explicit planning adapter policy, 2026-10-07."""
import json, collections
from pathlib import Path

def apply(parts):
 for sku,variants in [('91045',[('C1641-5-EM',2),('CR1641-5-EM',2),('CL1641-5-EM',2),('S140-EM',1)]),('91046',[('C1641-5-EM',6)])]:
  for code,count in variants:
   ident=f'TOMIX-N-{sku}-{code}'
   if any(p['id']==ident for p in parts):continue
   parts.append(dict(id=ident,brand='TOMIX',scale='N',sku=sku,name=f'築堤大カーブセット {code}',label=code,source=f'https://www.tomytec.co.jp/tomix/products/n/{sku}.html',category='高架 / 桥梁',geometry={'type':'straight','length':140} if code.startswith('S') else {'type':'curve','radius':1641,'angle':5},status='dimensions',system='Fine Track',pack=count,appearance='embankment',notes=[f'套装 {sku} 内单节组件 {code}，每套含 {count} 节；清单数量按放置节数统计。','EM 为堤坝轨，CR/CL 为超高过渡型号；使用翻转调整铺设方向。平面半径与角度按官方规格，未模拟约 4° 横向超高；轨面标高由楼层控制，堤坝外轮廓为示意。' if not code.startswith('S') else 'S140 普通直轨搭配套装内 S140-EM 道床与堤坝表示，未虚构独立销售编号。']))
 # Set 91047 provides six 1604 mm inner curves. Approaches reuse those rails.
 extra=[
  ('91047-C1604-5-EM','91047','C1604-5-EM',{'type':'curve','radius':1604,'angle':5},6,'原装曲线轨，每套 6 节；与 C1641 配对，复线间距 37 mm。'),
  ('91047-C1604-5-EM-AR','91047','C1604-5-EM · 过渡 R',{'type':'curve','radius':1604,'angle':5},None,'由套装内 C1604 拆除相应超高零件改装；不是额外附送的轨道。'),
  ('91047-C1604-5-EM-AL','91047','C1604-5-EM · 过渡 L',{'type':'curve','radius':1604,'angle':5},None,'由套装内 C1604 拆除相应超高零件改装；不是额外附送的轨道。'),
  ('ASSEMBLY-C1641-1604-EM','91045/91046 + 91047','DC1641/1604-5-EM · 组合',{'type':'doubleCurve','radius':1641,'spacing':37,'angle':5},None,'复线组合示意：外轨来自 91045/91046，内轨与复线道床来自 91047；不可只购买一个套装。'),
  ('ASSEMBLY-S72.5-EM','1803 + 91047','DS72.5-EM · 组合',{'type':'doubleStraight','length':72.5,'spacing':37},None,'两节另购 S72.5（1803）搭配 91047 附带复线道床。'),
  ('ASSEMBLY-S280-EM','1730 + 3228/3229','S280-WP · 堤坝组合',{'type':'straight','length':280},None,'另购 S280-WP 配两段 140 mm 堤坝；3228/3229 不含轨道，此条为设计组合。'),
  ('ASSEMBLY-DS280-EM','1730 + 3228/3229','DS280-WP · 堤坝组合',{'type':'doubleStraight','length':280,'spacing':37},None,'两节另购 S280-WP 配 280 mm 复线堤坝；堤坝由 140 mm 组件拼接，此条为设计组合。')]
 for key,sku,label,g,pack,note in extra:
  ident='TOMIX-N-'+key
  data=dict(id=ident,brand='TOMIX',scale='N',sku=sku,name='築堤 堤坝 '+label,label=label,source='https://www.tomytec.co.jp/tomix/products/n/'+('3228' if '280' in key else '91047')+'.html',category='高架 / 桥梁',geometry=g,status='dimensions',system='Fine Track',pack=pack,appearance='embankment',notes=[note,'轨道长度、半径按官方规格；堤坝宽度和边坡为立体示意，未模拟横向超高。新增默认轨面抬高 30 mm（预览值，可在属性修改，不是官方尺寸）。'])
  old=next((p for p in parts if p['id']==ident),None)
  if old:old.update(data)
  else:parts.append(data)
 for p in parts:
  if p.get('appearance')=='embankment':
   p['defaultElevation']=30
   if not any('30 mm' in n for n in p['notes']):p['notes'].append('新增默认轨面抬高 30 mm（预览值，可改）；旧方案高度保持不变。堤坝随轨面高度延伸到地形。')

 for p in parts:
  if (p['brand'],p['sku']) in [('TOMIX','1529'),('KATO','20-045')] and p['scale']=='N':
   p['adapterBrands']=['KATO','TOMIX'];p['appearance']='adapter';p['label']='S35-J' if p['brand']=='TOMIX' else 'S62J'
   p['notes']=['设计器按双端可接 KATO / TOMIX 的转接件处理；实物须按厂家说明更换接头、核对道床与接口，软件兼容不代表免改装直连。']
 return parts

if __name__=='__main__':
 path=Path(__file__).resolve().parents[1]/'dist/catalog.json';data=json.loads(path.read_text());apply(data['parts']);data['counts']=dict(collections.Counter(p['status'] for p in data['parts']));data['supplemented']='2026-10-07';path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
