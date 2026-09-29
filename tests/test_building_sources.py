import importlib.util
from pathlib import Path
import sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('buildings',ROOT/'scripts/sync-buildings.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
class Dimensions(unittest.TestCase):
 def test_units_and_label_order(self):
  self.assertEqual(b.dimensions('概寸(cm) W8 xD6 xH4'),{'width':80,'depth':60,'height':40})
  self.assertEqual(b.dimensions('本体サイズ W90×H80×D135(㎜)'),{'width':90,'depth':135,'height':80})
  self.assertEqual(b.dimensions('製品サイズ:D81×W86×H41mm'),{'width':86,'depth':81,'height':41})
 def test_ambiguous_or_unlabelled_measurements_not_invented(self):
  self.assertIsNone(b.dimensions('100×50×60'))
  self.assertIsNone(b.dimensions('W10 D20 H30'))
  self.assertIsNone(b.dimensions('W10mm×D20mm×H30mm W50mm×D60mm×H70mm'))
 def test_product_specific_dimensions(self):
  self.assertEqual(b.product_dimensions('●23-471 D81×W50×H62mm ●23-472 D81×W50×H67mm','23-471','Shop'),{'width':50,'depth':81,'height':62})
