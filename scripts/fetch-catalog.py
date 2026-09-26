"""Download only public manufacturer catalog pages; cached under research/."""
import pathlib, urllib.request, concurrent.futures, json
ROOT=pathlib.Path(__file__).resolve().parents[1]/'research'; ROOT.mkdir(exist_ok=True)
urls={
 'tomix-products.csv':'https://www.tomytec.co.jp/tomix/common/csv/products_list.csv',
 **{f'kato-{s}.html':f'https://unitrack.katomodels.com/products/line_single/{s}' for s in ['straight_line','curve_line','flexible_line','branch_cross','double_track_line','iron_bridge','elevated_line','automatic_crossing','traffic_light','car_stop','turntable','compact']},
 **{f'kato-{s}.html':f'https://www.katomodels.com/product/ho/{s}' for s in ['ho_unitrack_s','ho_unitrack_r','ho_unitrack_hp867','ho_unitrack_point490','ho_unitrack_point550','ho_unitrack_pc']},
 'kato-unitram.html':'https://unitrack.katomodels.com/products/streetcar/system_single',
 'kato-unitram_e.html':'https://www.katomodels.com/product/n/unitram_e',
 'tomix-manual.html':'https://layouter.tomytec.co.jp/manual/tomix/s101rail/index.html',
}
def fetch(item):
 name,url=item; p=ROOT/name
 if not p.exists():
  with urllib.request.urlopen(url,timeout=40) as r:p.write_bytes(r.read())
 return name,p.stat().st_size
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 for f in [pool.submit(fetch,i) for i in urls.items()]:
  try:print(f.result(),flush=True)
  except Exception as e:print(str(e),flush=True)
(ROOT/'sources.json').write_text(json.dumps(urls,indent=2))
