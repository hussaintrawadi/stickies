const {
  app, BrowserWindow, Tray, Menu, ipcMain,
  screen, nativeImage
} = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Single instance lock ──────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); }

// ── Data persistence ──────────────────────────────────────────────────────
const DATA_FILE = path.join(app.getPath('userData'), 'free-stickies-notes.json');

function loadNotes() {
  try {
    if (fs.existsSync(DATA_FILE))
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { console.error('Load error:', e); }
  return [];
}

function saveAllNotes() {
  const notes = [];
  noteWindows.forEach(({ win, data }) => {
    if (win.isDestroyed()) return;
    const b = win.getBounds();
    notes.push({
      ...data,
      x: b.x, y: b.y,
      width:  b.width,
      // Save expanded height (not the collapsed 32px height)
      height: data.collapsed ? (data._expandedHeight || 320) : b.height,
    });
  });
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2)); }
  catch (e) { console.error('Save error:', e); }
}

// ── Window registry ───────────────────────────────────────────────────────
const noteWindows = new Map(); // id → { win, data }
let tray = null;

// ── Create one sticky-note window ─────────────────────────────────────────
function createNoteWindow(noteData = {}) {
  const id = noteData.id || `note-${Date.now()}`;
  const { width = 320, height = 320 } = noteData;
  const { workAreaSize } = screen.getPrimaryDisplay();
  const x = noteData.x ?? Math.round(Math.random() * Math.max(0, workAreaSize.width  - width));
  const y = noteData.y ?? Math.round(Math.random() * Math.max(0, workAreaSize.height - height));

  const win = new BrowserWindow({
    width, height, x: Math.round(x), y: Math.round(y),
    minWidth:    200,
    minHeight:   32,          // allows collapse to title-bar only
    frame:       false,
    transparent: true,
    alwaysOnTop: noteData.alwaysOnTop !== false,
    resizable:   !noteData.collapsed,
    skipTaskbar: true,
    hasShadow:   false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, 'note.html'));

  win.webContents.on('did-finish-load', () => {
    // Restore opacity before showing content
    if (noteData.opacity !== undefined && noteData.opacity < 1) {
      win.setOpacity(Math.max(0.15, Math.min(1, noteData.opacity)));
    }

    const defaults = {
      bgColor: '#1E1E2E', textColor: '#CDD6F4',
      font: 'Georgia, serif', fontSize: 14,
      borderRadius: 12, content: '',
      alwaysOnTop: true, opacity: 1, collapsed: false,
    };
    win.webContents.send('init-note', { ...defaults, ...noteData, id });

    // Re-collapse the window after renderer is ready
    if (noteData.collapsed) {
      setTimeout(() => {
        if (!win.isDestroyed()) {
          win.setSize(win.getBounds().width, 32, true);
          win.setResizable(false);
        }
      }, 80);
    }
  });

  noteWindows.set(id, { win, data: { ...noteData, id } });

  const onBoundsChange = () => saveAllNotes();
  win.on('resize', onBoundsChange);
  win.on('moved',  onBoundsChange);
  win.on('closed', () => { noteWindows.delete(id); rebuildTrayMenu(); });

  rebuildTrayMenu();
  return id;
}

// ── Tray ──────────────────────────────────────────────────────────────────
function makeTrayIcon() {
  // 44×44 PNG at scaleFactor 2 → crisp 22×22 on retina menu bar.
  // Sticky note silhouette: body + folded top-right corner + 3 staggered lines.
  // setTemplateImage(true) → macOS makes it white on dark / black on light bar.
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAtUlEQVR4nO2YQQ6AIAwEi/H/X64XD2qAbKmlGHfOQodNKYkihBDSo1gXqKq6CpZirnlbj37oFa0WH5A3C3sTeh7cut9mKeKV7e2NAglHcD28RTpNWGRMOlVYxC69x+q0qckhdyQ94StLJtxKEe3hYeGsF2+plkAYTjjiEUH4XMIUjmb6lPD2/n8S5pQAoXA006bEWz3/n4Q5JUAoHA2Fl0FPsvc2j7UoaZTp/4erEkkznRACcAAVwFQ/JvL4cQAAAABJRU5ErkJggg==';
  const img = nativeImage.createFromBuffer(Buffer.from(b64, 'base64'), { scaleFactor: 2.0 });
  img.setTemplateImage(true);
  return img;
}

function rebuildTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const items = [];
  noteWindows.forEach(({ win, data }) => {
    if (win.isDestroyed()) return;
    items.push({
      label: '📝  ' + (data.title || 'Untitled note'),
      click: () => { win.show(); win.focus(); }
    });
  });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '✚  New Sticky Note', click: () => createNoteWindow() },
    { type: 'separator' },
    ...(items.length ? [...items, { type: 'separator' }]
      : [{ label: 'No open notes', enabled: false }, { type: 'separator' }]),
    { label: 'Show All', click: () => noteWindows.forEach(({ win }) => { if (!win.isDestroyed()) { win.show(); win.focus(); } }) },
    { label: 'Hide All', click: () => noteWindows.forEach(({ win }) => { if (!win.isDestroyed()) win.hide(); }) },
    { type: 'separator' },
    { label: 'Quit Free Stickies', click: () => { saveAllNotes(); app.quit(); } },
  ]));
}

// ── IPC handlers ──────────────────────────────────────────────────────────

ipcMain.on('note-update', (_e, { id, data }) => {
  const entry = noteWindows.get(id);
  if (entry) { entry.data = { ...entry.data, ...data }; rebuildTrayMenu(); saveAllNotes(); }
});

ipcMain.on('note-delete', (_e, { id }) => {
  const entry = noteWindows.get(id);
  if (entry && !entry.win.isDestroyed()) entry.win.destroy();
  noteWindows.delete(id); saveAllNotes(); rebuildTrayMenu();
});

ipcMain.on('new-note', () => createNoteWindow());

ipcMain.on('set-always-on-top', (_e, { id, value }) => {
  const entry = noteWindows.get(id);
  if (entry && !entry.win.isDestroyed()) {
    entry.win.setAlwaysOnTop(value);
    entry.data.alwaysOnTop = value;
    saveAllNotes();
  }
});

ipcMain.on('set-opacity', (_e, { id, value }) => {
  const entry = noteWindows.get(id);
  if (entry && !entry.win.isDestroyed()) {
    const v = Math.max(0.15, Math.min(1, value));
    entry.win.setOpacity(v);
    entry.data.opacity = v;
    saveAllNotes();
  }
});

ipcMain.on('set-collapsed', (_e, { id, collapsed }) => {
  const entry = noteWindows.get(id);
  if (!entry || entry.win.isDestroyed()) return;
  const [w, h] = entry.win.getSize();
  if (collapsed) {
    entry.data._expandedHeight = h;
    entry.data.collapsed = true;
    entry.win.setResizable(false);
    entry.win.setSize(w, 32, true);   // animate to 32px
  } else {
    entry.data.collapsed = false;
    const expandH = entry.data._expandedHeight || 320;
    entry.win.setResizable(true);
    entry.win.setSize(w, expandH, true);
  }
  saveAllNotes();
});

ipcMain.on('duplicate-note', (_e, { id }) => {
  const entry = noteWindows.get(id);
  if (!entry) return;
  const b = entry.win.getBounds();
  const { id: _id, collapsed, _expandedHeight, ...rest } = entry.data;
  createNoteWindow({ ...rest, x: b.x + 24, y: b.y + 24 });
});

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();

  tray = new Tray(makeTrayIcon());
  tray.setToolTip('Free Stickies');
  rebuildTrayMenu();
  tray.on('click', () => tray.popUpContextMenu());

  const saved = loadNotes();
  if (saved.length === 0) createNoteWindow();
  else saved.forEach(n => createNoteWindow(n));
});

app.on('window-all-closed', () => { /* keep alive in tray */ });
app.on('before-quit', () => saveAllNotes());
