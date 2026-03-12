# Planning Desktop (Neutralino)

Desktop wrapper for the DungeonBreak planning app. **Neutralino loads the Next app URL** – no static export.

## Run

1. **Start the Next server** (in a separate terminal):
   ```bash
   pnpm planning:standalone
   ```
   This runs the planning app at http://localhost:3101.

2. **Start the desktop app**:
   ```bash
   pnpm --dir packages/planning-neutralino run run
   ```
   Or from repo root: `pnpm desktop` (starts both Next and Neutralino).

The desktop window opens and shows the planning app. If the window is blank, ensure the Next server is running and (on Windows) consider the WebView2 loopback note below.

## Windows

If you see a blank white window, loopback access for the WebView host may be disabled. Run in an elevated command prompt (with user consent):
```text
CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"
```
Installing the [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) is recommended.

## Build

```bash
pnpm --dir packages/planning-neutralino run build
# or
pnpm --dir packages/planning-neutralino run build:release
```

Binaries are in `packages/planning-neutralino/dist/`.
