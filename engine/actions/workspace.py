import os
import json
import subprocess
import webbrowser
from actions.apps import open_app

def open_workspace(config_path="config/workspace.json") -> str:
    """
    Reads config/workspace.json and opens all configured apps, folders, and URLs.
    """
    if not os.path.exists(config_path):
        return "Workspace configuration file not found."

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        return f"Failed to load workspace config: {e}"

    actions_taken = []
    folder = config.get("folder")
    
    # 1. Open Folder in Explorer
    if folder:
        if os.path.exists(folder):
            try:
                os.startfile(folder)
                actions_taken.append(f"folder '{os.path.basename(folder)}'")
            except Exception as e:
                print(f"Error opening folder {folder}: {e}")
        else:
            print(f"Workspace folder does not exist: {folder}")
            
    # 2. Open Applications
    apps = config.get("apps", [])
    for app in apps:
        try:
            # If application is VS Code and we have a workspace folder, open the folder in VS Code
            if app.lower() in ["code", "vscode"] and folder and os.path.exists(folder):
                subprocess.Popen(["code", folder], shell=True)
                actions_taken.append("VS Code (with project folder)")
            else:
                open_app(app)
                actions_taken.append(app)
        except Exception as e:
            print(f"Error launching workspace app '{app}': {e}")

    # 3. Open URLs in default browser
    urls = config.get("urls", [])
    for url in urls:
        try:
            webbrowser.open(url)
            actions_taken.append("browser URLs")
        except Exception as e:
            print(f"Error opening workspace URL '{url}': {e}")

    if actions_taken:
        return "Opening your workspace."
    return "Workspace configuration is empty."
