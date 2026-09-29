"""Collect official building listings and explicit model dimensions; never guess sizes.
Cached source pages remain under research/buildings. Run with --refresh to refetch.
"""
import sys, re, json, hashlib, subprocess, datetime, html, unicodedata
from pathlib import Path
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import train_sources as src
CACHE=ROOT/'research/buildings/cache';CACHE.mkdir(parents=True,exist_ok=True)
errors=[]
def fetch(url):
 p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
 if p.exists() and '--refresh' not in sys.argv:return p.read_text()
 # Reuse previously downloaded official train index pages.
 old=src.CACHE/p.name
 if old.exists() and '--refresh' not in sys.argv:return old.read_text()
 r=subprocess.run(['curl','-fLs','--retry','1','--max-time','25',url],capture_output=True)
 if r.returncode:errors.append(url);return ''
 raw=r.stdout
 charset='cp932' if re.search(br'charset\s*=\s*["\']?(?:shift[_-]jis|x-sjis|sjis)',raw[:3000],re.I) else 'utf-8'
 text=raw.decode(charset,errors='replace');p.write_text(text);return text
clean=src.clean

def dimensions(text):
 t=unicodedata.normalize('NFKC',clean(text)).replace('×','x').replace('約','').replace('横','W').replace('奥行き','D').replace('奥行','D').replace('高さ','H').replace('幅','W').replace('全高:','H')
 # Labelled measurements only, all three dimensions, explicit/inherited units.
 matches=[]
 pattern=r'([WDH])\s*([\d.]+)\s*(mm|cm)?\s*x?\s*([WDH])\s*([\d.]+)\s*(mm|cm)?\s*x?\s*([WDH])\s*([\d.]+)\s*\(?(mm|cm)?'
 for m in re.finditer(pattern,t,re.I):
  unit=m[3] or m[6] or m[9] or ('cm' if '(cm)' in t else None)
  if not unit or len({m[1].upper(),m[4].upper(),m[7].upper()})!=3:continue
  f=10 if unit.lower()=='cm' else 1
  fields={m[i].upper():float(m[i+1])*f for i in [1,4,7]}
  vals=tuple(fields[k] for k in ['W','D','H'])
  if all(1<=x<=5000 for x in vals):matches.append(vals)
 if not matches:
  for m in re.finditer(r'W\s*([\d.]+)\s*(mm|cm)\s*x\s*D\s*([\d.]+)\s*(mm|cm)',t,re.I):
   w=float(m[1])*(10 if m[2].lower()=='cm' else 1);d=float(m[3])*(10 if m[4].lower()=='cm' else 1)
   if 1<=w<=5000 and 1<=d<=5000:matches.append((w,d,None))
 unique=set(matches)
 if len(unique)==1:
  w,d,h=next(iter(unique));return {'width':w,'depth':d,**({'height':h} if h is not None else {})}
 return None

def product_dimensions(text,sku,name):
 # Prefer a SKU's own measurement line, then its named paragraph.
 t=clean(text)
 code=re.search(re.escape(sku)+r'(?![\w-])(.{0,120})',t)
 if code:
  d=dimensions(re.split(r'●|23-\d+',code[1])[0])
  if d:return d
 normalized=unicodedata.normalize('NFKC',t)
 target=unicodedata.normalize('NFKC',name).rstrip(' *')
 start=normalized.find(target)
 if start>=0:
  tail=normalized[start+len(target):]
  tail=re.split(r'●|[①②③④⑤⑥⑦⑧⑨⑩]',tail)[0]
  d=dimensions(tail)
  if d:return d
 return dimensions(text)

def kind(name):
 for pat,k in [('寺|神社|社殿','temple'),('工場|倉庫|機関庫|車庫|電車庫','factory'),('駅|ホーム','station'),('ビル|マンション|病院|学校|ホテル','tower'),('商店|店舗|店|郵便|銀行','shop')]:
  if re.search(pat,name):return k
 return 'house'

def row(brand,sku,name,url,dimtext='',image=''):
 d=dimensions(dimtext)
 return dict(id='building-'+brand.lower()+'-'+re.sub(r'[^\w-]+','-',sku),brand=brand,sku=sku,name=name,label=name,scale='N',category='建筑',kind='building',buildingKind=kind(name),geometry={'type':'building'},dimensions=d,dimensionText=clean(dimtext),status='dimensions' if d else 'pending-dimensions',source=url,image_url=image,notes=['俯视建筑为按占地尺寸绘制的示意模型；外观请参照官网产品照片。'],retrieved=datetime.date.today().isoformat())

def tomix():
 first='https://www.tomytec.co.jp/tomix/products/building/index.html';todo={first};seen=set();items={}
 while todo:
  batch=sorted(todo-seen)
  if not batch:break
  seen.update(batch);todo=set()
  for url,t in zip(batch,map(fetch,batch)):
   todo.update(urljoin(url,x) for x in re.findall(r'href="([^"]*building/index(?:_\d+)?\.html)"',t))
   for path,name in re.findall(r'<a href="(/tomix/products/n/[^"#]+\.html)"[^>]*>(.*?)</a>',t,re.S):
    m=re.match('＜([^＞]+)＞(.*)',clean(name))
    if m:items[m[1]]=row('TOMIX',m[1],m[2],urljoin(url,path))
 def enrich(r):
  t=fetch(r['source']);r['image_url']=src.photo_fields(t,r['source'],'TOMIX').get('image_url','')
  # Isolate description; unlabelled or ambiguous measurements stay unverified.
  lines=[clean(x) for x in re.split(r'<br\s*/?>|</p>|</li>',t) if re.search('寸法|サイズ|[ＷW].*[ＤD].*[ＨH]',clean(x))]
  r['dimensionText']=' '.join(lines)[-3000:];r['dimensions']=dimensions(r['dimensionText']);r['status']='dimensions' if r['dimensions'] else 'pending-dimensions';return r
 with ThreadPoolExecutor(max_workers=4) as pool:out=list(pool.map(enrich,items.values()))
 print('TOMIX',len(out),flush=True);return out

def kato():
 first='https://www.katomodels.com/product';t=fetch(first);pages=max(map(int,re.findall(r'product\?page=(\d+)',t)),default=1)
 items={}
 def parse(url):
  rows=[]
  for block in re.findall(r'<li\b[^>]*>(.*?)</li>',fetch(url),re.S):
   m=re.search(r'<a href="(https://www.katomodels.com/product/n/[^"]+)"[^>]*>(.*?)</a>',block,re.S)
   if not m:continue
   name=clean(m[2]);code=re.search(r'\[(23-[^\]]+)\]$',name)
   if not code:continue
   name=name[:code.start()].strip()
   if not re.search('家|住宅|ビル|店|駅|ホーム|庫|工場|学校|病院|ホテル|詰所|機関区|タワー|給炭|給水',name) or re.search('照明|人形|シール|パーツ|乗用車|自動車|道路|階段|アクセサリー',name):continue
   pic=re.search(r'<img[^>]+src="([^"]+)"[^>]*alt="商品画像"',block)
   rows.append(row('KATO',code[1],name,m[1],image=html.unescape(pic[1]) if pic else ''))
  return rows
 with ThreadPoolExecutor(max_workers=4) as pool:
  for rows in pool.map(parse,[first+'?page='+str(n) for n in range(1,pages+1)]):
   for r in rows:items[r['id']]=r
 urls=sorted(set(r['source'] for r in items.values()))
 with ThreadPoolExecutor(max_workers=4) as pool:details=dict(zip(urls,pool.map(fetch,urls)))
 for r in items.values():
  t=details[r['source']];m=re.search(r'<div class="word-break">(.*?)</div>',t,re.S);txt=m[1] if m else ''
  r['dimensionText']=clean(txt);r['dimensions']=product_dimensions(txt,r['sku'],r['name']);r['status']='dimensions' if r['dimensions'] else 'pending-dimensions'
 print('KATO',len(items),flush=True);return list(items.values())

def tomytec():
 first='https://www.tomytec.co.jp/diocolle/lineup/tatemono/index.html';t=fetch(first)
 urls={first}|{urljoin(first,x) for x in re.findall(r'href="([^"#]+\.html)"',t) if re.match(r'(?:index_\d+|tate\d+|tatemono_\d+)\.html',x)}
 def parse(url):
  text=fetch(url);rows=[]
  for m in re.finditer(r'<table\b[^>]*class="table_info"[^>]*>(.*?)</table>',text,re.S):
   table=m[1];cells={}
   for tr in re.findall(r'<tr[^>]*>(.*?)</tr>',table,re.S):
    cs=re.findall(r'<td[^>]*>(.*?)</td>',tr,re.S)
    if len(cs)>=2:cells[clean(cs[0])]=clean(cs[1])
   name=unicodedata.normalize('NFKC',next((v for k,v in cells.items() if '商品名' in k),''))
   match=re.search(r'建コレ\s*([\d]+(?:-\d+[A-Z]?)?)',name)
   if not match:continue
   dim=' '.join(k+' '+v for k,v in cells.items() if '寸' in k or 'サイズ' in k)
   before=text[max(0,text.rfind('<h4',0,m.start())):m.start()];imgs=re.findall(r'<img[^>]+src="([^"]+)"',before);anchors=re.findall(r'<h4[^>]*id="([^"]+)"',before)
   rows.append(row('TOMYTEC',match[1],name,url+('#'+anchors[-1] if anchors else ''),dim,urljoin(url,imgs[0]) if imgs else ''))
  return rows
 items={}
 with ThreadPoolExecutor(max_workers=4) as pool:
  for rows in pool.map(parse,sorted(urls)):
   for r in rows:
    if r['id'] not in items or r['dimensions']:items[r['id']]=r
 print('TOMYTEC',len(items),flush=True);return list(items.values())

def tomytec_current():
 base='https://diocolle.tomytec.co.jp';out=[]
 for page in range(1,100):
  cache=CACHE/('tomytec-page-'+str(page)+'.json')
  if cache.exists() and '--refresh' not in sys.argv:data=json.loads(cache.read_text())
  else:
   result=subprocess.run(['curl','-fLs','--retry','1','--max-time','25','-d',f'page={page}&collection_id=10&addType=add',base+'/lineup/common/include/lineup.php'],capture_output=True)
   if result.returncode:raise RuntimeError('Current TOMYTEC index failed')
   data=json.loads(result.stdout);cache.write_text(json.dumps(data,ensure_ascii=False))
  for block in re.findall(r'<li>(.*?)</li>',data['dblineup_src'],re.S):
   name=re.search(r'<p class="name bold">(.*?)</p>',block,re.S);link=re.search(r'href="([^"]+)"',block);image=re.search(r'<img src="([^"]+)"',block)
   if not name or not link:continue
   name=unicodedata.normalize('NFKC',clean(name[1])).replace('―','-').replace('ー3','-3');code=re.search(r'(?:建コレ|建物コレクション)\s*(\d+(?:-\d+[A-Z]?)?)|ペーパーストラクチャー\s*([CP]\d+)',name)
   if not code or re.search('製品化中止|高速道路',name):continue
   out.append(row('TOMYTEC',code[1] or code[2],name,urljoin(base,link[1]),image=urljoin(base,image[1]) if image else ''))
  if not data.get('btn_flg'):break
 def enrich(r):
  t=fetch(r['source']);pre=re.findall(r'<pre[^>]*>(.*?)</pre>',t,re.S)
  r['dimensionText']=clean(' '.join(pre));r['dimensions']=dimensions(r['dimensionText']);r['status']='dimensions' if r['dimensions'] else 'pending-dimensions';return r
 with ThreadPoolExecutor(max_workers=4) as pool:out=list(pool.map(enrich,out))
 print('TOMYTEC current',len(out),flush=True);return out

if __name__=='__main__':
 records=tomix()+kato()+tomytec()+tomytec_current()
 records=list({r['id']:r for r in records}.values())
 from train_images import cache_official_photos
 for r in records:r['source_url']=r['source']
 cache_official_photos({'trains':records})
 from building_images import cache_images
 cache_images(records)
 if errors:print('Failed source pages:',len(errors),flush=True)
 if not all(any(r['brand']==b for r in records) for b in ['TOMIX','KATO','TOMYTEC']):raise SystemExit('Missing brand; snapshot not published')
 out=ROOT/'dist/data/buildings.json'
 if errors and out.exists():
  previous={r['id']:r for r in json.loads(out.read_text())['parts']}
  records=[previous.get(r['id'],r) if r['source'] in errors else r for r in records]
 temporary=out.with_suffix('.json.tmp')
 temporary.write_text(json.dumps({'updated':datetime.date.today().isoformat(),'scope':'官网可检索的 N 比例建筑与车站设施；缺失尺寸需手动确认，不代表历史全量。','failed_sources':errors,'parts':records},ensure_ascii=False,indent=2))
 temporary.replace(out)
 print('Total',len(records),'with dimensions',sum(bool(r['dimensions']) for r in records),flush=True)
