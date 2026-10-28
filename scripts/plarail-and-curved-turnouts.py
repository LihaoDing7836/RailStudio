"""Source-linked planning geometry, not manufacturer CAD. Run after XTP import."""
import json, collections
from pathlib import Path
LINEUP='https://www.takaratomy.co.jp/products/plarail/lineup/rail/'
FAQ='https://faq.takaratomy.co.jp/detail.aspx?a=102&id=15000&isCrawler=1'
def apply(parts):
 for p in parts:
  if p['brand']=='TOMIX' and p['scale']=='N' and p['sku'] in ['1278','1279']:
   p['geometry']={'type':'curvedTurnout','radius':317,'innerRadius':280,'angle':-45 if p['sku']=='1278' else 45}
   p['status']='approximate'
   p['notes']=['按官方 R317/R280、45° 规格重建名义规划曲线，两个出口方向一致，继续相同半径至 90° 时形成 37 mm 横向间距。','替代旧参数库 44°/46° 出口，非厂家精密 CAD；未模拟实物分岔过渡及接头余量。旧方案中已接上的后续轨道需重新吸附。']
   for key in ['geometrySource','libraryName']:p.pop(key,None)
 def add(sku,label,g,category='直轨',status='approximate',plugs=None,appearance='plarail',note='',variant=''):
  ident='PLARAIL-PLARAIL-'+sku+('-'+variant if variant else '')
  data=dict(id=ident,brand='PLARAIL',scale='PLARAIL',sku=sku,name='普乐乐路 '+label,label=label,source=LINEUP,category=category,geometry=g,status=status,system='Plarail',appearance=appearance,notes=[note,'以毫米表示玩具实物规划尺寸，不按 N 比例缩放。外观宽度、槽距为示意；复线/道岔未校验凹凸接头，不表示可以与模型铁路连接。'])
  if status=='approximate':data['notes'].append('规划参考：基本曲线半径 216 mm、复线间距 60 mm；厂家公开目录未提供完整尺寸图，施工前请按实物复核。')
  if plugs:data['plugs']=plugs
  old=next((p for p in parts if p['id']==ident),None)
  if old:old.update(data)
  else:parts.append(data)
 for sku,length,label in [('R-01',216,'标准直轨 S216'),('R-02',108,'半直轨 S108'),('R-07',432,'倍长直轨 S432')]:
  add(sku,label,{'type':'straight','length':length},status='dimensions',plugs=['female','male'],note='官方 FAQ 确认 R-01 长 216 mm；半长、倍长按官方产品比例换算。尺寸来源：'+FAQ)
 for variant,plugs,label in [('FM',['female','male'],'凹凸'),('FF',['female','female'],'双凹'),('MM',['male','male'],'双凸')]:
  add('R-20','1/4 直轨 S54 · '+label,{'type':'straight','length':54},status='dimensions',plugs=plugs,variant=variant,note='官方目录列出三种接口；长度按标准直轨的 1/4 换算，接口方向不影响中心线长度。')
 add('R-03','标准弯轨 R216–45°',{'type':'curve','radius':216,'angle':45},'弯轨',plugs=['female','male'],note='官方：8 节成圆；45° 已确认，半径采用规划参考值。')
 add('R-21','倍角弯轨 R216–90°',{'type':'curve','radius':216,'angle':90},'弯轨',plugs=['female','male'],note='官方：4 节成圆；90° 已确认，半径采用规划参考值。')
 add('R-04','复线直轨 DS216',{'type':'doubleStraight','length':216,'spacing':60},'复线',note='与 R-05 配合构建复线；中心线间距为规划参考值。')
 add('R-05','复线弯轨 R276/216–45°',{'type':'doubleCurve','radius':276,'spacing':60,'angle':45},'复线',note='两条同心曲线，尺寸为规划参考值。')
 add('R-09','外侧弯轨 R276–45°',{'type':'curve','radius':276,'angle':45},'弯轨',plugs=['female','male'],note='官方：与 R-05 外侧相同；半径为规划参考值。')
 add('R-08','停止轨 S216',{'type':'straight','length':216},'特殊',plugs=['female','male'],note='停止轨中心线示意，不模拟机械停车开关或附送车挡。')
 for hand,variant in [('left','L'),('right','R')]:
  add('R-11','分岔轨 '+variant,{'type':'turnout','length':216,'radius':216,'angle':45,'hand':hand},'道岔',variant=variant,note='官方 R-11 包含 L/R 各一节；分岔采用简化直线与圆弧，非实测几何，凹凸接口需现场核对。')
 add('R-26','高架直轨 S216',{'type':'straight','length':216},'高架 / 桥梁',status='dimensions',appearance='plarailElevated',plugs=['female','male'],note='官方说明与基本直轨同长；使用楼层功能设定高架标高。')
 add('R-27','高架弯轨 R216–45°',{'type':'curve','radius':216,'angle':45},'高架 / 桥梁',appearance='plarailElevated',plugs=['female','male'],note='官方说明与基本曲轨同曲率；使用楼层功能设定高架标高。')
 return parts
if __name__=='__main__':
 f=Path(__file__).resolve().parents[1]/'dist/catalog.json'
 data=json.loads(f.read_text());apply(data['parts']);data['counts']=dict(collections.Counter(p['status'] for p in data['parts']));data['supplemented']='2026-10-28';f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
