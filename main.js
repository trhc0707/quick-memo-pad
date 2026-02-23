const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, screen, shell } = require("electron");
const path = require("path");

let mainWindow = null;
let tray = null;
let isPinned = true;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 480,
    height: 560,
    minWidth: 300,
    minHeight: 250,
    x: width - 510,
    y: 40,
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 14 },
    show: false,
    // ── FULLSCREEN OVERLAY ──
    alwaysOnTop: true,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    resizable: true,
    hasShadow: true,
    backgroundColor: "#fdfbf5",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ── CRITICAL: Float above fullscreen spaces on macOS ──
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("show", () => {
    applyPinState();
  });
}

function applyPinState() {
  if (!mainWindow) return;
  if (isPinned) {
    mainWindow.setAlwaysOnTop(true, "floating");
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setVisibleOnAllWorkspaces(false);
  }
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
    applyPinState();
  }
}

function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: "表示/非表示", accelerator: "CmdOrCtrl+Shift+A", click: toggleWindow },
    { type: "separator" },
    {
      label: "全画面の上に固定",
      type: "checkbox",
      checked: isPinned,
      click: (item) => {
        isPinned = item.checked;
        applyPinState();
        if (mainWindow) mainWindow.webContents.send("pin-changed", isPinned);
      },
    },
    { type: "separator" },
    {
      label: "終了",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

// ── IPC Handlers ──
ipcMain.handle("toggle-pin", () => {
  isPinned = !isPinned;
  applyPinState();
  updateTrayMenu();
  return isPinned;
});

ipcMain.handle("get-pin-state", () => isPinned);

ipcMain.handle("set-opacity", (_, val) => {
  if (mainWindow) mainWindow.setOpacity(Math.max(0.15, Math.min(1.0, val)));
});

ipcMain.handle("get-opacity", () => (mainWindow ? mainWindow.getOpacity() : 1.0));

ipcMain.handle("open-url", (_, url) => {
  shell.openExternal(url);
});

// ── App lifecycle ──
app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+A", toggleWindow);

  // Tray icon
  const trayIcon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAc5JREFUWEftljFOw0AQRf+sIqWgoeEANEhIXICWC3AFGu5AQUdBxQGg4QKckAYJKQ0Fkr1itJrY3vVsnITCkq3d2Zn/Z2a8Jmb+0Mz5YxHASQA7AF7G+L/yTBvAKxH5PSbJAoBj4h0VuVeeMlVlZt4AMAlgS0Q+ZKqyAuAsVVX1RPQG4C2AhIg8jlVWFsCpiNwCOAZwp6r3RNTJCqAM4FxV7wAcicgNEXUSAJKuOicib6paDuA+gJ6IXGU9w/oUwBEAF8BZKZcAsAvgMPb/QER6cTmSHsABgD1V7YjIExHdENFKkmYF4JKIWkR0A+AhFWQ0BwxgS0SiJJSXsgDuVHUdwHIavYjcEZFLQYlZDOCYiPpJ2qkAOCDfBLAdRy8irxNRLwbgREQuARyKyGUsq3Ss5YClC+BARN5H+F8FOI33rE6pIACr8UtV3SaiJRF5D+BIRN7F36sALmI9y0WCuExEkf8pOSJXRBQNVGSJnxPRhoi8TcqRS8H+DAHkJehHZQOcqeo5EW2IyMtRv5dpQlmA6MFXInIee5aqx7PnwH+wdCZuRFayiifrDPh/g7u/AjhT1QtVvSeiVRF58n7Q/3j/D/0CJRy1b2l8Bn4Ax2u2IHFHsa8AAAAASUVORK5CYII="
  );
  tray = new Tray(trayIcon.resize({ width: 18, height: 18 }));
  tray.setToolTip("ATOK Pad");
  tray.on("click", toggleWindow);
  updateTrayMenu();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
