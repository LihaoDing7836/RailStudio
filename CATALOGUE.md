# 枕星 Train · 首页与列车图鉴

## 本地运行

在项目目录执行 `npm start`，打开 http://127.0.0.1:4173/。

- `/`：枕星 Train 首页，四个入口。
- `/designer.html`：原沙盘设计器，原有脚本和浏览器保存键保持不变。同一个域名、协议、端口下，已有方案继续读取；换域名时请先导出方案再导入。
- `/trains.html`：搜索、品牌/车型/套装/辆数筛选、价格排序、分页。筛选结果保留在 URL。
- `/train.html?id=tomix-98861`：每个品牌 + 产品编号的独立档案。
- `/station-03.html`、`/station-04.html`：独立的敬请期待页面。

## 数据范围与价格

本次快照收录 TOMIX 官方车辆套装目录、可检索的旧产品页，以及 KATO 日本官网的 N 比例车辆套装。排除单节车、轨道套装、含轨道的入门套装和模型配件。保留官网日文名称，便于逐项核对。

**不是全部历史发行的完整清单。** 已下线的旧资料、官网未收录的历史编号和 KATO 欧美地区独立目录仍有缺口。目录里找不到的信息不从经销商补价，不推测。每条记录附官方来源；没有价格的记录显示“暂未查到目录价”。车辆分类由名称规则辅助生成，可能需要后续人工校正。

价格为官网抓取时列出的 **日元含税目录价**，不是首发价，不是成交价。预告产品注明预计价格。发行日期可能是再版/出货日期。TOMIX 文字组成按官网列出，不能当成实际连挂顺序；KATO 编组通常是官方图片，详情页提供官方编组图链接，有些图包括多个套装，需要按编号对照。卡片和详情页使用对应官方目录/产品页的原始配图，不再使用通用列车示意图。KATO 同系列的基本组、增结组及再版可能共用照片，详情页会注明；官网可能使用试作品或实车参考照片，具体外观以对应编号的产品说明为准。图片保留官网来源链接，使用懒加载。TOMIX 使用官网图片链接；KATO 限制外站引用，所以将目录图和前两张详情原图保存到 `dist/train-images/`，按源 URL 哈希去重，保留原始 URL。图片失效时明确提示，不替换为虚构图片。

## 存储与手动同步

不需要给 IIS 安装数据库服务。首次推送和部署请包含 `dist/train-images/`，这些是官网原图静态资源，文件量大于原来的纯数据版本。采集器用 SQLite 留存本地结构化数据，导出浏览器可读取的静态 JSON：

- `research/trains/catalog.sqlite3`：SQLite 数据库，不提交到 Git。
- `research/trains/cache/`：采集缓存，不提交到 Git。
- `dist/data/trains.json`：正式网站数据快照，提交到 Git。

安装 Python 3.10+ 和 curl 后，在项目目录执行：

```sh
python3 scripts/sync-trains.py
# 只补充/更新官方图片链接（不改动价格、编组等资料）
python3 scripts/sync-trains.py --images-only
python3 -m unittest discover -s tests -p 'test_*.py'
npm test
python3 scripts/package-source.py
```

首次正常同步不依赖 research 里的种子文件。脚本从官网抓取。`--seed` 是开发用选项，需要本机已采集的种子文件；部署和日常更新不要使用。

采集并发上限为 4，详情缓存 7 天，每次更新会重读官方目录。下载或目录校验失败时不覆盖已发布 JSON。官网下架的历史产品保留记录，并清空无法确认的当前价格。每个品牌和编号只保存一条记录；同编号再生产会更新官方当前资料，不逐次复制成多条。

## GitHub 定时更新

`.github/workflows/sync-trains.yml` 提供每周一 UTC 04:20 的自动采集和手动运行。将本次修改 push 到默认分支后，在 GitHub 的 Actions 页面确认工作流已启用，允许工作流写入仓库。可以点 **Run workflow** 手动同步。受保护分支如果不允许机器人直接提交，需要由维护者调整为 PR 流程。

工作流抓取 → 下载必要的官方图片 → 校验 → 更新 JSON、静态图片和源码包 → 提交到仓库。**它只更新 GitHub，不会自动更改阿里云服务器。** 当前本地实现没有替你开启 GitHub 设置或服务器计划任务。

## 服务器部署与后续自动更新

首次上线本版本，按现有方式下载整个仓库 ZIP 到新目录，把 IIS 网站物理路径指向新的 `dist`。不要只更新 `index.html`，需要所有新增 HTML、JS、CSS、`data` 和 `train-images` 文件。官网下载图片属于独立静态素材，不包含在页面提供的源码 ZIP 中；源码和 JSON 保留图片来源及重新采集脚本。

后续可继续整体更新，或者只同步图鉴数据。仓库公开时，把 `scripts/update-train-data.ps1` 放到服务器的 `C:\RailStudioTools\`，在管理员 PowerShell 执行：

```powershell
powershell.exe -NoProfile -File C:\RailStudioTools\update-train-data.ps1
```

它自动读取 IIS 当前网站目录，校验下载的数据，先补齐新快照引用的图片，再原子替换 `data\trains.json`，备份旧文件在网站目录的上一级。不改沙盘代码，不改用户本机方案。请先完成一次整体部署，再使用这个脚本。

确认手动成功后，可创建每天更新数据的服务器计划任务：

```powershell
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -File "C:\RailStudioTools\update-train-data.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At '14:00'
Register-ScheduledTask -TaskName 'ZhenxingTrainCatalogue' -Action $action -Trigger $trigger -User 'SYSTEM' -RunLevel Highest -Description 'Update verified train catalogue from the project repository'
```

时间按服务器本地时区。只有注册后才会自动更新。仓库改回私有后公开下载会失败，脚本会保留旧数据；私有仓库需另配认证或手动上传，不要把访问令牌写进网页或 Git。

## 检查

`npm test`：原设计器逻辑 + 图鉴过滤/排序/数据一致性。

`python3 -m unittest discover -s tests -p 'test_*.py'`：官网解析器的车辆/配件排除、乘数与换行编组、SKU 价格对应。

浏览器检查记录与截图保存在忽略提交的 `test-results/`。Windows IIS 的实际服务器任务需部署后在服务器上验证。
