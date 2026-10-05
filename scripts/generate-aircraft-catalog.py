"""Curated official aircraft dimensions; URLs are kept on every entry. Model geometry is original schematic artwork."""
import json
from pathlib import Path
parts=[]
def add(brand,name,L,W,H,source,engines=2,profile='jet',note=''):
 parts.append(dict(id='AIR-200-'+name.replace(' ','-'),brand=brand,sku=name,name=name,label=name,kind='aircraft',scale='1:200',category='四发客机' if engines==4 else '宽体客机' if W>45 else '窄体 / 支线',geometry={'type':'aircraft'},dimensions={'length':round(L*5,3),'width':round(W*5,3),'height':round(H*5,3)},prototype={'length':L,'wingspan':W,'height':H},engines=engines,profile=profile,source=source,status='dimensions',notes=[x for x in [note,'长、翼展、高按原型 1:200 换算；机身曲面、机翼和发动机为自绘示意，不代表某品牌成品模具。'] if x],retrieved='2026-10-05'))
base='https://www.boeing.com/commercial/'
for name,L in [('737-700',33.6),('737-800',39.5),('737-900',42.1)]:add('Boeing',name,L,35.8,12.5,base+'737ng',note='带翼梢小翼构型。')
for name,L in [('737 MAX 7',35.6),('737 MAX 8',39.5),('737 MAX 9',42.1),('737 MAX 10',43.8)]:add('Boeing',name,L,35.9,12.3,base+'737max')
for name,L,W,H in [('777-200ER',63.7,60.9,18.5),('777-200LR',63.7,64.8,18.6),('777-300ER',73.9,64.8,18.5)]:add('Boeing',name,L,W,H,base+'777')
for name,L,H in [('787-8',56.7,16.9),('787-9',62.8,17),('787-10',68.3,17)]:add('Boeing',name,L,60.1,H,base+'787')
for name,L in [('777-8',70.9),('777-9',76.7)]:add('Boeing',name,L,71.8,19.5,base+'777x',note='翼尖展开构型；折叠后地面翼展为 64.8 m，可在属性中把模型翼展改为 324 mm。')
add('Boeing','747-8I',76.3,68.4,19.4,'https://www.boeing.com/content/dam/boeing/boeingdotcom/company/about_bca/startup/pdf/historical/747-8I_-_passenger.pdf',4,'hump')
a='https://www.aircraft.airbus.com/en/aircraft/'
for name,L in [('A319neo',33.84),('A320neo',37.57),('A321neo',44.51)]:add('Airbus',name,L,35.8,11.76,a+'a320-family/'+name.lower())
for name,L in [('A220-100',35),('A220-300',38.7)]:add('Airbus',name,L,35.1,11.5,'https://www.airbus.com/sites/g/files/jlcbta136/files/2025-11/EN-Airbus-A220-Facts-and-Figures-November-2025.pdf')
add('Airbus','A330-900',63.69,64,16.79,a+'a330/a330-900')
for name,L,H in [('A350-900',66.8,17.05),('A350-1000',73.78,17.08)]:add('Airbus',name,L,64.75,H,'https://www.airbus.com/sites/g/files/jlcbta136/files/2025-11/Airbus-A350-Family-Facts-and-Figures%20November%202025.pdf')
add('Airbus','A380-800',72.7,79.8,24.1,'https://www.airbus.com/sites/g/files/jlcbta136/files/2021-10/EN-Airbus-A380-Facts-and-Figures_0.pdf',4,'doubledeck')
add('COMAC','C919',38.9,35.8,11.95,'https://www.icao.int/APAC/Meetings/2024%20AOPSG8/WP26%20-%20THE%20AIRPORT%20CHARACTERISTICS%20OF%20C919%20presentation.pdf')
for name,L in [('A319',33.84),('A320',37.57),('A321',44.51)]:add('Airbus',name,L,35.8,11.76,'https://www.airbus.com/sites/g/files/jlcbta136/files/2021-09/EN-Airbus-A320-Facts-and-Figures.pdf',note='采用官方表格的 Sharklet 构型翼展。')
for name,L,W,H in [('A330-200',58.82,60.3,17.39),('A330-300',63.66,60.3,16.79),('A330-800',58.36,64,17.39)]:add('Airbus',name,L,W,H,a+'a330/'+name.lower())
parts.append(dict(id='AIR-200-CUSTOM',brand='自定义',sku='CUSTOM',name='自定义飞机',label='自定义飞机',kind='aircraft',scale='1:200',category='自定义',geometry={'type':'aircraft'},dimensions={'length':200,'width':180,'height':60},engines=2,profile='jet',source='',status='approximate',notes=['输入实物模型的机长、翼展、高度和名称；默认尺寸仅为占位。']))
(Path(__file__).resolve().parents[1]/'dist/data/aircraft.json').write_text(json.dumps({'scale':'1:200','retrieved':'2026-10-05','scope':str(len(parts)-1)+' 个民航机型与自定义入口；按机型而非涂装或模型商品编号归类。','parts':parts},ensure_ascii=False,indent=2)+'\n')
print(len(parts),'aircraft entries')
