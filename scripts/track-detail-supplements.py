"""Track display dimensions and terminal stops; verified sources, 2026-10-31.
Nominal specifications are separate from imported path geometry.
"""

def apply(parts):
 by={p['id']:p for p in parts}
 source='https://katousa.com/wp-content/uploads/2023/12/Unitrack-Catalog-final.pdf'
 # name, millimetres/degrees, unit. Do not sum the branches of a turnout as its length.
 specs={
 '20-210': [('长度',310,'mm'),('线间距',33,'mm')],
 '20-202': [('长度',186,'mm'),('半径',718,'mm'),('分岔角',15,'°')],
 '20-203': [('长度',186,'mm'),('半径',718,'mm'),('分岔角',15,'°')],
 '20-220': [('半径',481,'mm'),('分岔角',15,'°')],
 '20-221': [('半径',481,'mm'),('分岔角',15,'°')],
 '20-222': [('半径',481,'mm'),('单侧分岔角',15,'°')],
 '20-230': [('长度',248,'mm'),('线间距',33,'mm')],
 '20-231': [('长度',248,'mm'),('线间距',33,'mm')],
 '20-240': [('长度',124,'mm'),('半径',150,'mm'),('分岔角',45,'°')],
 '20-241': [('长度',124,'mm'),('半径',150,'mm'),('分岔角',45,'°')],
 '20-300': [('长度',186,'mm'),('交叉角',15,'°')],
 '20-301': [('长度',186,'mm'),('交叉角',15,'°')],
 '20-320': [('交叉本体',33,'mm'),('附加直轨',45.5,'mm'),('交叉角',90,'°')],
 '21-011': [('长度',124,'mm')],
 '20-652': [('套装踏切轨',124,'mm'),('传感器轨',62,'mm')],
 '20-653': [('套装踏切轨',124,'mm'),('传感器轨',62,'mm')],
 }
 labels={'20-210':'WX310 · 双渡线','20-230':'SX248L · 左渡线','20-231':'SX248R · 右渡线','20-202':'P718-15 左','20-203':'P718-15 右','20-220':'P481-15 左','20-221':'P481-15 右','20-222':'Y481-15 · Y 字道岔','20-240':'P150-45 左','20-241':'P150-45 右','21-011':'S124U · 解钩轨'}
 for sku,rows in specs.items():
  p=by.get('KATO-N-'+sku)
  if not p:continue
  p['dimensionSpecs']=[{'name':name,'value':value,'unit':unit} for name,value,unit in rows]
  p['dimensionSource']=source
  if sku in labels:p['label']=labels[sku]
  if sku in ['20-652','20-653']:p['dimensionSource']='https://www.katomodels.com/unitrackplan/plan/plan06-15_partslist.pdf'
  if sku=='21-011':p['dimensionSource']='https://www.e-katomodels2.com/img/goods/2/KATO596712354.pdf'
 for sku,code,title,style in [('1421','E','钢架路阻','steel'),('1423','E','LED 路阻','led'),('1425','E-WI','宽版路阻','wide'),('1428','E-PC','PC 枕木 LED 路阻','led')]:
  p=by.get('TOMIX-N-'+sku)
  if not p:continue
  p.update(category='路阻 / 车挡',label=code+' · '+title,source=f'https://www.tomytec.co.jp/tomix/products/n/{sku}.html',bufferStop={'style':style})
  # Existing imported terminal paths retain their single connectable port.
  if sku=='1425':
   p.update(geometry={'type':'buffer','length':40},status='dimensions',appearance='wide',pack=2,
    dimensionSpecs=[{'name':'长度','value':40,'unit':'mm'},{'name':'道床宽','value':37,'unit':'mm'}],dimensionSource=p['source'],
    notes=['官方规格：长 40 mm、宽 37 mm；包装含 2 节，放置和清单按单节统计。'])
  elif sku=='1428':
   p['appearance']='pc';p['notes']=['路阻外观为示意；尚未核实官方轨长，当前沿用 50 mm 规划长度，请按实物复核。']
  else:
   note='显示的是现有参数库的走行段尺寸，不是已核实的实物总长；路阻外观为示意。'
   if note not in p.setdefault('notes',[]):p['notes'].append(note)
 for p in parts:
  if p.get('geometry',{}).get('type')=='buffer':p['category']='路阻 / 车挡'
 return parts
