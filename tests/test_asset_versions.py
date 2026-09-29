import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('versions', ROOT / 'scripts/version-assets.py')
versions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(versions)

class AssetVersions(unittest.TestCase):
    def test_dependency_change_versions_entry_and_nested_imports(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            (d/'index.html').write_text('<script src="app.js"></script><a href="other.html">Other</a>')
            (d/'app.js').write_text("import './dependency.js';")
            (d/'dependency.js').write_text('export const value=1;')
            first = versions.stamp(d)
            self.assertEqual(versions.stamp(d), first)
            (d/'dependency.js').write_text('export const value=2;')
            second = versions.stamp(d)
            self.assertNotEqual(first, second)
            self.assertIn('app.js?v='+second, (d/'index.html').read_text())
            self.assertIn('dependency.js?v='+second, (d/'app.js').read_text())
            self.assertIn('href="other.html"', (d/'index.html').read_text())
            self.assertEqual(versions.stamp(d), second)

    def test_iis_revalidates_by_default(self):
        config = ET.parse(ROOT/'dist/web.config').getroot()
        self.assertEqual(config.find('./system.webServer/staticContent/clientCache').get('cacheControlMode'), 'DisableCache')
        self.assertEqual(config.find('./location').get('path'), 'train-images')
