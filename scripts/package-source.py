from pathlib import Path
import zipfile,hashlib,json,runpy
root=Path(__file__).resolve().parents[1]
runpy.run_path(str(root/'scripts/version-assets.py'), run_name='__main__')
manifest={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'vendor/xtrkcad').glob('*') if p.is_file() and p.name!='SHA256SUMS.json'}
(root/'vendor/xtrkcad/SHA256SUMS.json').write_text(json.dumps(manifest,indent=2))
with zipfile.ZipFile(root/'dist/rail-studio-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in ['dist','scripts','tests','vendor','.github/workflows']:
  for p in (root/folder).rglob('*'):
   if p.is_file() and p.suffix!='.zip' and '__pycache__' not in p.parts and 'train-images' not in p.parts and 'building-images' not in p.parts:z.write(p,Path('rail-studio')/p.relative_to(root))
 for name in ['README.md','BRAND.md','CATALOGUE.md','LICENSE','THIRD_PARTY_NOTICES.md','package.json']:
  z.write(root/name,Path('rail-studio')/name)
print('Packaged source:',(root/'dist/rail-studio-source.zip').stat().st_size,'bytes')
