import os
import subprocess
import time
from datetime import datetime

# Mapping of friendly names to Windows executables or system commands
APP_MAP = {
    "notepad": "notepad.exe",
    "paint": "mspaint.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "cmd": "cmd.exe",
    "explorer": "explorer.exe",
    "chrome": "chrome.exe",
    "google chrome": "chrome.exe",
    "google-chrome": "chrome.exe",
    "vscode": "code",
    "code": "code"
}

def get_chrome_path() -> str:
    """Resolves the absolute path to Google Chrome on Windows."""
    paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        paths.append(os.path.join(local_app_data, r"Google\Chrome\Application\chrome.exe"))
    for path in paths:
        if os.path.exists(path):
            return path
    return "chrome.exe"  # Fallback

def open_app(name: str) -> str:
    """
    Launches a local Windows application.
    """
    name = name.lower().strip()
    if not name:
        return "Please specify an application to open."
        
    # Clean trailing periods that the speech transcriber may append
    if name.endswith('.'):
        name = name[:-1].strip()
        
    # Normalize "google <app>" query requests
    if name.startswith("google ") and name[7:] in APP_MAP:
        name = name[7:]
        
    target = APP_MAP.get(name, name)
    if target == "chrome.exe":
        target = get_chrome_path()
    
    try:
        # If the target exists locally or is a Windows shortcut (.lnk), launch via ShellExecute
        if os.path.exists(target) or target.lower().endswith(".lnk"):
            os.startfile(target)
            return f"Opening {name}."

        # VS Code ('code') or paths with spaces require shell=True to resolve in Windows env paths
        use_shell = (target == "code" or " " in target)
        
        # If target has spaces (and isn't already quoted), quote it to prevent Windows command shell parsing bugs
        if " " in target and not (target.startswith('"') and target.endswith('"')):
            cmd_target = f'"{target}"'
        else:
            cmd_target = target

        subprocess.Popen(cmd_target, shell=use_shell)
        return f"Opening {name}."
    except Exception as e:
        # Fallback: try launching with shell=True for other applications
        try:
            subprocess.Popen(target, shell=True)
            return f"Opening {name}."
        except Exception as ex:
            return f"Could not launch {name}. Error: {ex}"

def build_website(description: str = "") -> str:
    """
    Creates a timestamped folder under ~/Documents/Omega-Projects/,
    writes HTML/CSS/JS source files, and launches VS Code in that folder.
    Uses Gemini AI if a description is provided to generate a customized webpage.
    """
    try:
        # 1. Paths Setup
        docs_path = os.path.expanduser("~/Documents")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        folder_name = f"website_{timestamp}"
        folder_path = os.path.join(docs_path, "Omega-Projects", folder_name)
        
        # 2. Create workspace folders
        os.makedirs(folder_path, exist_ok=True)
        
        # 3. Create/Generate source files
        html_content = ""
        css_content = ""
        js_content = ""
        
        gemini_key = os.getenv("GEMINI_API_KEY")
        generated_successfully = False
        
        if description and gemini_key:
            print(f"[Apps] Requesting dynamic website generation for: '{description}'")
            system_prompt = (
                "You are an expert frontend developer and web designer.\n"
                "Create a premium, gorgeous, responsive single-page web app based on the user's request.\n"
                "Follow these design guidelines:\n"
                "- Use rich aesthetics, glassmorphism, glowing buttons, smooth hover animations, and beautiful dark modes.\n"
                "- Use modern typography (e.g. from Google Fonts like Outfit, Inter, or Outfit).\n"
                "- Write fully functional, clean JavaScript (no placeholders, add interactive items like calculations, filters, toggles, or dynamic renders).\n\n"
                "You MUST return a strict JSON object with these three keys:\n"
                '{"html": "index.html code content (link style.css and script.js)", "css": "style.css code content", "js": "script.js code content"}\n'
                "Do not write any markdown code fences or explanations. Respond with ONLY the raw JSON string."
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"{system_prompt}\n\nUser request: Create a website for {description}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            try:
                import requests
                import json
                response = requests.post(url, headers=headers, json=payload, timeout=20)
                if response.status_code == 200:
                    res_json = response.json()
                    content = res_json["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(content.strip())
                    html_content = data.get("html", "")
                    css_content = data.get("css", "")
                    js_content = data.get("js", "")
                    if html_content and css_content and js_content:
                        generated_successfully = True
                        print("[Apps] Dynamic website code generated successfully using Gemini!")
                else:
                    print(f"[Apps] Gemini API error: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"[Apps] Failed to generate dynamic website: {e}")

        if not generated_successfully:
            print("[Apps] Using default static premium glassmorphic boilerplate.")
            html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omega Premium Project</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
</head>
<body>
    <div class="glass-card animate-fade-in">
        <div class="logo">Ω</div>
        <h1>Omega Workspace</h1>
        <p class="subtitle">A premium development space crafted for you.</p>
        
        <div class="interactive-zone">
            <button id="action-btn" class="glow-button">Trigger Pulse</button>
            <p id="status-text">System status: Ready</p>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
"""

            css_content = """:root {
    --bg-color: #080b11;
    --card-bg: rgba(255, 255, 255, 0.03);
    --card-border: rgba(255, 255, 255, 0.07);
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --glow-cyan: #00f2fe;
    --glow-blue: #4facfe;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background: radial-gradient(circle at center, #1b263b 0%, var(--bg-color) 100%);
    color: var(--text-primary);
    font-family: 'Outfit', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: hidden;
}

.glass-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 48px;
    width: 90%;
    max-width: 440px;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    transform: translateY(20px);
    opacity: 0;
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.logo {
    font-size: 4.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--glow-cyan), var(--glow-blue));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 16px;
    display: inline-block;
    filter: drop-shadow(0 0 10px rgba(0, 242, 254, 0.3));
}

h1 {
    font-size: 2.2rem;
    font-weight: 600;
    margin-bottom: 8px;
    letter-spacing: -0.5px;
}

.subtitle {
    color: var(--text-secondary);
    font-size: 1rem;
    margin-bottom: 32px;
}

.glow-button {
    background: linear-gradient(135deg, var(--glow-cyan), var(--glow-blue));
    color: #0b0f19;
    border: none;
    border-radius: 12px;
    padding: 14px 28px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 15px rgba(0, 242, 254, 0.35);
}

.glow-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 25px rgba(0, 242, 254, 0.7);
}

.glow-button:active {
    transform: translateY(1px);
}

#status-text {
    margin-top: 24px;
    color: var(--text-secondary);
    font-size: 0.85rem;
    letter-spacing: 0.5px;
}

@keyframes fadeIn {
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
"""

            js_content = """document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('action-btn');
    const statusText = document.getElementById('status-text');
    let pulses = 0;

    btn.addEventListener('click', () => {
        pulses++;
        statusText.textContent = `Pulse count: ${pulses}`;
        
        // Button tap feedback
        btn.style.transform = 'scale(0.96)';
        setTimeout(() => {
            btn.style.transform = 'translateY(-2px)';
        }, 100);
        
        // Document body pulse feedback
        document.body.style.backgroundColor = '#0d1321';
        setTimeout(() => {
            document.body.style.backgroundColor = '';
        }, 200);
    });
});
"""

        # Write files
        with open(os.path.join(folder_path, "index.html"), "w", encoding="utf-8") as f:
            f.write(html_content)
        with open(os.path.join(folder_path, "style.css"), "w", encoding="utf-8") as f:
            f.write(css_content)
        with open(os.path.join(folder_path, "script.js"), "w", encoding="utf-8") as f:
            f.write(js_content)
            
        # 4. Open in VS Code
        subprocess.Popen(["code", folder_path], shell=True)
        
        if generated_successfully:
            return f"I have built a custom web project scaffold for '{description}' under Documents and opened it in VS Code."
        else:
            return f"I have built a web project scaffold under Documents in folder '{folder_name}' and opened it in VS Code."
        
    except Exception as e:
        return f"Failed to build website action. Error: {e}"
