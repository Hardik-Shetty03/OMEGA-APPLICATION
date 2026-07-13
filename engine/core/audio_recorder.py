import sounddevice as sd
import numpy as np
import threading

class AudioRecorder:
    """
    Records audio using sounddevice.InputStream in a non-blocking callback.
    Outputs a mono 16kHz float32 numpy array for whisper transcription.
    """
    def __init__(self, sample_rate=16000):
        self.sample_rate = sample_rate
        self.channels = 1
        self.dtype = 'float32'
        self.stream = None
        self.audio_blocks = []
        self.is_recording = False
        self._lock = threading.Lock()

    def start_recording(self):
        """Starts recording audio from default input device."""
        with self._lock:
            if self.is_recording:
                return
            self.audio_blocks = []
            self.is_recording = True
            
            def callback(indata, frames, time, status):
                if status:
                    # Let's print or handle status warnings quietly
                    pass
                with self._lock:
                    if self.is_recording:
                        self.audio_blocks.append(indata.copy())

            try:
                self.stream = sd.InputStream(
                    samplerate=self.sample_rate,
                    channels=self.channels,
                    dtype=self.dtype,
                    callback=callback
                )
                self.stream.start()
            except Exception as e:
                print(f"[Recorder] Error starting audio stream: {e}")
                self.is_recording = False
                self.stream = None

    def stop_recording(self) -> np.ndarray:
        """Stops the recording stream and returns accumulated audio data."""
        with self._lock:
            if not self.is_recording:
                return np.array([], dtype=self.dtype)
            self.is_recording = False
            
            if self.stream:
                try:
                    self.stream.stop()
                    self.stream.close()
                except Exception:
                    pass
                self.stream = None
            
            if not self.audio_blocks:
                return np.array([], dtype=self.dtype)
            
            audio_data = np.concatenate(self.audio_blocks, axis=0)
            return audio_data.flatten()
