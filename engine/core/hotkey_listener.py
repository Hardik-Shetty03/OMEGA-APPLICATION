import keyboard

class HotkeyListener:
    """
    Listens for a global hotkey (default F9) using the `keyboard` module.
    Suppresses auto-repeat events to ensure single press and release triggers.
    """
    def __init__(self, hotkey="f9", on_press_callback=None, on_release_callback=None):
        self.hotkey = hotkey.lower()
        self.on_press_callback = on_press_callback
        self.on_release_callback = on_release_callback
        self.is_held = False
        self._press_hook = None
        self._release_hook = None

    def start(self):
        """Starts hooks for press and release events."""
        self._press_hook = keyboard.on_press_key(self.hotkey, self._on_press, suppress=False)
        self._release_hook = keyboard.on_release_key(self.hotkey, self._on_release, suppress=False)

    def stop(self):
        """Unhooks the hotkey listeners."""
        if self._press_hook:
            keyboard.unhook(self._press_hook)
            self._press_hook = None
        if self._release_hook:
            keyboard.unhook(self._release_hook)
            self._release_hook = None

    def _on_press(self, event):
        if not self.is_held:
            self.is_held = True
            if self.on_press_callback:
                self.on_press_callback()

    def _on_release(self, event):
        if self.is_held:
            self.is_held = False
            if self.on_release_callback:
                self.on_release_callback()
