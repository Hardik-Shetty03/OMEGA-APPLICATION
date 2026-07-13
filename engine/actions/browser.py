import webbrowser
import os
from urllib.parse import quote

# Standard installation paths for Chrome on Windows
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

# Append user-specific AppData path
local_app_data = os.environ.get("LOCALAPPDATA")
if local_app_data:
    CHROME_PATHS.append(os.path.join(local_app_data, r"Google\Chrome\Application\chrome.exe"))

def register_chrome():
    """Attempts to find and register Google Chrome browser."""
    for path in CHROME_PATHS:
        if os.path.exists(path):
            try:
                webbrowser.register('chrome', None, webbrowser.BackgroundBrowser(path))
                return True
            except Exception as e:
                print(f"Error registering Chrome at {path}: {e}")
    return False

# Try to register Chrome on module import
CHROME_REGISTERED = register_chrome()

def search(query: str) -> str:
    """
    Launches a Google search query in Chrome (if registered) or the default browser.
    """
    if not query:
        return "Search query was empty."
        
    url = f"https://www.google.com/search?q={quote(query)}"
    
    if CHROME_REGISTERED:
        try:
            webbrowser.get('chrome').open(url)
            return f"Searching Google for: {query}"
        except Exception:
            pass
            
    # Fallback to default browser
    webbrowser.open(url)
    return f"Searching Google for: {query}"
