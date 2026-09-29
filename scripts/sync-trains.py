"""Official train catalogue -> local SQLite + atomic static JSON snapshot for IIS.
Run python scripts/sync-trains.py; --seed uses already collected data for first build.
No third-party Python packages required. Cached pages expire on each normal run.
"""
import argparse, csv, datetime, io, json, re, sqlite3, sys, hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import train_sources as src
from train_images import cache_official_photos

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/data/trains.json'
TODAY=datetime.date.today().isoformat()

def enrich_images():
    """Refresh official photo references without changing product facts or prices."""
    payload=json.loads(OUT.read_text());records=payload['trains']
    first='https://www.tomytec.co.jp/tomix/products/train/index.html'
    links={first};seen=set();thumbs={}
    with ThreadPoolExecutor(max_workers=4) as pool:
        while links:
            batch=sorted(links-seen)
            if not batch:break
            seen.update(batch);links=set()
            for url,html in zip(batch,pool.map(src.fetch,batch)):
                thumbs.update(src.tomix_index_photos(html,url))
                links.update('https://www.tomytec.co.jp'+x for x in re.findall(r'href="(/tomix/products/train/index(?:_\d+)?\.html)"',html))
    kato_first='https://www.katomodels.com/product'
    pages=max(map(int,re.findall(r'product\?page=(\d+)',src.fetch(kato_first))),default=0)
    kato_thumbs={}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for rows in pool.map(src.kato,[kato_first+'?page='+str(n) for n in range(1,pages+1)]):
            for r in rows:
                if r.get('image_url'):kato_thumbs[r['sku']]=r
    def enrich(r):
        r=dict(r)
        thumb=thumbs.get(r['sku']) if r['brand']=='TOMIX' else kato_thumbs.get(r['sku'])
        cached=src.CACHE/(hashlib.sha256(r['source_url'].encode()).hexdigest()+'.html')
        photos=src.photo_fields(src.fetch(r['source_url']),r['source_url'],r['brand']) if cached.exists() or not thumb else {}
        r.update(photos)
        if thumb and (r['brand']=='KATO' or not r.get('image_url')):
            for key in ['image_url','image_source','image_scope']:r[key]=thumb[key]
        return r
    with ThreadPoolExecutor(max_workers=4) as pool:records=list(pool.map(enrich,records))
    payload['trains']=records;payload['images_updated']=TODAY
    write_snapshot(payload)
    print('官网配图',sum(bool(r.get('image_url')) for r in records),'/',len(records),flush=True)

def write_snapshot(payload):
    cache_official_photos(payload)
    records=payload['trains'];OUT.parent.mkdir(parents=True,exist_ok=True)
    db=ROOT/'research/trains/catalog.sqlite3';db.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(db) as con:
        con.execute('CREATE TABLE IF NOT EXISTS trains (id TEXT PRIMARY KEY, brand TEXT, sku TEXT, data TEXT, updated TEXT)')
        con.execute('DELETE FROM trains')
        con.executemany('INSERT OR REPLACE INTO trains VALUES (?,?,?,?,?)',[(r['id'],r['brand'],r['sku'],json.dumps(r,ensure_ascii=False),TODAY) for r in records])
    tmp=OUT.with_suffix('.json.tmp');tmp.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')));tmp.replace(OUT)

def category(name):
    if re.search('新幹線|TGV|ICE|AVE|ユーロスター|Eurostar',name,re.I):return '高速列车'
    if re.search(r'貨車|貨物|コキ|タキ|ホキ|ワム|ワラ|トキ|トラ|レサ|レム|チキ|セキ|ヨ\d|石炭|コンテナ',name):return '货运车辆'
    if re.search('客車|寝台|ブルートレイン|北斗星|トワイライト|カシオペア|サロン|ななつ星|瑞風|四季島|Orient|オリエント|急行.*編成|やまぐち',name,re.I):return '客车・观光'
    if re.search('キハ|キロ|ディーゼル|気動|ハイブリッド|GV|HB-|YC|HOT|H100|HC85',name):return '内燃・混合动力'
    if re.search(r'機関車|EF\d|ED\d|EH\d|DD\d|DE\d|DF\d',name):return '机车套装'
    return '电车・通勤'

def normalize(r):
    r=dict(r);r['id']=r['brand'].lower()+'-'+r['sku'].lower()
    r['category']=category(r['name'])
    r['set_type']='增结套装' if '増結' in r['name'] else '基本套装' if '基本' in r['name'] else '车辆套装'
    r['limited']=bool(re.search('限定|特別企画|特別企画品',r['name']))
    r['retrieved']=TODAY;r['price_status']='listed' if r.get('price') is not None else 'unknown'
    r['composition_status']='官网列出车辆组成（不保证排列为实际连挂顺序）' if r.get('composition') else '官网文字未列出，详见官方编组图'
    r.pop('scope_note',None)
    return r

def build(seed=False):
    old=json.loads(OUT.read_text())['trains'] if OUT.exists() else []
    if seed:
        rows=json.loads((ROOT/'research/trains/seed.json').read_text())
        # Reparse cached KATO indexes with the current vehicle-only filter.
        rows=[r for r in rows if r['brand']=='TOMIX']
        first=src.fetch('https://www.katomodels.com/product')
        pages=max(map(int,re.findall(r'product\?page=(\d+)',first)))
        for i in range(1,pages+1):rows.extend(src.kato('https://www.katomodels.com/product?page='+str(i)))
        text=(ROOT/'research/trains/tomix-current.csv').read_text(encoding='utf-8-sig')
    else:
        # Refetch index data; reuse details up to 7 days, limiting load on source sites.
        import time
        for p in src.CACHE.glob('*.html'):
            if time.time()-p.stat().st_mtime>7*86400:p.unlink()
        for url in ['https://www.tomytec.co.jp/tomix/common/csv/products_list.csv','https://www.katomodels.com/product']:
            p=src.CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
            if p.exists():p.unlink()
        text=src.fetch('https://www.tomytec.co.jp/tomix/common/csv/products_list.csv').lstrip('\ufeff')
        first=src.fetch('https://www.katomodels.com/product')
        pages=max(map(int,re.findall(r'product\?page=(\d+)',first)),default=0)
        if pages<1 or '価格（税込）' not in text:raise RuntimeError('官方目录结构变化或下载失败；保留已有快照')
        urls=['https://www.katomodels.com/product?page='+str(i) for i in range(1,pages+1)]
        for u in urls:
            p=src.CACHE/(hashlib.sha256(u.encode()).hexdigest()+'.html')
            if p.exists():p.unlink()
        with ThreadPoolExecutor(max_workers=4) as pool: rows=[r for batch in pool.map(src.kato,urls) for r in batch]
        if len(rows)<100:raise RuntimeError('KATO 目录异常；保留已有快照')
    merged={(r['brand'],r['sku']):r for r in rows if re.match(r'^[\dA-Za-z-]+$',r['sku'])}
    if not seed and old:
        previous=sum(r['brand']=='KATO' and not r.get('archived') for r in old)
        found=sum(brand=='KATO' for brand,sku in merged)
        if found<previous*.6:raise RuntimeError('KATO 新目录数量异常，历史保留不能掩盖抓取缺失；保留旧快照')
    tomix=[]
    for r in csv.DictReader(io.StringIO(text)):
        name=r['商　品　名'];sku=r['品番'];cats=r['小カテゴリ']
        if r['N/HO']!='N' or r['大カテゴリ']!='cat-carset' or 'セット' not in name or 'total' in cats or re.search('ベーシック|トータル|ファーストカーミュージアム',name):continue
        if src.count(name)==1:continue
        price=re.sub(r'[^\d]','',r['価格（税込）'])
        item=src.row('TOMIX',sku,name,'https://www.tomytec.co.jp/tomix/products/n/'+sku+'.html',int(price) if price else None,r['発売月'])
        prior=merged.get(('TOMIX',sku),next((x for x in old if x['brand']=='TOMIX' and x['sku']==sku),{}))
        item.update(composition=prior.get('composition'),cars=src.count(name) or prior.get('cars'),jan=r['ＪＡＮコード'].strip(),source_updated=r['更新日'],announced_price=r['予価']=='予',catalog_source='https://www.tomytec.co.jp/tomix/common/csv/products_list.csv')
        for key in ['image_url','image_gallery','image_source','image_scope']:
            if key in prior:item[key]=prior[key]
        tomix.append(item)
    if len(tomix)<100:raise RuntimeError('TOMIX 目录异常；保留已有快照')
    if old and len(tomix)<sum(r['brand']=='TOMIX' and not r.get('archived') for r in old)*.6:
        raise RuntimeError('TOMIX 新目录数量异常；保留旧快照')
    # Details supply vehicle list only; current official CSV price remains authoritative.
    pending=tomix
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i,(r,d) in enumerate(zip(pending,pool.map(lambda r:src.tomix_detail(dict(r)),pending))):
            r['composition']=d.get('composition');r['cars']=src.count(r['name']) or d.get('cars')
            for key in ['image_url','image_gallery','image_source','image_scope']:
                if key in d:r[key]=d[key]
            if i%50==0:print('补充编组',i,'/',len(pending),flush=True)
    for r in tomix:merged[('TOMIX',r['sku'])]=r
    old_index={('TOMIX',r['sku']):r for r in old if r['brand']=='TOMIX'}
    historical=[dict(r) for key,r in old_index.items() if key not in merged]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for r in pool.map(src.tomix_detail,historical):
            if r['source_url'] in src.ERRORS:r.update(price=None,currency=None,price_basis='当前官方页面无法核实')
            r['archived']=True
            merged[('TOMIX',r['sku'])]=r
    # KATO publishes formations as images. Keep their official link, not invented text.
    kato_urls=sorted({r['source_url'] for r in list(merged.values())+old if r['brand']=='KATO' and src.is_vehicle_set(r['sku'],r['name'])})
    with ThreadPoolExecutor(max_workers=4) as pool:
        for url,(details,image) in zip(kato_urls,pool.map(src.kato_detail,kato_urls)):
            for r in merged.values():
                if r['source_url']==url:r['formation_url']=image
            for r in details:
                prior=merged.get(('KATO',r['sku']),{})
                # The listing thumbnail belongs to this SKU's official entry;
                # the gallery is shared by the product family on the detail page.
                if prior.get('image_url'):
                    r['image_url']=prior['image_url'];r['image_source']=prior.get('image_source',r['source_url'])
                merged[('KATO',r['sku'])]=r
    # Retain historical records without presenting their old price as current.
    current=set(merged)
    for r in old:
        if r['brand']=='KATO' and not src.is_vehicle_set(r['sku'],r['name']):continue
        key=(r['brand'],r['sku'])
        if key not in current:
            r=dict(r);r.update(price=None,currency=None,price_basis='当前目录未列出',archived=True);merged[key]=r
    records=sorted([normalize(r) for r in merged.values() if r.get('cars')!=1],key=lambda x:(x['brand'],x['sku']))
    for r in records:
        if r.get('cars') is not None and not 2<=r['cars']<40:raise RuntimeError('编组解析异常：'+r['id'])
        if r.get('price') is not None and (not isinstance(r['price'],int) or r['price']<=0):raise RuntimeError('价格解析异常：'+r['id'])
        if r['brand']=='KATO' and not src.is_vehicle_set(r['sku'],r['name']):raise RuntimeError('非车辆套装：'+r['id'])
    if old and len(records)<len(old)*.8:raise RuntimeError('记录数量异常下降；保留旧数据')
    # Refuse partial listing downloads; missing retired detail pages are allowed.
    if any('product?page=' in u for u in src.ERRORS):raise RuntimeError('KATO 分页抓取不完整；保留旧数据')
    payload={'updated':TODAY,'currency_note':'日元；官网含税目录价，非成交价；预告产品为预计价格。','coverage_note':'收录品牌官网可检索的 N 比例纯车辆套装及保留的历史记录，不保证覆盖全部历史发行；KATO 目前以日本官网目录为范围，欧美地区独立发行目录尚未完整覆盖。','sources':['https://www.tomytec.co.jp/tomix/products/info/?category=cat-carset','https://www.katomodels.com/product'],'trains':records}
    write_snapshot(payload)
    print('已导出',len(records),'条套装；',OUT,flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--seed',action='store_true');parser.add_argument('--images-only',action='store_true');args=parser.parse_args()
    if args.images_only:enrich_images()
    else:build(args.seed)
