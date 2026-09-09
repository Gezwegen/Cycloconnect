# CycloConnect

<div align="center">

![CycloConnect Banner](https://img.shields.io/badge/CycloConnect-v1.0.0-00e599?style=for-the-badge&logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=for-the-badge&logo=windows&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![Security](https://img.shields.io/badge/Security-DPAPI%20Encrypted-emerald?style=for-the-badge&logo=shield&logoColor=white)

**The modern, privacy-focused desktop companion for Mio Cyclo GPS cycling computers.**

[Features](#-key-features) • [Instant Launch](#-instant-launch-one-click) • [Device Connection](#-how-to-connect-your-device) • [Cloud Setup](#-cloud-integrations-strava--komoot) • [Development](#-developer-guide)

</div>

---

## 📖 Overview

**CycloConnect** bridges your Mio Cyclo navigation device with **Strava** and **Komoot**. It replaces obsolete manufacturer tools with a high-performance, dark-mode desktop application built on Electron, React 19, TypeScript, and Tailwind CSS.

### Supported Devices
* **Mio Cyclo 200 / 210 / 215 / 215 HC**
* **Mio Cyclo 300 / 305 / 310 / 315 / 315 HC**
* **Mio Cyclo 400 / 405 / 405 HC**
* **Mio Cyclo 500 / 505 / 505 HC**
* **Mio Cyclo 605 HC**
* *Any USB mass-storage GPS computer adhering to the `\Dodge\Tracks\` standard.*

---

## ⚡ Key Features

* **🔌 Plug-and-Play USB Detection**: Automatically discovers plugged-in Mio Cyclo units via Windows CIM / WMI and reads the partition named `Mio_data`.
* **🗺️ Tactical Route & Map Preview**: Interactive Leaflet maps displaying real GPX track coordinates, elevation profiles, waypoints, and distance markers loaded on-demand.
* **🚴 One-Click Strava Cloud Sync**: Scans recorded `.fit` rides across all device profiles and uploads them directly to Strava. Unridden route `.gpx` files are automatically kept out of your activity feed.
* **🧭 Komoot Planned Tours Manager**: Connect your Komoot account, filter planned cycling routes (automatically excluding running/jogging workouts), and stream them directly onto your device into `\Dodge\Tracks`.
* **🛡️ Hardware-Grade Security**:
  * Windows **DPAPI** encryption (`safeStorage`) for Strava OAuth tokens and Komoot sessions.
  * Strict canonical path containment preventing directory traversal outside `\Dodge\Tracks`.
  * Electron process isolation (`contextIsolation: true`, `sandbox: true`, strict IPC channel allowlists).
  * Zero plain-text credentials in configuration or local storage.

---

## 🚀 Instant Launch (One-Click)

### Option A: Desktop Shortcut (Recommended)
Run the included shortcut generator in PowerShell to place an icon directly on your Windows Desktop:
```powershell
powershell -ExecutionPolicy Bypass -File .\Create-Desktop-Shortcut.ps1
```
Double-click the **CycloConnect** shortcut on your Desktop at any time!

### Option B: Standalone Executable
The app is pre-compiled and ready in the project directory:
* **`release\win-unpacked\CycloConnect.exe`** &mdash; Double-click to run immediately without installing dependencies.
* **`CycloConnect.bat`** (or **`Launch-CycloConnect.bat`**) &mdash; Root-level launcher script for quick startup.

---

## 📱 How to Connect Your Device

1. Plug your Mio Cyclo into your PC using a standard **USB data cable** (ensure the cable supports data transfer, not charge-only).
2. On the Mio screen, select **"Connect to PC"** when prompted.
3. The computer mounts the device as a removable drive named `Mio_data` (e.g., `E:\`).
4. CycloConnect detects the drive automatically and indexes all ride recordings from `\Dodge\Tracks\`.

> [!TIP]
> If your device does not auto-mount immediately, click **"Rescan USB Disks"** in the app header or press the rescan button on the dashboard.

---

## 🌐 Cloud Integrations: Strava & Komoot

### Strava Setup
1. Create a free API application at [strava.com/settings/api](https://www.strava.com/settings/api).
2. Set the Authorization Callback Domain to `localhost`.
3. Add your credentials to your local `.env` file:
   ```env
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   ```
4. Click **"Authorize with Strava"** inside the app. CycloConnect completes the OAuth loop in an isolated window and encrypts your token using Windows DPAPI.

### Komoot Setup
1. Navigate to the **Komoot Routes** tab or **Settings**.
2. Enter your Komoot account email and password.
3. Your upcoming planned tours will populate with distance, elevation gain, and estimated duration.
4. Click **"Send to Mio"** to transfer any route directly to your device as a GPX file.

---

## 💻 Developer Guide

### Prerequisites
* **Windows 10 / 11 (64-bit)**
* **Node.js LTS (v20 or v22)**
* **npm**

### Getting Started from Source
```bash
# 1. Clone the repository
git clone https://github.com/your-username/cycloconnect.git
cd cycloconnect

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start the application in development mode
npm start
```

### Build Scripts
| Command | Description |
| :--- | :--- |
| `npm start` | Builds frontend and Electron scripts, then launches the desktop application. |
| `npm run dev` | Runs the Vite development server on `http://localhost:3000`. |
| `npm run build` | Compiles production web bundle to `dist/`. |
| `npm run build:electron` | Bundles main and preload TypeScript files to `dist-electron/`. |
| `npm run lint` | Runs strict TypeScript type checking (`tsc --noEmit`). |
| `npm run package` | Builds standalone Windows executable to `release/win-unpacked/CycloConnect.exe`. |
| `npm run dist:portable` | Generates a single portable `.exe` in `release/`. |

---

## 🔒 Security & Privacy

* **Local-First**: CycloConnect operates entirely on your local machine. No telemetry, third-party trackers, or intermediary proxy servers.
* **Encrypted Vault**: Authentication tokens are encrypted on disk via Electron's `safeStorage` API, using the Windows Data Protection API (DPAPI) keyed to your Windows user profile.
* **Containment**: File transfers are strictly contained within the connected Mio device volume to prevent host filesystem exposure.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information. Mio, Cyclo, Strava, and Komoot are trademarks of their respective owners.
