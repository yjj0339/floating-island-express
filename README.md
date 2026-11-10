# 浮空岛快递 · Floating Island Express

一款纯前端的 3D 卡通低多边形飞行小游戏。驾驶珊瑚橙小飞机，在明亮高饱和的云海与浮空岛之间穿梭，穿过金色风环借力加速，完成「天空邮局 · 第 7 航线」的五份天空快递。

使用 Three.js（本地打包，无 CDN 依赖）实现，飞机模型为项目内生成的 GLB（`assets/models/plane.glb`），随源码附带，完全离线可跑。

## 快速开始

需要通过 HTTP 访问（ES Module + importmap 不支持 `file://`）：

```bash
# 任选一种
python -m http.server 8000
npx serve .
```

然后浏览器打开 <http://localhost:8000>。

## 操作

| 按键 | 作用 |
| --- | --- |
| `W` / `↑` | 上升（抬头爬升） |
| `S` / `↓` | 下降 |
| `A` / `←` | 左转 |
| `D` / `→` | 右转 |
| `空格` | 加速冲刺（消耗冲刺能量） |
| `Esc` | 暂停 / 继续 |

移动端：左下虚拟摇杆控制方向与升降，右下圆形按钮冲刺（圆环显示剩余能量）。

## 三种模式

1. **5 份订单**：依次飞往 5 座浮空岛，穿过岛屿上方的金色光环把快递送达。HUD 显示「天空邮局 · 第 7 航线」进度（5 个圆点）。
2. **风环冲刺**：60 秒计时，穿越尽可能多的金色风环，每个 +50 分。
3. **自由飞行**：没有时限，随意探索云海与浮岛，风环同样计分。

- 穿过风环：+50 分，同时补充约 38% 冲刺能量。
- 送达一份快递：150 分 + 速度奖励。
- 最高分按模式分别保存在浏览器 `localStorage`（`fie.save.v1`），同时记忆音效开关与语言偏好。

## 特性

- **全程序化世界**：天空渐变 shader、低多边形云团（InstancedMesh）、锥形浮空岛 + 树屋/邮局/风车/灯塔、金色风环与光柱。
- **飞机模型本地化**：`tools/make_plane.py` 用纯 Python 生成 GLB（含机身、机翼、尾翼、座舱、螺旋桨、起落架、货箱），螺旋桨作为独立节点在运行时旋转。模型加载失败时会自动降级为简易几何体，游戏不会中断。
- **飞行手感**：弧线飞行模型，`W/S` 控制俯仰 → 自然爬升/下降，`A/D` 转向并自动压坡度，冲刺时 FOV 拉伸 + 粒子尾迹。
- **音效**：全部用 WebAudio 实时合成（引擎低鸣、风噪、风环风铃、送达号角、撞击），无音频素材文件，可一键静音。
- **中英双语**：右上角 `EN / 中` 切换，所有界面文案与岛屿名均本地化。
- **响应式**：桌面为左侧毛玻璃面板 + 右侧场景；移动端为底部抽屉式面板，竖屏自动拉远相机与放大 FOV。

## 目录结构

```
.
├── index.html               # 页面结构 + HUD + 弹窗
├── css/style.css            # 全部样式（毛玻璃 / 响应式 / HUD）
├── js/
│   ├── main.js              # 状态机、输入、相机、计分、UI 绑定、主循环
│   ├── world.js             # 天空、云海、浮空岛、风环、光柱、碰撞
│   ├── plane.js             # GLB 加载、飞行物理、冲刺尾迹
│   ├── audio.js             # WebAudio 程序化音效
│   └── i18n.js              # 中英文案
├── assets/models/plane.glb  # 随源码附带的飞机模型
├── vendor/                  # 本地 Three.js r158 + GLTFLoader
└── tools/
    ├── make_plane.py        # 飞机 GLB 生成脚本（无第三方依赖）
    └── model-check.html     # 模型预览小工具
```

重新生成飞机模型：

```bash
python tools/make_plane.py
```

## 部署

静态站点，任意静态托管均可。GitHub Pages：

```bash
git init && git add . && git commit -m "feat: floating island express"
gh repo create floating-island-express --public --source=. --push
gh api repos/:owner/floating-island-express/pages -X POST \
  -f "source[branch]=main" -f "source[path]=/"
```

若仓库默认分支为 `main`，稍等片刻即可访问 `https://<user>.github.io/floating-island-express/`。

## 兼容性

Chrome / Edge / Safari / Firefox 最新版，需支持 WebGL2 与 ES Module importmap。iOS Safari 13+、Android Chrome 均可运行。
