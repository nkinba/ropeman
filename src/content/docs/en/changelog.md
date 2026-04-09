---
title: Changelog
description: Recent Ropeman releases and notable changes
category: support
order: 8
---

A condensed history of recent user-facing changes.

## 2026-04-03

Help, onboarding, and test coverage polish.

- **Help modal** (`?` key) with four tabs: Usage, AI Modes, Shortcuts, FAQ. Fully translated (English / Korean).
- **Interactive onboarding tour** — 2-phase guided walkthrough (3 + 5 steps) with arrow-key navigation and a "restart from Settings" path.
- **Settings modal redesign** — AI connection status indicator, cache clear button, code-editor font-size slider (10–24 px).
- **File type icons** — Material Symbols mapped per extension across the explorer, breadcrumb, and semantic panels.
- **Semantic breadcrumb improvements** — dropdowns now show child nodes of each level for direct navigation.
- **Terminology** — user-facing label "skeleton" replaced with "code structure summary" throughout. Default cap raised from 150 KB to 250 KB.
- **Drill-down path matching fix** — resolved a mismatch between AI-returned paths and the local file tree for nested projects.

## 2026-04-01

MVP deployment.

- **Production launch at [ropeman.dev](https://ropeman.dev)** on a custom domain.
- **Tab / pane UX** — drill-down now reuses the existing diagram tab; code tabs open on the opposite pane in split view; empty split panes auto-collapse.
- **Light-theme hero color fix**.
- **`Ctrl+Shift+V`** now toggles the sidebar panel (Files / Semantic) instead of cycling tabs.

## 2026-03-31 (Loading & Cache UX)

Loading UX, landing redesign, semantic cache stabilization.

- **Unified loading UX** — analysis progress card and a status bar showing zoom, minimap, connection state, and version.
- **WebGPU cache verification** — model weights persist across reloads and restore instantly on the next visit.
- **Stable analysis cache** — analysis results restore automatically without re-calling the AI.
- **Semantic node highlight** — selected node is visually emphasized while the rest dim.
- **Light theme polish** — missing color tokens added; hardcoded color values cleaned up.
- **Landing page redesign** — Multi-Track AI feature card and refined language icon row.

## 2026-03-31 (Design Standardization)

The "Obsidian Architect" design applied across the app.

- **17 shared component classes** added to the global stylesheet; every modal migrated to the shared classes.
- **Main layout polish** — 48 px header, 48 px icon bar + content panel sidebar, recalibrated canvas background.
- **Semantic node redesign** — 256 px width, accent bar, uppercase titles, tinted badges, glow on selection.
- **Empty-state design** — large headline, SVG dashed dropzone, supported-language pills.
- **Material Symbols Outlined** font integrated; emoji icons replaced across the app.
- **Symbol Sidebar** toggle added to Settings (default off).

## 2026-03-30

Design system foundation.

- **Obsidian Architect palette** — 7-level surface hierarchy, no-line rule (regions separated by surface tone, not borders), Space Grotesk + Inter + JetBrains Mono typography.
- **Glassmorphism modals** — backdrop-blur applied to every modal.
- **Semantic node accent bar** — surface-container-high background with a colored left accent bar.
- **Reactive state stabilization** — semantic tree now updates live whenever the analysis cache changes.
