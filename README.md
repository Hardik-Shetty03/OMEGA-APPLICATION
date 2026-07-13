# 🌌 OMEGA — Sci-Fi HUD Voice Assistant

OMEGA is a modern, high-fidelity Windows desktop voice assistant. It features a headless, local **Python Voice Engine** (the brain) and a beautiful, transparent **Electron App Shell** (the face) styled as a sci-fi command-center HUD dashboard.

---

## ⚡ Key Features

- **Push-to-Talk (PTT):** Hold `F9` (or a custom hotkey) to stream microphone inputs, transcribe locally via OpenAI's `faster-whisper` model, and synthesize spoken feedback via Microsoft's neural `edge-tts`.
- **Sci-Fi HUD Command Center:** A dark glassmorphic dashboard built with Orbitron typography, styled coordinate grids, dynamic time clocks, and Open-Meteo weather monitors.
- **Central Concentric Radar:** A pulsing HUD status ring displaying breathing states (`idle`, `listening`, `processing`, `speaking`) in sync with speech capturing.
- **Live Canvas Waveforms:** Inline waveforms running on HTML5 canvases in both the top-right indicator and the bottom status bar spanning connection states.
- **Expandable Desktop Triangle:** A frameless transparent overlay triangle positioned in the bottom-right corner. Clicking it plays a voice prompt and expands a text command console to execute keyboard queries.
- **Action Command Routing:** Includes custom fuzzy-matching for launching workspaces, queries, offline calendar syncing, applications, and Gemini conversational LLM fallbacks.

---

## 🏗️ Folder Structure

```
omega/
├── engine/                      # Python — the brain (Headless)
│   ├── main.py
│   ├── config/                  # JSON rules, settings, & workspace lists
│   └── core/                    # Whisper, PTT loops, and WebSocket server
└── app/                         # Electron — the face (GUI)
    ├── main.js                  # Life cycle manager & subprocess spawner
    ├── overlay/                 # Desktop transparent triangle launcher
    └── dashboard/               # HUD control panel sheets & routing
```

---

## 🚀 Quick Start (Development)

### Prerequisite Checklist
- **OS:** Windows 10/11
- **Python:** 3.11+
- **Node.js:** v18+

### 1. Initialize Python Backend
Navigate to the `engine/` folder, initialize a virtual environment, and install dependencies:
```powershell
cd engine
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Initialize Electron Frontend
Navigate to the `app/` folder and install Node packages:
```powershell
cd ../app
npm install
```

### 3. Run OMEGA
Run the startup script from the project root:
```powershell
npm start --prefix app
```
*This launches the Electron windows and automatically spins up the Python background process.*

---

## ⚙️ Configuration File Specifications

All configuration parameters are stored inside `engine/config/` and can be edited directly from the dashboard:
- `settings.json`: Whisper models, TTS neural voices, and Push-To-Talk activation keys.
- `commands.json`: Spoken trigger phrases mapped to router key actions.
- `workspace.json`: Shortcuts, directories, and browser URLs to load during workspace activation.
- `animation.json`: Custom hex colors for overlay states.

---

## 📦 Production Packaging

To compile OMEGA into a single installable Windows installer (`.exe`) without requiring users to have Python or Node installed:

1. **Package the Python Engine (PyInstaller):**
   ```powershell
   engine\venv\Scripts\pyinstaller --onedir --noconfirm --clean --name main --distpath app/engine_dist engine/main.py
   ```
2. **Package the Electron App (electron-builder):**
   ```powershell
   npm run dist --prefix app
   ```
3. Locate the completed installer at **`app/dist/omega Setup 1.0.0.exe`**.
