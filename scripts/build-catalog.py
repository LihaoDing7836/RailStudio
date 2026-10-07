"""Build a source-linked catalog. No invented SKUs; uncertain geometries remain explicit."""
import pathlib,csv,re,json,html,unicodedata,collections
ROOT=pathlib.Path(__file__).resolve().parents[1]; P=ROOT/'research'; sources=json.loads((P/'sources.json').read_text()); parts=[]
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def norm(s):return unicodedata.normalize('NFKC',s).replace('−','-').replace('−','-').replace('－','-').replace('゜','°')
def add(brand,sku,name,source,scale='N',text='',category='',variant='',g=None):
 name=norm(name); full=norm(text); notes=[]; status='nominal'; spacing=37 if brand=='TOMIX' else 33
 p={'id':f'{brand}-{scale}-{sku}'+(f'-{variant}' if variant else ''),'brand':brand,'scale':scale,'sku':sku,'name':name,'source':source,'category':category,'geometry':g or {},'status':status,'notes':notes}
 n=name
 if not g:
  if ('ポイント' in n or 'クロッシング' in n or '交差線路' in n) and not any(x in n for x in ['ポイント分岐用','補助直線']):pass
  elif 'アプローチ' in n:pass
  elif any(x in n for x in ['交差点','併専境界','安全側線']):pass
  elif re.search(r'DC(\d+(?:\.\d+)?)[・･](\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)',n):
   m=re.search(r'DC(\d+(?:\.\d+)?)[・･](\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)',n);r1,r2,a=map(float,m.groups());g={'type':'doubleCurve','radius':max(r1,r2),'spacing':abs(r1-r2),'angle':a}
  elif re.search(r'(?:R)?(\d{3,4})/(\d{3,4})(?:mm)?[-ー]?(\d+(?:\.\d+)?)[°]?',n) and '曲線' in n:
   m=re.search(r'(?:R)?(\d{3,4})/(\d{3,4})(?:mm)?[-ー]?(\d+(?:\.\d+)?)[°]?',n);r1,r2,a=map(float,m.groups());g={'type':'doubleCurve','radius':max(r1,r2),'spacing':abs(r1-r2),'angle':a}
  elif re.search(r'[RC](\d+(?:\.\d+)?)[-ー](\d+(?:\.\d+)?)',n) and any(x in n for x in ['カーブ','曲線','HC']):
   m=re.search(r'[RC](\d+(?:\.\d+)?)[-ー](\d+(?:\.\d+)?)',n);r,a=map(float,m.groups());g={'type':'curve','radius':r,'angle':a}
  elif re.search(r'(?:D?S|HS)(\d+(?:\.\d+)?)',n):
   l=float(re.search(r'(?:D?S|HS)(\d+(?:\.\d+)?)',n).group(1));g={'type':'doubleStraight' if ('複線' in n or 'DS' in n) else 'straight','length':l,'spacing':spacing}
  elif re.search(r'(\d+(?:\.\d+)?)\s*mm',n) and not any(x in n for x in ['曲線','カーブ','間隔変換','ターンテーブル']):
   l=float(re.search(r'(\d+(?:\.\d+)?)\s*mm',n).group(1));g={'type':'doubleStraight' if ('複線' in n or 'ユニトラム' in n) else 'buffer' if '車止め' in n else 'straight','length':l,'spacing':25 if 'ユニトラム' in n else spacing}
 if g:p['geometry']=g;p['status']='dimensions';
 # Categories describe user-facing families, independent of geometry.
 if not category:
  category='道岔' if 'ポイント' in n and not ('分岐用' in n or '補助' in n) else '有轨电车' if ('トラム' in n or '-WT' in n) else '高架 / 桥梁' if any(x in n for x in ['高架','鉄橋']) else '复线' if '複線' in n else '特殊' if any(x in n for x in ['アプローチ','バリアブル','スライド','クロッシング','交差','ターンテーブル','車止め','エンド','フレキシブル','ギャップ','ランプ']) else '弯轨' if any(x in n for x in ['カーブ','曲線']) else '直轨'
 p['category']=category
 if not p['geometry']:p['status']='pending';p['notes']=['官方目录已收录，完整几何尚待核实；暂不可放置。']
 if 'カント' in full or 'アプローチ' in n:p['notes'].append('含超高或超高过渡；本应用仅表示平面几何，铺设时需配合相应过渡轨。')
 if '-WP' in n:p['notes'].append('宽道床；请按官方说明搭配超高过渡轨。')
 m=re.search(r'(\d+)本(?:入|セット)',n+' '+full);p['pack']=int(m.group(1)) if m else None
 p['system']='Fine Track' if brand=='TOMIX' else 'UNITRAM' if 'トラム' in n else 'UNITRACK'
 geom=p['geometry'];t=geom.get('type','');p['label']=('R' if brand=='KATO' else 'C')+f"{geom.get('radius'):g}–{geom.get('angle'):g}°" if t in ['curve','doubleCurve'] else ('DS' if t=='doubleStraight' else 'S')+f"{geom.get('length'):g}" if t in ['straight','doubleStraight','buffer','flex'] else re.sub(r'\([^)]*\)','',n).strip()
 if p['label']==n and len(p['label'])>25:p['label']=p['label'][:25]
 if variant:p['label']+=' · '+variant
 parts.append(p);return p
# TOMIX's current official CSV; rail items plus track-bearing bridge/turntable entries.
rows=list(csv.DictReader((P/'tomix-products.csv').read_text(encoding='utf-8-sig').splitlines()))
for row in rows:
 sku=row['品番'];n=norm(row['商　品　名']);cat=row['小カテゴリ'];
 if row['大カテゴリ']!='cat-rail':continue
 if 'rail' not in cat.split(',') and not (cat=='railetc' and (('鉄橋' in n and re.search(r'[SL]\d+',n)) or 'ターンテーブル' in n)):continue
 src='https://www.tomytec.co.jp/tomix/products/info/?q='+sku
 # Mixed packs are individual placeable geometries tied to the same product SKU.
 if re.search(r'C(103|140|177)(?:-|\()',n):
  r=float(re.search(r'C(\d+)',n).group(1))
  for a in [30,60]:add('TOMIX',sku,n,src,variant=f'{a}°',g={'type':'curve','radius':r,'angle':a})
 elif '端数' in n:
  for l in re.findall(r'(?:S|[・･])(\d+(?:\.\d+)?)',n):add('TOMIX',sku,n,src,variant=l+'mm',g={'type':'straight','length':float(l)})
 else:add('TOMIX',sku,n,src)
# KATO UNITRACK category pages have one card per official catalog SKU.
for filename,url in sources.items():
 if not filename.startswith('kato-') or not (P/filename).exists():continue
 s=(P/filename).read_text()
 if 'unitrack.katomodels.com' in url:
  for block in re.split(r'<li class="bl_product">',s)[1:]:
   m=re.search(r'<h3 class="bl_product_ttl">(.*?)</h3>',block,re.S)
   if not m:continue
   head=m.group(1);nums=re.findall(r'<span>(.*?)</span>',head,re.S)
   if not nums:continue
   sku=clean(nums[0]);name=clean(re.sub(r'<span>.*?</span>','',head,flags=re.S))
   if not re.match(r'^(?:20-|21-|40-)',sku) or any(x in name for x in ['延長コード','延長ケーブル','隣接線路フィーダー','信号機用高架橋']):continue
   if any(q['id']==f'KATO-N-{sku}' for q in parts):continue
   add('KATO',sku,name,url,text=clean(block))
 else:
  scale='HO' if '/ho/' in url else 'N'
  for block in re.findall(r'<tr>(.*?)</tr>',s,re.S):
   m=re.search(r'<span class="number_pc">(.*?)</span>',block,re.S);n=re.search(r'<span class="name">(.*?)</span>',block,re.S)
   if not m or not n:continue
   sku=clean(m.group(1));name=clean(n.group(1))
   if not re.match(r'^(?:2-|40-)',sku) or 'ポイントマシン' in name:continue
   if any(q['id']==f'KATO-{scale}-{sku}' for q in parts):continue
   add('KATO',sku,name,url,text=clean(block),scale=scale)
# Explicit nominal geometries, derived from manufacturer dimension codes / descriptions.
by={(p['brand'],p['scale'],p['sku']):p for p in parts}
def override(brand,scale,sku,g,label=None,approx=False,note=None):
 p=by.get((brand,scale,sku))
 if not p:return
 p['geometry']=g;p['status']='approximate' if approx else 'dimensions';p['notes']=([note] if note else [])
 if approx:p['notes'].append('名义尺寸示意：分岔内部曲线或复合几何尚未逐点核实，施工前请核对原厂图纸。')
 if label:p['label']=label
for sku in ['1271','1272','1281','1282','1225','1226']:
 override('TOMIX','N',sku,{'type':'turnout','length':140,'radius':541,'angle':15,'hand':'right' if int(sku)%2 else 'left'},'PL541-15' if int(sku)%2==0 else 'PR541-15',True)
for sku in ['1273','1274']:
 override('TOMIX','N',sku,{'type':'turnout','length':140,'radius':280,'angle':30,'hand':'right' if int(sku)%2 else 'left'},'P280-30',True)
for sku in ['1231','1232']:
 override('TOMIX','N',sku,{'type':'turnout','length':70,'radius':140,'angle':30,'hand':'right' if int(sku)%2 else 'left'},'P140-30',True)
for sku,l,a in [('1321',72.5,30),('1322',140,15),('1323',140,-15),('1324',37,90),('1799',37,90)]:override('TOMIX','N',sku,{'type':'crossing','length':l,'angle':a},f'X{l}–{a}°')
for sku in ['1525','1526','1528']:override('TOMIX','N',sku,{'type':'straight','length':70,'minLength':70,'maxLength':90},'V70 · 70–90 mm',note='可变直轨：可在属性中调整长度。')
override('TOMIX','N','1671',{'type':'straight','length':70},'G70-W')
override('TOMIX','N','1521',{'type':'straight','length':70},'M70')
for sku in ['1421','1423','1425','1428']:override('TOMIX','N',sku,{'type':'buffer','length':50},'E · 50 mm',True)
override('TOMIX','N','1247',{'type':'crossover','length':280,'spacing':37,'double':True},'PX280',True)
override('TOMIX','N','1240',{'type':'wye','radius':280,'angle':15},'PY280-15',True)
for sku,l,r,a,hand in [('20-202',186,718,15,'left'),('20-203',186,718,15,'right'),('20-220',126,481,15,'left'),('20-221',126,481,15,'right'),('20-240',124,150,45,'left'),('20-241',124,150,45,'right')]:override('KATO','N',sku,{'type':'turnout','length':l,'radius':r,'angle':a,'hand':hand},f'P{r} {"左" if hand=="left" else "右"}',True)
for sku,r in [('20-172',183),('20-174',150),('20-176',117)]:override('KATO','N',sku,{'type':'curve','radius':r,'angle':45},f'R{r}–45°')
for sku,L,A in [('20-300',124,15),('20-301',124,-15),('20-320',60,90)]:override('KATO','N',sku,{'type':'crossing','length':L,'angle':A},f'X{A}°',True)
for sku,L,d in [('20-230',248,False),('20-231',248,False),('20-210',310,True)]:override('KATO','N',sku,{'type':'crossover','length':L,'spacing':33,'double':d},'渡线 '+sku,True)
override('KATO','N','20-222',{'type':'wye','radius':481,'angle':15},'Y 字道岔',True)
override('KATO','N','20-050',{'type':'straight','length':108,'minLength':78,'maxLength':108},'S78–108')
override('KATO','HO','2-194',{'type':'straight','length':246,'minLength':212,'maxLength':252},'S212–252')
# The manufacturer's abbreviated title has a typo, but description specifies R414/381.
override('KATO','N','20-187',{'type':'doubleCurve','radius':414,'spacing':33,'angle':45},'R414/381–45°')
# Split KATO short-track assortment into its real components.
for sku,lengths in [('20-091',[29,45.5]),('20-092',[33,38])]:
 old=by.get(('KATO','N',sku))
 if old:
  parts.remove(old)
  for l in lengths:add('KATO',sku,old['name'],old['source'],variant=f'{l}mm',g={'type':'straight','length':l})

# Safety sidings have one non-running dummy route; only live ports are connectable.
override('TOMIX','N','1297',{'type':'safety','length':140,'radius':541,'angle':15,'hand':'left','live':'straight'},'安全侧线 · PL541',note='仅直线路径可行车；分岔曲线为虚拟轨，不作为可连接端点。')
override('TOMIX','N','1298',{'type':'safety','length':140,'radius':541,'angle':15,'hand':'right','live':'curve'},'安全侧线 · PR541',note='仅曲线路径可行车；直线为虚拟轨，不作为可连接端点。')
# Additional dimensions from official descriptions, not inferred from item numbers.
for p in parts:
 if p['brand']=='KATO' and p['category']=='高架 / 桥梁' and not p['geometry'] and 'アプローチ' not in p['name']:
  n=p['name'];g=None
  if 'デッキガーダー曲線' in n:g={'type':'curve','radius':448,'angle':15}
  elif '鉄橋' in n:
   length=248 if 'トラス' in n else 186 if 'プレートガーダー' in n else 124 if 'デッキガーダー' in n else 0
   if length:g={'type':'doubleStraight' if '複線' in n else 'straight','length':length,'spacing':33}
  if g:override('KATO',p['scale'],p['sku'],g,n)
for sku in ['20-043','20-049']:override('KATO','N',sku,{'type':'doubleStraight','length':62,'spacing':33},'DS62 · 供电轨')
override('KATO','N','20-875',{'type':'straight','length':248},'S248 · PC')
for sku,r in [('20-182',414),('20-184',315),('20-186',480),('20-188',414),('20-545',414)]:
 override('KATO','N',sku,{'type':'doubleCurve','radius':r,'spacing':33,'angle':22.5},f'R{r}/{r-33}–22.5°',note='超高过渡轨；平面半径与角度建模。左右过渡及超高方向须按实物选择。')
for sku,r in [('2-242',730),('2-252',790)]:override('KATO','HO',sku,{'type':'curve','radius':r,'angle':22.5},f'R{r}–22.5° 过渡',note='超高过渡轨；当前只表示平面几何。')
for sku,r in [('1781',280),('1782',317),('1783',354),('1784',391)]:override('TOMIX','N',sku,{'type':'curve','radius':r,'angle':22.5},f'C{r}–22.5° 过渡',note='超高过渡轨；当前只表示平面几何。')
for sku in ['21-000','21-001']:override('KATO','N',sku,{'type':'flex','length':808,'minLength':20,'maxLength':808},'柔性轨 · 808 mm',note='可裁切及弯曲；属性中设置长度与圆弧角度。连接成品道床轨需转换轨。')
for sku in ['40-301','40-301-E']:override('KATO','N',sku,{'type':'doubleCrossing','length':62,'spacing':25},'双线交叉 · 62 mm')
for sku in ['20-051','20-052']:override('KATO','N',sku,{'type':'transition','length':310,'spacing':33,'endSpacing':66},'33 → 66 mm',True)
override('KATO','N','40-025',{'type':'transition','length':124,'spacing':25,'endSpacing':33},'25 → 33 mm',True)
# Verify short-track assortment against its dedicated manufacturer page.
for p in parts:
 if p['brand']=='KATO' and p['sku']=='20-092':p['source']='https://www.katomodels.com/product/n/unitrack_s33_s38'

import runpy
runpy.run_path(str(ROOT/'scripts/track-supplements.py'))['apply'](parts)

# No fictitious product IDs or generic shapes for unresolved turntables / compound points.
parts.sort(key=lambda p:(p['brand'],p['scale'],p['category'],p['sku'],p['id']))
counts=collections.Counter(p['status'] for p in parts)
output={'version':1,'retrieved':'2026-09-26','scope':'日本官方公开目录快照：TOMIX Fine Track N；KATO UNITRACK N / HO、UNITRAM。含已列出的套装内几何变体；不承诺停产产品与海外专用品完整。','sources':list(dict.fromkeys(p['source'] for p in parts if p['brand']=='KATO'))+['https://www.tomytec.co.jp/tomix/common/csv/products_list.csv'],'parts':parts,'counts':dict(counts)}
(ROOT/'dist/catalog.json').write_text(json.dumps(output,ensure_ascii=False,indent=2))
print(len(parts),'parts',counts)
for p in parts:
 if p['status']=='pending':print(p['brand'],p['scale'],p['sku'],p['name'])
