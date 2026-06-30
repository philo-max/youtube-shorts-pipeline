# 🎬 YouTube Shorts & Video Pipeline

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Remotion](https://img.shields.io/badge/Rendered%20with-Remotion-blueviolet.svg)](https://www.remotion.dev/)
[![n8n](https://img.shields.io/badge/Workflow-n8n-orange.svg)](https://n8n.io/)

这是一个基于 **Remotion (React 视频渲染引擎)** 和 **n8n (自动化工作流引擎)** 构建的短视频/横屏视频自动化生成系统。只需准备一份 **分镜 CSV 表格** 和 **图片素材**，即可一键自动完成：素材校验、AI/本地配音合成、字幕时间轴自动对齐、动态镜头（Ken Burns 效果）、背景音乐与水印融合，最终渲染出高画质的 MP4 视频，并支持企业微信等即时通信工具的渲染进度与结果通知。

---

## 🚀 系统工作流架构

```
   [ 运营人员准备 ]
 ┌─────────────────┐
 │ - 故事板 (CSV)   │
 │ - 图片素材      │
 └────────┬────────┘
          │ (手动运行或 Webhook 触发)
          ▼
 ┌────────────────────────────────────────────────────────┐
 │                   bin/pipeline.js                      │
 │ 1. 解析 CSV 表格，校验图片素材完整性                     │
 │ 2. 调用 TTS 引擎生成配音 (ElevenLabs 或 Windows SAPI)   │
 │ 3. 动态测量语音时长，并生成视频输入参数配置 (input.json) │
 └────────┬───────────────────────────────────────────────┘
          │ (加载 React 组件)
          ▼
 ┌────────────────────────────────────────────────────────┐
 │                   Remotion Engine                      │
 │ 1. 动态生成 Intro (片头) & Outro (片尾/关注引导)        │
 │ 2. 应用 Ken Burns 缩放平移效果 & 智能字幕高亮淡出过渡     │
 │ 3. 混音 BGM 并自动做首尾淡入淡出                        │
 └────────┬───────────────────────────────────────────────┘
          │ (并行编码渲染)
          ▼
 ┌───────────────────────────┐
 │ 导出成片: out/video.mp4  │ ────► [ 发送企业微信 Webhook 结果通知 ]
 └───────────────────────────┘
```

---

## ✨ 核心特性

- 🤖 **双 TTS 配音引擎**：
  - **ElevenLabs 顶级 AI 配音**：生成极具电影质感和情绪起伏的人声（支持多国语言）。
  - **Windows 本地离线 SAPI 引擎**：无需网络和 API Key，本地免费离线合成，降低测试与低预算开发成本。
- ⏱️ **智能字幕与时长自适应**：
  - 自动通过 Windows Media 接口或 WAV 文件头信息测量每段配音的时长。
  - 根据配音时长自适应调整视频帧率与每一镜的时长。
  - 自动切分标点符号段落，实现高清晰度、高亮同步演播字幕。
- 🎨 **一键换肤与全局视觉主题 (`theme.json`)**：
  - 可随意更换字体（支持 Google Fonts 动态加载）、主题强调色、字幕字号与间距、转场淡入淡出帧数以及 Ken Burns 缩放强度。
- ⚙️ **n8n 零门槛集成**：
  - 预置 [n8n 工作流配置](n8n/workflow.json)，一键导入即可实现 Webhook 触发渲染，轻松接入任何第三方系统。

---

## 📂 项目目录结构

```bash
├── assets/             # 默认全局素材 (bgm.mp3, logo.png)
├── bin/
│   ├── pipeline.js     # 核心驱动脚本：解析 CSV、合成语音、计算时长、驱动渲染
│   └── setup_assets.js # 辅助脚本：生成测试素材
├── n8n/
│   └── workflow.json   # 可直接导入 n8n 的自动化工作流文件
├── public/             # Remotion 静态资源服务器目录
│   └── temp/           # [已忽略] 存放流水线运行中生成的临时音频和缩放图片
├── src/                # React 视频渲染核心组件
│   ├── Components/
│   │   ├── BGM.tsx     # 背景音乐控制 (含淡入淡出)
│   │   ├── Intro.tsx   # 动态粒子/渐变背景片头
│   │   ├── Outro.tsx   # 引导关注片尾 (带 Logo 呼吸呼吸效果)
│   │   └── Shot.tsx    # 核心分镜组件 (Ken Burns 动效 + 字幕渲染)
│   ├── Root.tsx        # 视频合成注册入口
│   ├── ShortsTemplate.tsx # 视频主时间轴编排
│   └── index.ts        # 模块打包入口
├── test-data/          # 演示测试数据目录
│   ├── images/         # 测试分镜图片 (1.jpg, 2.jpg, 3.jpg)
│   └── storyboard.csv  # 演示分镜表 (包含台词文案与对应图片)
├── .env.example        # 环境变量模板
├── theme.json          # 主题与动画配置文件
└── run_pipeline.bat    # Windows 环境下一键运行测试脚本
```

---

## 🛠️ 快速上手

### 1. 准备依赖环境
- 安装 [Node.js](https://nodejs.org/) (推荐版本 `v18.x` 或以上)。
- 本项目底层依赖 **FFmpeg** 编码音视频。Remotion 通常会在初次运行时自动尝试下载 FFmpeg。如果遇到报错，你可以通过以下命令手动安装：
  ```bash
  npx remotion install ffmpeg
  ```

### 2. 安装项目依赖
在项目根目录下打开终端，运行：
```bash
npm install
```

### 3. 配置环境变量
1. 复制模板配置文件：
   ```bash
   copy .env.example .env
   ```
2. 编辑 `.env` 文件以调整配置：
   - **`USE_LOCAL_TTS=true`**：默认使用 Windows 本地 SAPI 离线配音（推荐初次测试使用）。
   - 如果你想使用顶级 AI 配音，请将其设为 `false`，并填入您的 `ELEVENLABS_API_KEY`。
   - 配置 `WECOM_WEBHOOK_URL` 可以在渲染完成时，自动在企业微信群收到卡片通知。

### 4. 运行一键测试
直接在根目录下双击 `run_pipeline.bat`，或者在终端执行：
```bash
npm run render
```
运行完成后，可在 **`out/video.mp4`** 找到合成好的视频文件！

---

## 📖 运营/制作规范

运营和编导人员只需简单准备以下两个文件：

### 1. 分镜表格 (`storyboard.csv`)
使用 Excel 或 WPS 创建表格并另存为 **CSV 格式**，表头需包含以下列：
| 镜头编号 | 解说台词 | 图片文件名 |
| :--- | :--- | :--- |
| 1 | 这是一个关于远古遗迹的秘密... | 1.jpg |
| 2 | 紧接着我们在极地冰川下发现了飞船... | 2.jpg |

### 2. 图片素材
将与 CSV 表格中对应的图片（支持 `.jpg` / `.png`，建议比例为横屏 **16:9**）存放在指定的图片文件夹中。

> 💡 **详细操作指南与配置解析请参阅**：
> - [📖 运营操作手册](MANUAL.md)
> - [🛠️ 部署运维文档](DEPLOY.md)

---

## 🔗 n8n 自动化 Webhook 接口

将 `n8n/workflow.json` 导入你的 n8n。启用后，可通过向以下地址发送 `POST` 请求实现远程自动化剪辑：
- **请求地址**: `http://<n8n-ip>:5678/webhook/render-video`
- **Payload 示例**:
  ```json
  {
    "csv_path": "F:/channel-data/storyboard.csv",
    "images_dir": "F:/channel-data/images",
    "output_path": "F:/channel-data/output/video.mp4",
    "use_local_tts": true
  }
  ```

---

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。欢迎大家自由 Fork、修改和分发！
