"""Collect public manufacturer listings; never label current prices as launch prices."""
import concurrent.futures as cf
import hashlib, html, json, re, subprocess, os
from pathlib import Path
from urllib.parse import urljoin, urlparse
from html.parser import HTMLParser

class PhotoParser(HTMLParser):
    def __init__(self,brand,url):
        super().__init__();self.brand=brand;self.url=url;self.images=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);classes=a.get('class','').split()
        value=None
        if self.brand=='TOMIX' and tag=='a' and any(x in classes for x in ['p-products-details-image__top','p-products-details-image__list-link']):value=a.get('href')
        if self.brand=='KATO' and tag=='img' and (a.get('id')=='MainPhoto' or 'ChangePhoto' in classes):value=a.get('src')
        if value:
            image=urljoin(self.url,html.unescape(value))
            if image.startswith('https://') and urlparse(image).hostname in ['www.tomytec.co.jp','www.katomodels.com','s3-ap-northeast-1.amazonaws.com'] and not re.search(r'no[_-]?image|coming[_-]?soon',image,re.I) and image not in self.images:self.images.append(image)

def photo_fields(text,url,brand):
    parser=PhotoParser(brand,url);parser.feed(text)
    if not parser.images:return {}
    return dict(image_url=parser.images[0],image_gallery=parser.images,image_source=url,image_scope='series' if brand=='KATO' else 'product')

def tomix_index_photos(text,url):
    photos={}
    for path,body in re.findall(r'<a href="(/tomix/products/n/[^"#]+\.html)"[^>]*>(.*?)</a>',text,re.S):
        code=re.search(r'＜([^＞]+)＞',clean(body));image=re.search(r'<img[^>]+src="([^"]+)"',body)
        if code and image:
            photos[code[1]]=dict(image_url=urljoin(url,html.unescape(image[1])),image_source=url,image_scope='product')
    return photos

ROOT=Path(__file__).resolve().parents[1]/'research'/'trains'
CACHE=Path(os.environ.get('TRAIN_CACHE',str(ROOT/'cache')))
CACHE.mkdir(parents=True,exist_ok=True)
ERRORS=[]
def fetch(url):
    p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
    if p.exists(): return p.read_text()
    r=subprocess.run(['curl','-fLs','--retry','1','--max-time','25',url],capture_output=True)
    if r.returncode:
        ERRORS.append(url);return ''
    text=r.stdout.decode('utf-8',errors='replace');p.write_text(text);return text
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def count(name):
    m=re.search(r'(\d+)\s*[両辆輛]',name);return int(m[1]) if m else None
def is_vehicle_set(sku,name):
    return bool(re.match(r'^(10-|106-|K\d)',sku)) and 'セット' in name and count(name)!=1 and not re.search('スターター|トータル|レール|線路|車輪|カプラー|台車|室内灯|ライトユニット|パンタグラフ|グレードアップ|動力ユニット|ケース|パーツ',name)
def row(brand,sku,name,url,price=None,date='',composition=''):
    return dict(brand=brand,sku=sku,name=name,scale='N',cars=count(name),composition=composition or None,price=price,currency='JPY' if price is not None else None,price_basis='官网当前目录价（含税）' if price is not None else '未查到',date_as_listed=date,source_url=url,retrieved='2026-09-29',scope_note='官网仍可检索；不代表历史全量；发行日期可能为再版或预告')
def kato(url):
    out=[]
    for block in re.findall(r'<li\b[^>]*>(.*?)</li>',fetch(url),re.S):
        m=re.search(r'<a href="(https://www.katomodels.com/product/n/[^"]+)"[^>]*>(.*?)</a>',block,re.S)
        if not m:continue
        name=clean(m[2]);code=re.search(r'\[([^\]]+)\]$',name)
        if not code or not is_vehicle_set(code[1],name):continue
        name=name[:code.start()].strip()
        if count(name)==1:continue
        price=re.search(r'class="price"[^>]*>.*?([\d,]+)円',block,re.S)
        day=re.search(r'class="day"[^>]*>(.*?)</span>',block,re.S)
        item=row('KATO',code[1],name,m[1],int(price[1].replace(',','')) if price else None,clean(day[1]) if day else '')
        thumb=re.search(r'<img[^>]+src="([^"]+)"[^>]*alt="商品画像"',block)
        if thumb:item.update(image_url=urljoin(m[1],html.unescape(thumb[1])),image_source=url,image_scope='series')
        out.append(item)
    return out
def kato_detail(url):
    text=fetch(url);out=[]
    photos=photo_fields(text,url,'KATO')
    image=re.search(r'<img[^>]*src="([^"]+)"[^>]*alt="編成例"',text)
    formation=html.unescape(image[1]) if image else None
    for tr in re.findall(r'<tr\b[^>]*>(.*?)</tr>',text,re.S):
        code=re.search(r'class="number_pc"[^>]*>(.*?)</span>',tr,re.S)
        name=re.search(r'<td class="name"[^>]*>(.*?)</td>',tr,re.S)
        if not code or not name:continue
        sku=clean(code[1]);name=clean(name[1]);name=re.sub(r'^NEW\s*','',name)
        if not is_vehicle_set(sku,name):continue
        def cell(kind):
            match=re.search(r'<td class="'+kind+r'"[^>]*>(.*?)</td>',tr,re.S)
            return clean(match[1]) if match else ''
        price=cell('price');amount=re.search(r'[￥¥]\s*([\d,]+)',price)
        item=row('KATO',sku,name,url,int(amount[1].replace(',','')) if amount else None,cell('date'))
        item.update(jan=cell('jan_code'),announced_price='予' in price,formation_url=formation)
        item.update(photos)
        out.append(item)
    return out,formation
def tomix_index(url):
    text=fetch(url);out=[]
    for path,name in re.findall(r'<a href="(/tomix/products/n/[^"#]+\.html)"[^>]*>(.*?)</a>',text,re.S):
        name=clean(name);m=re.match('＜([^＞]+)＞(.*)',name)
        if m and 'セット' in m[2] and not re.search('ベーシック|トータル|レール|ファーストカーミュージアム',m[2]):out.append(row('TOMIX',m[1],m[2].strip(),'https://www.tomytec.co.jp'+path))
    links=re.findall(r'href="(/tomix/products/train/index(?:_\d+)?\.html)"',text)
    return out,['https://www.tomytec.co.jp'+x for x in links]
def tomix_detail(r):
    t=fetch(r['source_url'])
    r.update(photo_fields(t,r['source_url'],'TOMIX'))
    for tr in re.findall(r'<tr\b[^>]*>(.*?)</tr>',t,re.S):
        cells=[clean(x) for x in re.findall(r'<t[hd]\b[^>]*>(.*?)</t[hd]>',tr,re.S)]
        if len(cells)>1 and cells[0]=='価格':
            m=re.search(r'([\d,]+)円',cells[1])
            if m:r.update(price=int(m[1].replace(',','')),currency='JPY',price_basis='官网当前目录价（含税）')
        if len(cells)>1 and '発売' in cells[0]:r['date_as_listed']=cells[1]
    m=re.search(r'【車両】(.*?)(?:【|</div>|</section>)',t,re.S)
    if m:
        parts=[clean(x).lstrip('●・ ').strip() for x in re.split(r'<br\s*/?>|●',m[1]) if clean(x).lstrip('●・ ').strip()]
        s=' '.join('●'+x for x in parts);r['composition']=s
        n=count(s)
        if n:r['cars']=n
        elif '●' in s:
            r['cars']=sum(int(m[1]) if (m:=re.search(r'[×xｘ]\s*(\d+)',x)) else 1 for x in s.split('●') if x.strip())
    return r
if __name__=='__main__':
    records={};seen=set();todo=['https://www.tomytec.co.jp/tomix/products/train/index.html']
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        while todo:
            batch=[x for x in todo if x not in seen];seen.update(batch);todo=[]
            for rows,links in ex.map(tomix_index,batch):
                for r in rows:records[(r['brand'],r['sku'])]=r
                todo.extend(x for x in links if x not in seen)
            todo=list(set(todo));print('TOMIX index pages',len(seen),'sets',len(records),flush=True)
        rows=list(records.values())
        for i,r in enumerate(ex.map(tomix_detail,rows)):
            records[(r['brand'],r['sku'])]=r
            if i%100==0:print('TOMIX details',i,flush=True)
        (ROOT/'catalog.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2))
        first=fetch('https://www.katomodels.com/product');pages=max(map(int,re.findall(r'product\?page=(\d+)',first)))
        for i,rows in enumerate(ex.map(kato,['https://www.katomodels.com/product?page='+str(n) for n in range(1,pages+1)])):
            for r in rows:records[(r['brand'],r['sku'])]=r
            if i%10==0:print('KATO pages',i,'total records',len(records),flush=True)
    (ROOT/'catalog.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2))
    (ROOT/'fetch-errors.json').write_text(json.dumps(ERRORS,indent=2))
    print('DONE',len(records),'errors',len(ERRORS),flush=True)
