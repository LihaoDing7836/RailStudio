import sys, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import train_sources as src

class TrainSourcesTest(unittest.TestCase):
    def test_vehicle_scope(self):
        self.assertTrue(src.is_vehicle_set('10-1000','トワイライトエクスプレス 6両基本セット'))
        self.assertTrue(src.is_vehicle_set('106-4626','コールポーター 8両セット'))
        for sku,name in [('11-351','ヘッドマークセット'),('20-852','エンドレス基本セット'),('23-505','乗用車6台セット'),('10-501-1','チビロコトータルセット'),('10-000','電車 1両セット')]:
            self.assertFalse(src.is_vehicle_set(sku,name))
    def test_tomix_breaks_and_multiplicity(self):
        with patch.object(src,'fetch',return_value='【車両】<br>●モハE259<br>モハE258<br>●クハ×2<br>【付属品】その他'):
            r=src.tomix_detail(src.row('TOMIX','12345','車両セット','https://example.com'))
        self.assertEqual(r['cars'],4)
        self.assertEqual(r['composition'],'●モハE259 ●モハE258 ●クハ×2')
    def test_kato_detail_prices_match_exact_sku(self):
        html='<img src="https://example.com/formation.jpg" alt="編成例">'
        for sku,name,price in [('10-111','新幹線3両基本セット','予￥15,620'),('10-112','新幹線4両増結セット','￥10,000'),('11-351','ヘッドマークセット','￥1,000')]:
            html+=f'<tr><td><span class="number_pc">{sku}</span></td><td class="name">{name}</td><td class="price">{price}</td><td class="jan_code">1234567890123</td><td class="date">2027年1月</td></tr>'
        with patch.object(src,'fetch',return_value=html):
            rows,image=src.kato_detail('https://www.katomodels.com/product/n/example')
        self.assertEqual(len(rows),2)
        self.assertEqual([r['price'] for r in rows],[15620,10000])
        self.assertEqual([r['cars'] for r in rows],[3,4])
        self.assertTrue(rows[0]['announced_price'])
        self.assertEqual(image,'https://example.com/formation.jpg')

if __name__=='__main__':unittest.main()

class SyncSafetyTest(unittest.TestCase):
    def test_bad_source_keeps_published_snapshot(self):
        import importlib.util, tempfile
        spec=importlib.util.spec_from_file_location('sync_trains',Path(__file__).resolve().parents[1]/'scripts/sync-trains.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            published=Path(folder)/'trains.json'
            original=b'{"trains":[],"updated":"2026-09-29"}'
            published.write_bytes(original)
            with patch.object(module,'OUT',published),patch.object(src,'CACHE',Path(folder)),patch.object(src,'fetch',return_value='invalid official response'):
                with self.assertRaises(RuntimeError):module.build()
            self.assertEqual(published.read_bytes(),original)

class OfficialPhotosTest(unittest.TestCase):
    def test_tomix_only_uses_product_gallery(self):
        markup='<img src="/logo.png"><a class="p-products-details-image__top" href="/tomix/products/img/98365.jpg"><img src="/tomix/products/img/98365.jpg"></a><a class="p-products-details-image__list-link" href="/tomix/products/img/98365_c.jpg">photo</a><img src="/tomix/products/img/98365_h.gif">'
        photos=src.photo_fields(markup,'https://www.tomytec.co.jp/tomix/products/n/98365.html','TOMIX')
        self.assertEqual(photos['image_url'],'https://www.tomytec.co.jp/tomix/products/img/98365.jpg')
        self.assertEqual(len(photos['image_gallery']),2)
        self.assertEqual(photos['image_scope'],'product')
    def test_kato_excludes_related_products_and_formation_diagrams(self):
        base='https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/'
        markup=f'<img id="MainPhoto" src="{base}train.jpg"><img class="ChangePhoto" src="{base}train.jpg"><img class="ChangePhoto" src="{base}side.jpg"><img alt="編成例" src="{base}formation.jpg"><img src="{base}related.jpg">'
        photos=src.photo_fields(markup,'https://www.katomodels.com/product/n/test','KATO')
        self.assertEqual(photos['image_gallery'],[base+'train.jpg',base+'side.jpg'])
        self.assertEqual(photos['image_scope'],'series')
    def test_retired_tomix_thumbnail_is_tied_to_exact_sku(self):
        markup='<a href="/tomix/products/n/92146.html"><img src="/tomix/products/img/92146_s.jpg">＜92146＞列車セット</a>'
        photos=src.tomix_index_photos(markup,'https://www.tomytec.co.jp/tomix/products/train/index_31.html')
        self.assertEqual(photos['92146']['image_url'],'https://www.tomytec.co.jp/tomix/products/img/92146_s.jpg')
        self.assertFalse(src.photo_fields('<img src="/logo.png">','https://www.katomodels.com/product/n/test','KATO'))
