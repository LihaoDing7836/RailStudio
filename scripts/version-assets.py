"""Stamp local JS/CSS references with a deterministic release version."""
from pathlib import Path
import hashlib
import re

# Restrict to literal local references; leave external URLs and navigation alone.
REFERENCE = re.compile(r'''(?P<quote>["'])(?P<path>(?:\./)?[\w./-]+\.(?:js|css))(?:\?v=[a-f0-9]+)?(?P=quote)''')

def stamp(directory):
    directory = Path(directory)
    files = sorted(p for p in directory.iterdir() if p.suffix in {'.html', '.js', '.css'})
    clean = {p: REFERENCE.sub(lambda m: m['quote'] + m['path'] + m['quote'], p.read_text()) for p in files}
    digest = hashlib.sha256()
    for p, content in clean.items():
        digest.update(p.name.encode() + b'\0' + content.encode() + b'\0')
    version = digest.hexdigest()[:16]
    for p, content in clean.items():
        def replace(m):
            if not (p.parent / m['path']).is_file():
                return m[0]
            return m['quote'] + m['path'] + '?v=' + version + m['quote']
        updated = REFERENCE.sub(replace, content)
        if p.read_text() != updated:
            p.write_text(updated)
    return version

if __name__ == '__main__':
    print('Asset version:', stamp(Path(__file__).resolve().parents[1] / 'dist'))
