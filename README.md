# FreeStickies 🗒️

> **Vibe coded entirely using [Claude](https://claude.ai) (Anthropic) — not a single line written by hand.**

A free, open-source, fully offline desktop sticky notes app for macOS. No subscriptions. No ads. No cloud. Just sticky notes that live on your desktop and get out of the way.

Built as a replacement for paid apps like Stickies that charge monthly for something this simple.

---

## What it looks like

Dark Batman-theme desktop with floating sticky notes — transparent backgrounds, always-on-top, auto-hiding toolbar. Pure black and white aesthetic.

---

## Features

- **Multiple sticky notes** — as many as you want, each a separate floating window
- **Always on top** — notes float above everything else
- **Auto-hide toolbar** — header disappears when you're not focused on a note
- **Rich text** — bold, italic, underline, strikethrough, font family, font size, text colour
- **Lists** — bullet lists, numbered lists, indent / outdent
- **Three-state to-do checkboxes** — cycle ○ todo → ◉ in-progress → ✓ done
- **Progress bar** — auto-appears on notes with checkboxes
- **Background transparency** — set background alpha to 0% for pure floating text
- **Window opacity** — separate control to dim the whole window
- **Background colour** — any colour, with presets
- **Roundness** — adjustable corner radius slider
- **Lock** — prevent accidental edits with one click
- **Collapse** — shrink a note to just its title bar
- **Duplicate** — clone any note instantly
- **Copy as Markdown** — export note content as formatted Markdown
- **Word count** — live character and word count
- **System tray** — lives in the macOS menu bar
- **Fully persistent** — notes survive restarts, stored locally

---

## Install (for users)

1. Download **FreeStickies.dmg** from the [Releases](../../releases) page
2. Open the DMG
3. Drag **FreeStickies** → **Applications**
4. Launch from Spotlight or Launchpad
5. First launch only: macOS may ask you to approve it — right-click → **Open**

---

## Build from source

**Requirements:** Node.js 18+, macOS

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/freestickies.git
cd freestickies

# Install Electron
npm install

# Run in dev mode
npm start
```

### Build the distributable DMG

```bash
bash build-dmg.sh
```

Creates `FreeStickies.dmg` — ready to install or share.

---

## Project structure

| File | What it does |
|------|-------------|
| `main.js` | Electron main process — window management, IPC, data persistence |
| `preload.js` | Secure IPC bridge via `contextBridge` |
| `note.html` | Entire UI in one file — HTML, CSS, and JS |
| `package.json` | App manifest |
| `build-dmg.sh` | One-command DMG builder |

Notes are saved at:
```
~/Library/Application Support/FreeStickies/free-stickies-notes.json
```

---

## How this was built

This app was **100% vibe coded** using **[Claude](https://claude.ai)** by Anthropic. Every line of code — the Electron setup, the rich text editor, the three-state checkboxes, the transparency system, the DMG build pipeline — was generated through conversation with Claude. No manual coding involved.

If you want to build something like this yourself, just start a conversation with Claude and describe what you want. It handles the rest.

---

## License

MIT — free to use, modify, and distribute.
