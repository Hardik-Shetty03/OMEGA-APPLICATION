import sys
import os
import json
import datetime
import threading
import time

from core.hotkey_listener import HotkeyListener
from core.audio_recorder import AudioRecorder
from core.transcriber import Transcriber
from core.tts import TTS
from core.router import CommandRouter
from core.ws_server import WebSocketServer

# Import Action Modules
from actions import browser, apps, workspace, schedule, weather, chat

DEFAULT_SETTINGS = {
    "hotkey": "f9",
    "whisper_model": "base.en",
    "whisper_device": "cpu",
    "whisper_compute_type": "int8",
    "tts_voice": "en-US-GuyNeural",
    "overlay_size": 80,
    "overlay_corner": "bottom-right",
    "log_file": "omega.log"
}

# Global WebSocket Server Reference
ws_server = None

def load_settings(path="config/settings.json"):
    """Loads system settings, merging with default settings."""
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except Exception as e:
            print(f"Error loading settings: {e}. Using defaults.")
    return DEFAULT_SETTINGS

def log_action(log_path, transcript, action, param, status):
    """Writes session activity details to log file and broadcasts to WS."""
    try:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] Transcript: \"{transcript}\" | Action: {action} | Param: {param} | Status: {status}\n"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(log_line)
    except Exception as e:
        print(f"Failed to write log: {e}")
        
    if ws_server:
        ws_server.log_activity(transcript, action, param, status)

def process_voice_input(audio_data, transcriber, tts, router_func):
    """Worker function for running speech-to-text, routing, and speech output."""
    global ws_server
    if audio_data is None or len(audio_data) == 0:
        ws_server.set_state("idle")
        return
        
    # 1. Transcribe (state: processing)
    text = transcriber.transcribe(audio_data)
    print(f"[Worker] Heard: \"{text}\"")
    
    # 2. Route & Execute
    if text:
        response_text = router_func(text)
        if response_text:
            ws_server.set_state("speaking")
            tts.speak(response_text)
    else:
        ws_server.set_state("speaking")
        tts.speak("I didn't hear anything.")
        
    # 3. Transition back to idle
    ws_server.set_state("idle")

def main():
    global ws_server
    
    # Ensure working directory is the script's directory so config paths align
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # 1. Load Settings
    settings = load_settings()
    log_file = settings["log_file"]
    
    print("Initializing Omega Voice Assistant Headless Engine...")
    
    # 2. Initialize WebSocket server
    ws_server = WebSocketServer()
    ws_server.start()
    
    # 3. Initialize Assistant Modules
    recorder = AudioRecorder(sample_rate=16000)
    
    transcriber = Transcriber(
        model_size=settings["whisper_model"], 
        device=settings["whisper_device"], 
        compute_type=settings["whisper_compute_type"]
    )
    
    tts = TTS(voice=settings["tts_voice"])
    router = CommandRouter()
    
    # Hardware/Environment Diagnostic Check
    import sounddevice as sd
    try:
        devices = sd.query_devices()
        input_devices = [d for d in devices if d['max_input_channels'] > 0]
        if not input_devices:
            print("[Warning] No microphone input devices found. Voice capture will fail.")
    except Exception as sd_err:
        print(f"[Warning] Failed to query audio devices: {sd_err}")
        
    # 4. Define Router Dispatch Handler
    def handle_routing(text):
        if not text.strip():
            log_action(log_file, "", None, None, "empty")
            return "I didn't hear anything."
            
        action, param = router.route(text)
        if not action:
            log_action(log_file, text, None, None, "unmatched")
            return f"I didn't catch a matching command for: {text}"
            
        print(f"[Router] Dispatching action '{action}' with parameter: '{param}'")
        
        try:
            if action == "browser.search":
                res = browser.search(param)
            elif action == "apps.open":
                res = apps.open_app(param)
            elif action == "apps.build_website":
                res = apps.build_website(param)
            elif action == "workspace.open":
                res = workspace.open_workspace()
            elif action == "schedule.today":
                res = schedule.get_today_events()
            elif action == "schedule.save":
                res = schedule.save_local_event(param)
            elif action == "schedule.clear":
                res = schedule.clear_local_schedule()
            elif action == "chat.respond":
                res = chat.chat_response(param)
            elif action == "weather.get":
                res = weather.get_weather(param)
            else:
                res = f"Action {action} is not registered."
                
            log_action(log_file, text, action, param, "success")
            return res
        except Exception as e:
            err_msg = f"Failed to execute action: {e}"
            log_action(log_file, text, action, param, f"failed: {e}")
            return err_msg
            
    def handle_incoming_text_command(text):
        if not text.strip():
            return
        print(f"[WebSocket] Received incoming text command: '{text}'")
        def run_text_routing():
            ws_server.set_state("processing")
            response = handle_routing(text)
            if response:
                ws_server.set_state("speaking")
                tts.speak(response)
            ws_server.set_state("idle")
        threading.Thread(target=run_text_routing, daemon=True).start()

    ws_server.on_command_received = handle_incoming_text_command
            
    def handle_incoming_speak_request(text):
        if not text.strip():
            return
        print(f"[WebSocket] Received speak request: '{text}'")
        def run_speak():
            ws_server.set_state("speaking")
            tts.speak(text)
            ws_server.set_state("idle")
        threading.Thread(target=run_speak, daemon=True).start()

    ws_server.on_speak_received = handle_incoming_speak_request
            
    # 5. Push-To-Talk State Locks
    is_recording = False
    
    def handle_press():
        nonlocal is_recording
        if ws_server.current_state == "idle" and not is_recording:
            print("[PTT] Key down: Recording...", flush=True)
            is_recording = True
            ws_server.set_state("listening")
            recorder.start_recording()
            
    def handle_release():
        nonlocal is_recording
        if is_recording:
            print("[PTT] Key up: Processing...", flush=True)
            is_recording = False
            ws_server.set_state("processing")
            audio_data = recorder.stop_recording()
            
            # Start background processing thread
            t = threading.Thread(
                target=process_voice_input,
                args=(audio_data, transcriber, tts, handle_routing),
                daemon=True
            )
            t.start()
            
    # 6. Register Global Hotkey
    hotkey = settings.get("hotkey", "f9")
    listener = HotkeyListener(
        hotkey=hotkey, 
        on_press_callback=handle_press, 
        on_release_callback=handle_release
    )
    listener.start()
    
    print(f"Omega Headless Engine is active! Hold {hotkey.upper()} to speak.")
    print("Ready. Press Ctrl+C in terminal to exit.")
    
    # 7. Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        listener.stop()

if __name__ == "__main__":
    main()
