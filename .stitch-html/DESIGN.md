# Ropeman Design System: Obsidian Architect

## Product Overview

Ropeman is a **local-first web application** that analyzes codebases and generates AI-powered semantic architecture diagrams. Users load a project folder, AI analyzes the code structure, and produces interactive node-edge diagrams showing the architectural roles and relationships.

## Design Philosophy

- **Developer-first**: Feels like a premium code editor (VS Code, JetBrains)
- **Technical Clarity**: Information-dense but readable
- **No-Line Rule**: Structural separation through background tonal shifts, NOT borders
- **Glassmorphism for overlays**: Modals and floating panels use backdrop-blur

## Surface Hierarchy (Dark Theme)

- `surface-container-lowest` (#000000): Code editor backgrounds, canvas
- `surface` (#0a0e14): App shell base
- `surface-container-low` (#0f141a): Icon bars, deepest panels
- `surface-container` (#151a21): Sidebar content, secondary panels
- `surface-container-high` (#1b2028): Cards, active states, nodes
- `surface-container-highest` (#20262f): Popovers, highlights
- `surface-bright` (#262c36): Secondary button backgrounds

## Key Colors

- Primary: #a3a6ff (indigo) — AI actions, links, selected states
- Secondary: #53ddfc (cyan) — Graph edges, connections, info badges
- Tertiary: #ac8aff (violet) — WebGPU track, accents
- Error: #ff6e84, Warning: #f2c478, Success: #7ad4a0

## Typography Rules

- **Headlines/Titles**: Space Grotesk — ALL section labels should be UPPERCASE with letter-spacing: 0.05em
- **Body/Data**: Inter — functional text, descriptions
- **Code**: JetBrains Mono — code blocks, file paths
- Use 0.875rem (14px) for body, 0.75rem (12px) for labels, 1rem (16px) for titles

## Component Rules

### Sidebar (Left Panel)

- Icon bar: darkest tone (surface-container-low), 40px wide
- Content panel: surface-container background
- Section titles: UPPERCASE, letter-spacing, 11px, muted color
- File items: Inter, on-surface-variant color, hover shows surface-container-high bg
- Folder items: slightly brighter text than files
- Selected item: 2px left accent bar (primary color)

### Semantic Diagram Nodes

- Background: surface-container-high (#1b2028)
- Left accent bar: 2px, using node's semantic color
- Title: Space Grotesk, 13px, bright text
- Description: Inter, 11px, muted text
- Key symbols shown as small tags/pills
- File count badge: small rounded pill

### Graph Edges

- Color: secondary (#53ddfc) for depends_on/calls
- Style: dashed lines with subtle glow (drop-shadow)
- Edge labels: 10px, muted, positioned on path

### Modals

- Background: rgba(32, 38, 47, 0.85) with backdrop-blur: 20px
- Ghost border: 1px solid rgba(68, 72, 79, 0.15)
- Shadow: 0 24px 48px rgba(0,0,0,0.5)
- Title: Space Grotesk, UPPERCASE section labels
- Cards inside modal: surface-container-high bg, no borders, tonal separation

### Chat/Assistant Panel

- Title: 'ROPEMAN ASSISTANT' — uppercase, Space Grotesk, 12px, letter-spacing
- Background: glassmorphism
- User messages: surface-container-high bg
- AI messages: surface-container bg with subtle primary tint
- Input: surface-container-lowest bg, placeholder 'Ask about architecture...'

### Buttons

- Primary: gradient from primary to primary-container, white text
- Secondary: surface-bright bg, on-surface text
- Ghost: transparent bg, primary-colored text
- Danger: error color bg

### Status Bar (Bottom of diagram)

- Background: surface-container
- Shows: zoom level, minimap toggle, progress indicator, connection status
- Text: 11px, muted color

## Layout

- Header: 48px height, surface-container-low bg, no bottom border
- Sidebar: 240px width (collapsible), icon bar 40px
- Main content: fills remaining space
- Detail panel (right): 300px, slides in on node selection
- Tab bar: horizontal, below header

## Do NOT

- Do NOT use 1px solid borders for major sections
- Do NOT use pure white (#FFFFFF) for body text
- Do NOT use standard drop shadows — use ambient shadows or tonal layering
- Do NOT crowd elements — use generous spacing (16-24px between sections)
