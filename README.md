# Rail Studio · 轨道设计室

中文铁路模型沙盘规划器。无运行时第三方依赖，使用 SVG 与原生 JavaScript；以模型实际毫米尺寸工作。

## 启动

需要 Python 3：

```sh
cd rail-studio
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

浏览器打开 http://127.0.0.1:4173/ 。`dist/` 也可以部署到静态网站服务器。不要直接双击 HTML（浏览器会阻止目录 JSON 的读取）。

## 功能

- TOMIX N / KATO N、HO 分类轨道库，按产品编号、名称和半径搜索。
- 毫米画布、沙盘尺寸、网格、缩放、平移、示例双环线。
- 放置、拖动、旋转、镜像、多选、复制、删除、80 步撤销/重做。
- 端点位置、方向、品牌、轨距、标高与接头类型匹配；跨品牌不能直接吸附。
- 复线、直线、曲线、复杂道岔、交叉轨、超高过渡的平面投影、高架、桥梁、柔性轨、转盘。
- 柔性轨可裁切及设置圆弧角度；转盘桥轨可单独旋转。
- 本浏览器自动保存；JSON 导入/导出；真实毫米尺寸 SVG；CSV 零件清单。
- 连接统计、中心线越界检查、数据来源和几何可信度标记。
- WebMCP：read_rail_layout、add_rail_pieces（支持整批校验与事务式提交）。

快捷键：V 选择；H / 空格平移；R 旋转；F 翻转；Shift 点击多选；Delete 删除；Ctrl/⌘ Z 撤销；Ctrl/⌘ Shift Z 重做；Ctrl/⌘ D 复制；Esc 退出放置。

## 目录与精度

2026-09-26 快照共 **334 个轨道及套装内变体条目**：

- 270 个根据公开长度、半径、角度进行尺寸建模。
- 48 个采用 XTrackCAD 开源路径及显式端点，包括部分相同规格前代产品的参数。
- 13 个示意模型（间距转换、未逐点核实的零件，以及 UNITRAM 参数中约 1.46 mm 的曲线/端点偏差）；界面明确标记。
- 3 个产品仅收录目录，尚未取得可靠完整几何，不能放置：KATO 20-652、20-653 自动道口套装和 21-011 解钩轨。

**不是两家品牌全部历史、海外限定及未来型号的完整承诺。** 当前官方日本目录也可能不含套装独占轨道。不能把此版本当作已获厂商认证的施工 CAD。

端点检查：距离 ≤ 0.6 mm、方向误差 < 0.6°、高度差 < 0.5 mm。尚不检查车体扫掠、道床碰撞、上下层净空和电气隔离。超高仅显示平面投影。转盘径向端点供布局规划，连接统计不代表实时电气通路。桥梁绘制轨道中心线，并未建立完整桥体尺寸。安全侧线只提供可行车部分的连接端点。

零件清单数量是轨道段数，不是应购买包装数。混合包装变体归并同一 SKU。TOMIX 与 KATO 混用需要实际转换轨；本版本没有将转换轨端口自动映射为跨品牌接口。

## 数据来源与更新

产品目录来源保存在 `dist/catalog.json` 的 source 字段；复杂几何另有 geometrySource。厂家商品图没有复制进应用。

```sh
python3 scripts/fetch-catalog.py
python3 scripts/build-catalog.py
python3 scripts/import-xtp.py
node --test tests/*.test.mjs
python3 scripts/package-source.py
```

`research/` 为本地官方页面缓存，不上传站点。原始 XTrackCAD 参数位于 `vendor/xtrkcad/`；导入只提取轨道路径和端点，不包含其程序代码。转盘改为活动桥轨与径向出口，几何由英寸转换为毫米。并非每次源数据变更都能自动通过精度审核。

## 结构与验证

- `dist/index.html` / `style.css`：工作台与响应式布局。
- `dist/app.js`：编辑状态、历史、持久化、导入导出与 WebMCP。
- `dist/geometry.js`：几何变换、端点匹配、连接索引与项目校验。
- `tests/geometry.test.mjs`：闭环、圆弧、各型号端点变换、文件校验、轨距兼容、标高、柔性轨和采购统计。
- `?qa=1` 使用独立本机测试存储，避免测试覆盖真实方案。

无需 npm install。`npm test` 或 `node --test tests/*.test.mjs` 运行测试。

## 许可

本版本随附 GPL-2.0 许可。XTrackCAD 参数来自 Dwyane Ward、Dave Bullis 及其他贡献者；原始文件保留，转换日期为 2026-09-26。详见 `THIRD_PARTY_NOTICES.md` 与 `LICENSE`。源代码可从应用目录说明中下载。

TOMIX、KATO、Fine Track、UNITRACK、UNITRAM 商标归各自权利人所有。本项目与厂商无隶属或认证关系。
