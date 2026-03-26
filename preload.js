const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stickyAPI', {
  onInitNote:    (cb) => ipcRenderer.on('init-note', (_e, d) => cb(d)),
  updateNote:    (id, data) => ipcRenderer.send('note-update',      { id, data }),
  deleteNote:    (id)       => ipcRenderer.send('note-delete',      { id }),
  newNote:       ()         => ipcRenderer.send('new-note'),
  setAlwaysOnTop:(id, val)  => ipcRenderer.send('set-always-on-top',{ id, value: val }),
  setOpacity:    (id, val)  => ipcRenderer.send('set-opacity',      { id, value: val }),
  setCollapsed:  (id, val)  => ipcRenderer.send('set-collapsed',    { id, collapsed: val }),
  duplicateNote: (id)       => ipcRenderer.send('duplicate-note',   { id }),
});
