# openclaw-vibeknow-plugin

OpenClaw plugin for generating knowledge videos via IM channels (WeChat, WeCom, Lark, etc.) using the VibeKnow service.

## Features

Users send files or URLs in IM, and AI automatically generates knowledge short videos (5-10 minutes). Results are pushed back upon completion.

### Registered Tools

| Tool | Description |
|------|-------------|
| `upload_knowledge` | Upload files or URLs to the knowledge base |
| `generate_video` | Start a video generation task (async) |
| `check_video_status` | Check generation progress |
| `list_videos` | List historical videos |
| `get_video_url` | Get playback/download links |

## Installation

```bash
openclaw plugins install @vibeknow/openclaw-vibeknow-plugin
```

## Configuration

Add the following to `openclaw.json`:

```json5
{
  plugins: {
    entries: {
      vibeknow: {
        config: {
          figlensBaseUrl: "https://your-figlens-api.example.com",
          apiKey: "your-api-key",
          webhookSecret: "your-webhook-secret"  // optional, for verifying callback signatures
        }
      }
    }
  }
}
```

## Usage Example

```
User: Turn this link into a video https://example.com/article
Bot:  Knowledge base material parsed. Generating video, estimated 5-10 minutes...
Bot:  (a few minutes later) Your knowledge video is ready! Preview: https://...
```

## Development

```bash
npm install
npm run build
```

For local development, place the plugin in OpenClaw's `extensions/` directory for auto-discovery.
