# 📖 运营操作手册：自动视频生成流水线

欢迎使用真相库短视频自动化系统！本文档将指导运营和编导人员如何准备视频素材，并使用本系统一键自动生成成品视频。

---

## 1. 素材准备规范

编导只需要准备两个东西：一个 **CSV 分镜表格** 和 **配套的图片素材**。

### 📌 规范一：分镜表格 (CSV)
分镜表格规定了每一镜的台词和画面，请使用 Excel 或 WPS 创建，最后另存为 **CSV 格式** (以逗号分隔)。
表格必须包含以下三列（支持中文或英文表头）：

| 镜头编号 | 解说台词 | 图片文件名 |
| :--- | :--- | :--- |
| 1 | 今天我们来揭秘古老图书馆的第一个秘密... | 1.jpg |
| 2 | 随后我们在火星表面发现了一个神秘的装置... | 2.jpg |
| 3 | 在霓虹闪烁的未来都市中，故事刚刚开始... | 3.jpg |

> **注意事项**：
> 1. **镜头编号**：必须是唯一的数字或字母，建议 1, 2, 3 顺序排列。
> 2. **解说台词**：台词长度不限，系统会自动切分字幕句段并适配语速播放。
> 3. **图片文件名**：写明对应的文件名，必须包含扩展名（如 `.jpg` 或 `.png`）。

### 📌 规范二：图片素材
1. **尺寸比例**：建议采用 **16:9** 横屏比例 (如 `1920x1080` 分辨率) 以免裁剪。
2. **格式**：支持 `.jpg`, `.jpeg`, `.png`。
3. **命名**：图片文件名必须与 CSV 表格中的 "图片文件名" 一列**完全一致**（大小写敏感）。

---

## 2. 视频渲染操作流程

### 路径一：本地文件夹快捷生成
1. 将准备好的 `storyboard.csv` 放入 `F:/youtube-shorts-pipeline/test-data/` 目录。
2. 将对应的图片素材全部放入 `F:/youtube-shorts-pipeline/test-data/images/` 目录。
3. 双击运行 `F:/youtube-shorts-pipeline/run_pipeline.bat` (或在命令行运行 `npm run render`)。
4. 等待进度条走满，成片视频将自动输出在 `F:/youtube-shorts-pipeline/out/video.mp4`。

### 路径二：n8n 自动化 Webhook 触发
如果接入了企业微信/管理后台，可以直接向 n8n Webhook 地址发送 POST 请求：
- **请求地址**: `http://localhost:5678/webhook/render-video`
- **请求内容 (JSON)**:
  ```json
  {
    "csv_path": "F:/your-channel/storyboard.csv",
    "images_dir": "F:/your-channel/images",
    "output_path": "F:/your-channel/output/video.mp4",
    "use_local_tts": true
  }
  ```
- 系统会自动进行素材校验、语音合成、视频剪辑，并将成功/报错结果直接发送到绑定的企业微信群中。

---

## 3. 个性化样式配置 (一键换肤)

通过修改 [theme.json](file:///f:/youtube-shorts-pipeline/theme.json) 配置文件，可以一键改变视频的配色、字体和样式，方便复用给其他频道：

- **channelName**: 频道名称，会显示在 Outro 片尾。
- **colors.primary**: 主题强调色 (默认黄金色 `#ffcc00`)，用于字幕的高亮及边框。
- **colors.background**: 背景基础色，视频转场和片头背景的底色。
- **subtitles.fontSize**: 字幕字号大小 (默认 `64`)。
- **subtitles.bottom**: 字幕距离画面底部的像素距离 (默认 `120`)。
- **animations.kenBurns**: 配置图片全屏播放时的微缩放效果（可关闭缩放或修改缩放强度）。
