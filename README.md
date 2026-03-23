# openclaw-vibeknow-plugin

OpenClaw 插件，通过微信/企微/飞书等 IM 渠道使用 VibeKnow 知识视频生成服务。

## 功能

用户在 IM 中发送文件或 URL，AI 自动生成知识短视频（3-5 分钟），完成后主动推送结果。

### 注册的工具

| 工具 | 说明 |
|------|------|
| `upload_knowledge` | 上传文件或 URL 到知识库 |
| `generate_video` | 启动视频生成任务（异步） |
| `check_video_status` | 查询生成进度 |
| `list_videos` | 列出历史作品 |
| `get_video_url` | 获取播放/下载链接 |

## 安装

```bash
openclaw plugins install @vibeknow/openclaw-vibeknow-plugin
```

## 配置

在 `openclaw.json` 中添加：

```json5
{
  plugins: {
    entries: {
      vibeknow: {
        config: {
          figlensBaseUrl: "https://your-figlens-api.example.com",
          apiKey: "your-api-key",
          webhookSecret: "your-webhook-secret"  // 可选，用于验证回调签名
        }
      }
    }
  }
}
```

## 使用示例

```
用户: 帮我把这个链接的内容做成视频 https://example.com/article
Bot:  知识库资料已解析完成。正在生成视频，预计 3-5 分钟...
Bot:  (3分钟后) 你的知识视频已生成完成！预览链接: https://...
```

## 开发

```bash
npm install
npm run build
```

本地开发时将插件放在 OpenClaw 的 `extensions/` 目录下自动发现。
