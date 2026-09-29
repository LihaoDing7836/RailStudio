"""Publish official KATO photos as static site assets (their server blocks hotlinks).
Preserve original URLs and attribution. No image transformations or synthetic art.
"""
import hashlib, subprocess
from pathlib import Path
from urllib.parse import urlparse, quote
from concurrent.futures import ThreadPoolExecutor

ROOT=Path(__file__).resolve().parents[1]

def cache_official_photos(payload):
    records=[r for r in payload['trains'] if r['brand']=='KATO']
    items={}
    for r in records:
        main=r.get('image_url','')
        if not main.startswith('https://'):main=r.get('image_original_url','')
        gallery=r.get('image_gallery',[])
        if gallery and not gallery[0].startswith('https://'):gallery=r.get('image_original_gallery',[])
        # Keep the two leading official views. The source page links the full gallery.
        gallery=gallery[:2]
        r['image_original_url']=main;r['image_original_gallery']=gallery
        for url in [main,*gallery]:
            if url:items[url]=r['source_url']
    folder=ROOT/'dist/train-images';folder.mkdir(parents=True,exist_ok=True)
    def download(item):
        url,source=item;parsed=urlparse(url)
        if parsed.scheme!='https' or parsed.hostname!='s3-ap-northeast-1.amazonaws.com' or not parsed.path.startswith('/kato-model/product/'):
            raise ValueError('Unexpected official image host: '+url)
        extension=Path(parsed.path).suffix.lower()
        if extension not in ['.jpg','.jpeg','.png','.gif','.webp']:raise ValueError('Unsupported image format: '+url)
        name=hashlib.sha256(url.encode()).hexdigest()[:24]+extension
        path=folder/name
        if not path.exists():
            temporary=path.with_suffix(extension+'.tmp')
            try:
                # Use the public manufacturer product page as the retrieval context.
                result=subprocess.run(['curl','-fLs','--retry','2','--max-time','40','--referer',source,'--output',str(temporary),quote(url,safe=':/?=&%+@')],capture_output=True)
                if result.returncode:raise RuntimeError('Official photo download failed: '+url)
                with temporary.open('rb') as f:header=f.read(12)
                if not (header.startswith((b'\xff\xd8\xff',b'\x89PNG\r\n\x1a\n',b'GIF87a',b'GIF89a')) or header[:4]==b'RIFF' and header[8:12]==b'WEBP'):
                    raise RuntimeError('Response is not an image: '+url)
                temporary.replace(path)
            finally:
                if temporary.exists():temporary.unlink()
        return url,'train-images/'+name
    mapped={}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i,(url,path) in enumerate(pool.map(download,items.items())):
            mapped[url]=path
            if i%100==0:print('保存官网图片',i,'/',len(items),flush=True)
    for r in records:
        r['image_url']=mapped.get(r.get('image_original_url',''))
        r['image_gallery']=[mapped[url] for url in r.get('image_original_gallery',[])]
