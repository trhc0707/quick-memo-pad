const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  togglePin: () => ipcRenderer.invoke("toggle-pin"),
  getPinState: () => ipcRenderer.invoke("get-pin-state"),
  setOpacity: (val) => ipcRenderer.invoke("set-opacity", val),
  getOpacity: () => ipcRenderer.invoke("get-opacity"),
  openURL: (url) => ipcRenderer.invoke("open-url", url),
  onPinChanged: (cb) => {
    ipcRenderer.on("pin-changed", (_, val) => cb(val));
  },
});
