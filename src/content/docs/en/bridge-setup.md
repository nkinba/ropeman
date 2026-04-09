---
title: Bridge Setup
description: Run Ropeman against a local Claude Code or Gemini CLI installation
category: guides
order: 6
---

**Bridge mode** lets Ropeman use a locally installed AI CLI — such as **Claude Code** or **Gemini CLI** — as its inference backend. Nothing touches Ropeman's servers: the browser talks to a small `localhost` bridge, which talks to your CLI, which talks to the provider.

Use Bridge mode when you already pay for a CLI subscription, want to reuse its authentication, or need stricter data routing than Demo/BYOK allows.

## What the Bridge Server Does

The bridge is a tiny Node process that runs on your machine and exposes a single HTTP endpoint. It:

- Accepts code structure summaries from Ropeman via `http://localhost:<port>`.
- Spawns your configured CLI (`claude` or `gemini`) with the prompt.
- Streams the CLI's response back to the browser.
- Never writes your code to disk.

## Prerequisites

- **Node.js 20+**
- At least one of:
  - [**Claude Code**](https://docs.claude.com/en/docs/claude-code) — installed and signed in.
  - [**Gemini CLI**](https://github.com/google-gemini/gemini-cli) — installed and signed in.
- A terminal.

Verify your CLI works independently before continuing:

```bash
claude --version
# or
gemini --version
```

## Running the Bridge (no install required)

The bridge server is published to npm as `@ropeman/bridge`. The recommended way to run it is **`npx`, which downloads and runs the package on demand without a global install** — this is also the exact command Ropeman's AI mode modal will hand you when you click **Connect → Bridge**.

```bash
npx @ropeman/bridge
```

The first invocation downloads the package once; subsequent runs use the npx cache and start instantly.

This starts the bridge on the default port (`9876`) and auto-detects installed CLIs. You should see output like:

```text
[ropeman-bridge] listening on http://localhost:9876
[ropeman-bridge] detected: claude (Claude Code)
[ropeman-bridge] detected: gemini (Gemini CLI)
```

Leave the terminal running while you use Ropeman.

### Options

```bash
# Pin to a specific CLI
npx @ropeman/bridge --cli claude
npx @ropeman/bridge --cli gemini

# Use a different port
npx @ropeman/bridge --port 4000
```

> Tip: open Ropeman's **Connect → Bridge** modal first — it shows the exact `npx` command pre-configured with your selected port and CLI, ready to paste into a terminal.

### Alternative: global install

If you run the bridge frequently or need to work offline, you can install it globally instead:

```bash
npm install -g @ropeman/bridge
ropeman-bridge
```

## Connecting Ropeman

1. Open [ropeman.dev](https://ropeman.dev).
2. Open **Settings → AI Connection** (or click the track selector in the Analyze modal).
3. Choose **Bridge**.
4. Enter the bridge URL (default: `http://localhost:9876`).
5. Pick the backend CLI — **Claude Code** or **Gemini CLI**.
6. Click **Connect**. A green dot and the model name appear when the handshake succeeds.

Run an analysis normally. Requests now flow: **browser → localhost:9876 → CLI → provider**.

## Verifying It Works

- The AI Connection card in Settings should show a green dot and model name.
- Run an analysis on a small project. The status bar should read "Bridge" with the CLI name.
- In the bridge terminal you'll see one log line per request.

## Troubleshooting

### "Failed to connect to bridge"

- Is the bridge process still running in its terminal?
- Is it on the same port Ropeman is pointed at?
- Try `curl http://localhost:9876/health` — you should get a JSON response.

### CORS error in browser console

The bridge sends permissive CORS headers for `https://ropeman.dev` by default. If you need to allow a different origin, pass `--origin` with the URL you want to whitelist when starting the bridge:

```bash
npx @ropeman/bridge --origin https://your-origin.example
```

### "CLI not found"

The bridge auto-detects `claude` and `gemini` on your `PATH`. If you see `CLI not found`:

```bash
which claude
which gemini
```

Make sure at least one is installed and accessible. On Windows, reopen the terminal after installing so PATH updates take effect.

### Port already in use

Another process is using `9876`. Either stop it or run the bridge on a different port (`--port 4000`) and update the URL in Ropeman's Settings.

### Requests time out

Large code structure summaries combined with slow CLI responses can exceed the default timeout. Try reducing the summary size cap in **Settings → Code structure summary size**.

Still stuck? See [Troubleshooting](/docs/en/troubleshooting) or check [Security](/docs/en/security) for how data flows in Bridge mode.
