import os
import time
import asyncio
import tempfile
import edge_tts
import pygame
import pyttsx3

class TTS:
    """
    Handles speech synthesis. Uses online edge-tts for premium neural voices
    with an offline pyttsx3 fallback if internet connectivity is lost.
    """
    def __init__(self, voice="en-US-GuyNeural"):
        self.voice = voice
        self.pygame_initialized = False
        self._init_pygame()

    def _init_pygame(self):
        if not self.pygame_initialized:
            try:
                pygame.mixer.init()
                self.pygame_initialized = True
            except Exception as e:
                print(f"Error initializing pygame mixer: {e}")

    def speak(self, text):
        """
        Synthesizes and speaks the given text.
        """
        print(f"Omega: {text}")
        
        # 1. Try edge-tts (online)
        temp_file_path = None
        success = False
        
        try:
            # Generate a temporary file path
            fd, temp_file_path = tempfile.mkstemp(suffix=".mp3")
            os.close(fd) # Close file descriptor so edge-tts can write to it
            
            # Run edge-tts communication to save file
            asyncio.run(self._generate_audio(text, temp_file_path))
            
            # Play with pygame.mixer
            self._init_pygame()
            if self.pygame_initialized:
                pygame.mixer.music.load(temp_file_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    time.sleep(0.05)
                
                # Unload music file to release the lock on Windows
                pygame.mixer.music.unload()
                success = True
            else:
                raise RuntimeError("Pygame mixer is not initialized.")
                
        except Exception as e:
            print(f"edge-tts failed or offline ({e}). Falling back to pyttsx3...")
            
        # 2. Fallback to pyttsx3 (offline)
        if not success:
            try:
                engine = pyttsx3.init()
                # Set speaking rate slightly slower for clarity if needed
                engine.setProperty('rate', 175)
                engine.say(text)
                engine.runAndWait()
                success = True
            except Exception as ex:
                print(f"Offline pyttsx3 fallback also failed: {ex}")
                
        # 3. Clean up the temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                # If still locked, ignore. Windows will clean temp eventually.
                pass

    async def _generate_audio(self, text, output_path):
        communicate = edge_tts.Communicate(text, self.voice)
        await communicate.save(output_path)
