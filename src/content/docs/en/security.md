---
title: Security & Privacy
description: Your source code never leaves the browser — here is exactly what is transmitted
category: guides
order: 3
---

## The Core Promise

> **Your original source code is never transmitted to any server — under any circumstances.**

Ropeman is **local-first** by design. All file reading and parsing happens in your browser. The only thing that ever travels over the network is a compact **code structure summary** containing function signatures, class outlines, and import relationships — never the body of your functions, never comments, never secrets.

## What Actually Leaves the Browser

When you click **Analyze with AI**, this is the pipeline:

1. **File read (local)** — Files are read directly through the browser's File System Access API. Nothing is uploaded.
2. **AST parsing (local)** — An in-browser parser builds an abstract syntax tree entirely on your machine. There is no upload step.
3. **Summary extraction (local)** — The parser output is reduced to a minimal structural summary (function names, signatures, class hierarchies, imports). Implementation bodies are dropped. The summary is capped at ~250 KB by default and adjustable in Settings.
4. **AI inference (varies by mode)** — Only this step involves the network, and only the summary is sent.
5. **Diagram render (local)** — The AI response is parsed into nodes and edges and rendered in your browser.

## Data Flow by Mode

| Mode        | Summary goes to...                        | Routes through Ropeman? |
| ----------- | ----------------------------------------- | ----------------------- |
| **Demo**    | Edge proxy → hosted LLM API               | Yes (proxy only)        |
| **API Key** | Edge proxy → your chosen provider         | Yes (proxy only)        |
| **Bridge**  | `localhost` bridge → local CLI → provider | No                      |
| **WebGPU**  | Nowhere — inference runs in-browser       | No                      |

- **Demo** and **API Key** modes pass through Ropeman's edge proxy. The proxy is a stateless forwarder — it does not log, store, or persist your summary or responses.
- **Bridge** mode talks only to a `localhost` address. The code structure summary is handed to your locally installed CLI (Claude Code, Gemini CLI, etc.) which makes the provider call on your behalf.
- **WebGPU** mode is fully offline once the model is cached.

## API Key Handling

When you use **API Key (BYOK)** mode:

- Keys are stored only in your browser, keyed per provider.
- Keys are **never** stored on Ropeman's servers.
- On each analysis, the key is attached to the outgoing request, forwarded to the provider, and immediately discarded by the proxy.
- You can wipe all keys at any time via **Settings → Reset Settings**.

For the strictest posture, use **Bridge** (no key needed — the CLI handles auth) or **WebGPU** (no provider at all).

## What Is Cached Locally

Ropeman caches three kinds of data in your browser so that reopening a project is instant:

- **Semantic analysis results** — restored automatically on the next visit so you don't pay for re-analysis.
- **Search and chat index** — built on first analysis, used to answer questions about the project.
- **WebGPU model weights** — only when you've used WebGPU mode.

All caches live under your browser's origin. Clearing site data removes them, and you can wipe just the analysis cache from **Settings → Clear Cache**.

## Privacy Principles

- **No account, no per-project telemetry.** Ropeman tracks only aggregate page-view statistics (cookieless, no fingerprinting). It has no idea which projects you analyze.
- **No server-side storage of summaries or diagrams.** Everything you see is rebuilt in your browser on each visit.
- **Auditable.** Ropeman is open source — the parsing pipeline, summary extractor, and edge proxy are all reviewable.

If maximum privacy matters to you, start with [WebGPU mode](/docs/en/ai-modes).
