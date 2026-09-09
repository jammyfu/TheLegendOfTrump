# 白宫外景比例与场景范围

本次使用 Blender MCP 创建独立外景工程，采用低多边形材质，按历史布局进行风格化复原。

- 比例基准：1 米 = 1.4 游戏单位，适配现有约 2.7 单位高的人物（约 1.9 米）。
- 主楼本体：51.2 × 26.1 米；南侧至屋顶约 21.34 米。对应模型 71.68 × 36.54 × 29.876 单位。门窗、柱式和楼层重新建模，非直接拉伸旧立面。
- 可行走外景：280 × 395 单位，约 200 × 282 米；前一版边界为 52 × 48 单位。主要战斗、宝箱和大门路线保留在近景，新增区域用于绕行和观景。
- 方向约定：+X 东、-X 西、+Z 南。西侧放置艾森豪威尔行政办公楼；东侧财政部；南侧椭圆草坪、宪法大道与更远的华盛顿纪念碑；北侧街区围合拉法耶特公园方向。
- 周边楼宇体量、道路曲线、门窗数目和地标距离为根据公开布局的近似建模。采用历史侧翼轮廓，不声称还原 2026 年施工现场或精确测绘数据。
- 椭圆草坪与城市楼群属于围栏外的背景布景，可从扩大的庄园内观察；围栏、主楼、侧翼、廊柱和新增树干具有对应碰撞体。
- 主楼入口保留在原游戏交互位置；室内仍为独立 Boss 场景。

来源：

- [White House Historical Association — White House Dimensions](https://www.whitehousehistory.org/press-room/press-backgrounders/white-house-dimensions)
- [NPS — Explore President's Park](https://www.nps.gov/whho/planyourvisit/explore-president-s-park.htm)
- [NPS — Northern Trail / Treasury / Lafayette Park](https://www.nps.gov/whho/planyourvisit/explore-the-northern-trail.htm)
- [NPS — Southern Trail / Ellipse](https://www.nps.gov/whho/planyourvisit/explore-the-southern-trail.htm)

重建：通过 Blender MCP 在后台 Blender 执行 `assets/blender/build_estate.py`，再运行 `node scripts/optimize-estate.mjs`。源场景使用共享几何体，导出后按材质合并同一地标下的静态网格，避免为每扇窗或每根围栏单独发出绘制调用。

首页使用独立的 Canvas 精灵粒子层：金色/青蓝光点、四翼精灵、轨迹与低亮度光束。移动端粒子数降低；系统减弱动态效果时停止循环动画；标签页不可见或进入游戏时释放动画帧。
