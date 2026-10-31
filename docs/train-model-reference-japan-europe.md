# 日本与欧洲列车建模参考

研究日期：2026-10-29。对象限定为 JR 东海 N700S 白蓝涂装、E233-0 中央线橙带普通车、ICE 3 BR403 白红涂装、初代 TGV Duplex 蓝银涂装。本文区分官方参数、亲自查看的产品照片以及未完成的核验；尺寸缺项不应包装成厂商精确 CAD。

## N700S

### 核实资料

- [日本车辆制造：JR 东海 N700S](https://www.n-sharyo.co.jp/business/tetsudo/pages/jrcn700s.htm)：先头车长 27,350 mm，中间车长 25,000 mm，车宽 3,360 mm，车高 3,600 mm。台车固定轴距 2,500 mm、轮径 860 mm；**固定轴距不是两台转向架的中心距**。后者此次未核实。
- [KATO N700S 产品页](https://www.katomodels.com/product/n/n700s)：生产型 J 编组、双翼形鼻部和蓝色前端线条的参考。
- [TOMIX N700S 试制模型开发报告](https://www.tomytec.co.jp/tomix/report/n/nj_236.html)：J0 确认试验车，不能把所有细部直接当作生产型 J 编组。

建议新干线 N 比例按 1:160 表达：先头 170.94 mm，中间 156.25 mm，宽 21 mm，车高 22.5 mm。车高定义应沿用制造商，额外屋顶设备不能任意叠加到已包含设备的高度值。

### 实际视觉检查

以下已有图鉴缓存均已打开像素核对：

| 角度 | 本地图片 | 官方原图 |
| --- | --- | --- |
| 车头斜侧近景 | `dist/train-images/fb96b1a6d1dba6e258e2791a.jpg` | [KATO 头部照片](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/2022012718054961f2606d96d48/N700S-1.jpg) |
| 头车与中间车侧形 | `dist/train-images/ef52fbde582dc0e0a2009972.jpg` | [KATO 编组照片](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/202211291746596385c703d19a9/N700S.jpg) |
| 前斜视与屋顶 | `dist/train-images/b20695a1cbe10f36c3fd4d03.jpg` | [KATO 前视照片](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/2022012718054961f2606d913a0/N700S-2.jpg) |

观察：低而宽的鸭嘴下鼻与后部隆起驾驶室是两个体量；鼻侧有明显肩棱，不能只做一个圆锥。黑驾驶窗低且靠鼻根，成对灯组在两侧肩部。白车身上小而竖向的圆角客窗密排，窗下主蓝带和细蓝带平行；头部蓝带折向驾驶室附近。下部连续灰色设备裙遮住大部分转向架，车顶主要平滑，仅局部有气动罩。

补充实车照片入口（链接已查得，本次工具未能返回像素，不计作已视觉检查）：[实车一](https://www.n-sharyo.co.jp/business/tetsudo/images/jrcn700s-2.jpg)、[实车二](https://www.n-sharyo.co.jp/business/tetsudo/images/jrcn700s-3.jpg)、[实车三](https://www.n-sharyo.co.jp/business/tetsudo/images/jrcn700s-4.jpg)。

## E233-0 中央线

### 核实资料与范围

- [JR 东日本 E233 介绍](https://www.jreast.co.jp/train/local/e233.html)。
- [JR 东日本原始中央线发布附件](https://www.jreast.co.jp/e/press/20051002/img/attach.pdf)：10 辆或 6+4 编组及不锈钢车体、橙色方案；发布示意图不是当前实车测量图。
- [KATO E233 中央线](https://www.katomodels.com/product/n/e233kei)：本次几何与涂装参考的具体型号。不要混入新 12 辆编组的双层绿色车。

本次没有在可读取的 E233-0 制造商资料中核实完整尺寸表。常见二手资料给出连挂总长 20,000 mm、车体宽 2,950 mm、屋顶高 3,620 mm，但车体净长、雨檐宽、空调顶高是另外的数，不能混为一谈。若实现采用这些数，应标作比例近似，不能称官方尺寸。转向架中心距未核实。日本在来线模型通常使用 1:150，不能与 N700S 全部一律使用 1:150。

### 实际视觉检查

| 角度 | 本地图片 | 官方原图 |
| --- | --- | --- |
| 车头近景 | `dist/train-images/5d4849d123c681c34d87bbbb.jpg` | [KATO 缩略图](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/thumbnails/thumbnails/202011111359155fab6fa3edbca/E233Ht.jpg) |
| 全编组斜侧、屋顶 | `dist/train-images/5ced41c409b0930c31c0ff72.jpg` | [KATO 编组](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/202011111358565fab6f903011c/E233H-1.jpg) |
| 正脸、车侧与屋顶 | `dist/train-images/eba4770da32e73512b70a5bc.jpg` | [KATO 前视](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/202011111358565fab6f90a1af1/E233H-5.jpg) |

观察：银色不锈钢车身，窗下宽橙带、窗上细橙带；不是橙色车体。平头具有圆角白色外框、宽黑玻璃面罩和上部目的地显示。正面橙色在左右两颊，中间宽银色区域应保留。每侧四对双扇门，门窗窄，门间客窗宽且有分隔。屋顶每车一个显著的长空调箱，受电弓只在相应动车；不能所有车厢复制两个短空调箱。黑转向架与下部箱体外露，前裙板有中央车钩开口。

## TGV Duplex 初代蓝银

### 核实资料与范围

- [KATO TGV Duplex](https://www.katomodels.com/product/n/tgv_duplex)：同时保留新 Carmillon 和旧蓝银产品照片；优先按旧蓝银照片取涂装，按高清新涂装照片辅助看相同车体结构。
- [KATO TGV 世代介绍](https://www.kato-special.com/tgv-evolution)：Duplex 头型更圆滑，双层拖车。Réseau Duplex 使用另一种棱角动力车，不应混用。
- [Alstom 工程师 François Lacôte 的技术演讲](https://www.schienenfahrzeugtagung.at/download/PDF2011/3-Lacote.pdf)：约 200 m 编组与铰接架构。其 PDF 为技术文字来源，本次截图服务未能返回像素。

本次未取得可核验的初代单车长宽高原厂尺寸表。网上常见的总长 200.19 m、拖车宽 2.896/2.904 m、最大高 4.318 m 存在口径/车型差异，不能当作已核实统一参数。动力车约 22 m、普通拖车约 18.7 m 也仍需进一步原始图纸确认。实现至少区分动力车与拖车的长度、车高和车轮布置；欧洲 N 比例按 1:160。中间拖车使用 Jacobs 共享转向架，动力车两端独立转向架；动力车与端拖车之间不能直接照搬中间铰接结构。

### 实际视觉检查

| 角度 | 本地图片 | 官方原图 |
| --- | --- | --- |
| **旧蓝银动力车与双层拖车侧面** | `dist/train-images/dbb5bd70ed2d3f04e0f79e38.jpg` | [KATO 原蓝银](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/201901131707315c3af1c375f0e/tgv_duplex_m_2.jpg) |
| 同型头部近景，新涂装 | `dist/train-images/96559d3ec792080a49ecdef3.jpg` | [KATO 近景](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/thumbnails/thumbnails/202102021420566018e138c1235/duplest.jpg) |
| 同型完整侧形及屋顶，新涂装 | `dist/train-images/f1887ed22d3230ed28bb7825.jpg` | [KATO 高清侧面](https://s3-ap-northeast-1.amazonaws.com/kato-model/product/images/202102021414286018dfb41cbf5/TGVDuplex.jpg) |

观察：圆滑下鼻、黑色上驾驶窗面罩，单层动力车不应有双层客窗。动力车顶部后端有受电弓，侧面上肩是一整排深色通风百叶，侧腰是大面积密格栅。拖车两排客窗，上排较大、下排较小；门在车端下层。旧涂装上部银灰、下部深蓝、薄白分界，端门橙红块。新版 Carmillon 黑窗带和红细线只能用于看结构，不可当作旧蓝银涂装。

另外查看了 Réseau Duplex 的 `67c8a01b1b97ae00d78a5681.jpg`、`69f658dce32e0e486940a6ae.jpg`、`baaffc291e32a28080948c44.jpg`，确认其机头更棱角，已排除作为目标机头参考。

## ICE 3 BR403

### 已核实文字资料

- [DB ICE 3 页面](https://www.bahn.de/service/ueber-uns/zugtypen/ice-3)：明确分开 BR403 与 BR407，不能用后者或 ICE 4 的外形替代。
- [DB BR403 第二批技术 PDF](https://www-abn.bahn.de/dam/jcr:80906029-89db-4a3d-bcf2-8360f07a1efa/215187-289013.pdf)：2 节头车 + 6 节中间车、总长约 200 m、动力分散。头车也是载客车，不是 TGV 式无客窗机车。
- [DB 2000 年 ICE 3 历史资料](https://www.deutschebahn.com/de/2000-ICE-3-7033062)。

### 照片核验尚未完成

本次官方图片与 PDF 截图接口返回 Cache miss；独立只读下载的自动审批服务也因 capacity failure 未执行。本地图鉴现存 KATO ICE 图片主要是 ICE 4，**没有拿 ICE 4 代替 ICE 3**。以下链接已交建模 agent，但此文不声称已目视核对其像素：

- [DB BR403 前斜视实车图](https://www.deutschebahn.com/resource/image/7032596/16%3A9/1920/1080/a51945f6dce80cc56a464eeea75104d3/536491A46109C4856C70BDFA80A96C0A/ICE-3-BR-403-DB192990.jpg)。
- [DB 多列 ICE 3 并列实车图](https://www.deutschebahn.com/resource/blob/7032504/62b0c7cb8603463ac149b5c9f75f5149/DB15895-data.jpg)。
- [Märklin BR403 模型官方说明书](https://static.maerklin.de/damcontent/7b/65/7b656c4103cc74ef785a3839f5ce91151663835801.pdf)：属于 Railbow 涂装，只可用于结构核对，目标仍为白红涂装。

常见二手尺寸是头车 25,835 mm、中间车 24,775 mm、宽 2,950 mm、高 3,890 mm、转向架中心距 17,375 mm；此次没有追溯到原厂图纸，全部保留未核实状态。约 1:160 的比例建模可以明确为近似，而不能拿 BR407 的外形与高度填补资料空缺。

## 对旧实现的直接纠正点

研究时 `dist/train-models.js` 使用统一 1:150、等长车厢、通用截面与周期性受电弓分配。与上述已看照片相比，需要优先纠正：

1. N700S 的先头/中间长度差，以及宽扁下鼻、肩棱、灰色连续裙板；不能按露轮通勤车处理。
2. E233 的正脸中央银区、宽窄橙带、四门/窗节奏和一个长空调箱；取消跨正脸完整橙色横条。
3. TGV Duplex 的圆滑动力车、动力车后端受电弓与大格栅、拖车双层窗及共享转向架。旧“棱角动力车”描述误用了 Réseau 的特征。
4. 先按头部侧轮廓、正面宽高和侧窗节奏建立可辨识比例，再增加门缝、灯、天线等细节。统一圆角长盒子上换色不能代表以上不同车族。

本文件仅作为原创程序化建模参考，不复制外部模型网格或把官方照片直接贴到 3D 车身。未核实项应继续保留不确定性说明。
