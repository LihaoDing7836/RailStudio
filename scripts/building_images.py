"""Cache public official building photos unchanged, with source provenance."""
import hashlib,subprocess
from pathlib import Path
from urllib.parse import urlparse,quote
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
def cache_images(records):
 folder=ROOT/'dist/building-images';folder.mkdir(exist_ok=True)
 items={r['image_url']:r['source'] for r in records if r.get('image_url','').startswith('https://')}
 def download(item):
  url,source=item;p=urlparse(url)
  if p.hostname not in ['www.tomytec.co.jp','diocolle.tomytec.co.jp']:raise ValueError('Unexpected building photo host')
  ext=Path(p.path).suffix.lower()
  if ext not in ['.jpg','.jpeg','.png','.webp','.gif']:return url,None
  file=folder/(hashlib.sha256(url.encode()).hexdigest()[:24]+ext)
  if not file.exists():
   temp=file.with_suffix(ext+'.tmp')
   result=subprocess.run(['curl','-fLs','--retry','1','--max-time','25','--referer',source,'-o',str(temp),quote(url,safe=':/?=&%+@')],capture_output=True)
   if result.returncode:
    temp.unlink(missing_ok=True);return url,None
   data=temp.read_bytes()[:12]
   if not (data.startswith((b'\xff\xd8\xff',b'\x89PNG',b'GIF')) or data[:4]==b'RIFF'):
    temp.unlink(missing_ok=True);return url,None
   temp.replace(file)
  return url,'building-images/'+file.name
 with ThreadPoolExecutor(max_workers=6) as pool:mapped=dict(pool.map(download,items.items()))
 for r in records:
  url=r.get('image_url','')
  if url in mapped:r['image_original_url']=url;r['image_url']=mapped[url] or ''
 print('Building photos',sum(bool(v) for v in mapped.values()),'/',len(mapped),flush=True)
