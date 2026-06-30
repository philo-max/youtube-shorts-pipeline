# 🛠️ 自动化视频渲染系统部署文档

本系统基于 **Remotion (React 视频渲染引擎)** 和 **n8n (工作流引擎)** 构建，实现 CSV + 图片自动化合成 16:9 MP4 视频的流水线。

---

## 1. 系统依赖环境

在部署本系统之前，请确保服务器/本地电脑已安装以下运行环境：
1. **Node.js**: 推荐版本 `v18.x` 或以上 (包含 `npm`)。
2. **FFmpeg**: Remotion 依赖 FFmpeg 来编码音视频。Remotion 会在首次运行时自动下载 FFmpeg。如果没有自动下载，可以通过命令行手动安装：
   ```bash
   npx remotion install ffmpeg
   ```
3. **n8n**: 推荐部署在本地或服务器 Docker 环境中，或者使用桌面版。

---

## 2. 项目部署步骤

### 第一步：获取源码与安装依赖
1. 将本项目解压至目标目录（如 `F:/youtube-shorts-pipeline`）。
2. 在项目根目录打开终端，执行以下命令安装 Node.js 依赖：
   ```bash
   npm install
   ```

### 第二步：配置环境变量
1. 复制 `.env.example` 并重命名为 `.env`：
   ```bash
   copy .env.example .env
   ```
2. 编辑 `.env` 文件，根据实际业务需求填写配置：
   - **ELEVENLABS_API_KEY**: ElevenLabs AI配音的 API Key。
   - **ELEVENLABS_VOICE_ID**: 配音发音人 ID (例如 `21m00Tcm4TlvDq8ikWAM` 代表 Rachel)。
   - **WECOM_WEBHOOK_URL**: 企业微信机器人的 Webhook 地址 (留空则仅在控制台输出日志)。
   - **USE_LOCAL_TTS**: 设置为 `true` 时，使用 Windows 本地 SAPI 免费配音 (无需 API Key，适合测试)；设置为 `false` 时使用 ElevenLabs 付费配音。

---

## 3. 导入 n8n 工作流

1. 启动你的 **n8n** 服务。
2. 创建一个新的空白工作流。
3. 点击工作流界面右上角的菜单按钮 (三个点)，选择 **"Import from File"** (从文件导入)。
4. 选择本项目中的 [workflow.json](file:///f:/youtube-shorts-pipeline/n8n/workflow.json) 文件。
5. 导入后，双击 **"执行 Remotion 渲染脚本"** 节点：
   - 将工作目录 (Working Directory) 确保指向本项目物理路径: `F:/youtube-shorts-pipeline`。
6. 点击右上角 **"Save"** 保存，并打开 **"Active"** 开关使其在后台监听。

---

## 4. 自动化流水线测试运行

在项目根目录下，直接执行以下命令进行本地一键测试（使用 `test-data/` 目录下的测试素材）：
```bash
npm run render
```
该命令会自动：
1. 解析 `test-data/storyboard.csv`。
2. 校验 `test-data/images` 里的图片是否完整。
3. 调用本地 TTS 生成配音 wav 文件。
4. 计算时长并自动合成视频，最终输出成品到 `out/video.mp4`。
