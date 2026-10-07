"""Verified set components and explicit planning adapter policy, 2026-10-07."""
import json, collections
from pathlib import Path

def apply(parts):
 for sku,variants in [('91045',[('C1641-5-EM',2),('CR1641-5-EM',2),('CL1641-5-EM',2),('S140-EM',1)]),('91046',[('C1641-5-EM',6)])]:
  for code,count in variants:
   ident=f'TOMIX-N-{sku}-{code}'
   if any(p['id']==ident for p in parts):continue
   parts.append(dict(id=ident,brand='TOMIX',scale='N',sku=sku,name=f'築堤大カーブセット {code}',label=code,source=f'https://www.tomytec.co.jp/tomix/products/n/{sku}.html',category='高架 / 桥梁',geometry={'type':'straight','length':140} if code.startswith('S') else {'type':'curve','radius':1641,'angle':5},status='dimensions',system='Fine Track',pack=count,appearance='embankment',notes=[f'套装 {sku} 内单节组件 {code}，每套含 {count} 节；清单数量按放置节数统计。','EM 为堤坝轨，CR/CL 为超高过渡型号；使用翻转调整铺设方向。平面半径与角度按官方规格，未模拟约 4° 横向超高；轨面标高由楼层控制，堤坝外轮廓为示意。' if not code.startswith('S') else 'S140 普通直轨搭配套装内 S140-EM 道床与堤坝表示，未虚构独立销售编号。']))
 for p in parts:
  if (p['brand'],p['sku']) in [('TOMIX','1529'),('KATO','20-045')] and p['scale']=='N':
   p['adapterBrands']=['KATO','TOMIX'];p['appearance']='adapter';p['label']='S35-J' if p['brand']=='TOMIX' else 'S62J'
   p['notes']=['设计器按双端可接 KATO / TOMIX 的转接件处理；实物须按厂家说明更换接头、核对道床与接口，软件兼容不代表免改装直连。']
 return parts

if __name__=='__main__':
 path=Path(__file__).resolve().parents[1]/'dist/catalog.json';data=json.loads(path.read_text());apply(data['parts']);data['counts']=dict(collections.Counter(p['status'] for p in data['parts']));data['supplemented']='2026-10-07';path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
