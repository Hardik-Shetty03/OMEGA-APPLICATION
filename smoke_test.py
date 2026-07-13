import sounddevice as sd
import numpy as np

duration = 3.0  # seconds
fs = 44100  # Sample rate
print("Recording 3 seconds...")
recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
sd.wait()  # Wait until the recording is finished
print("Recording complete. Playing back...")
sd.play(recording, fs)
sd.wait()  # Wait until playback is finished
print("Playback complete.")
