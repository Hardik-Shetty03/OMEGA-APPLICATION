from faster_whisper import WhisperModel
import logging

# Suppress verbose faster-whisper logging
logging.getLogger("faster_whisper").setLevel(logging.WARNING)

class Transcriber:
    """
    Loads a faster-whisper model (e.g., base.en) and transcribes audio data.
    """
    def __init__(self, model_size="base.en", device="cpu", compute_type="int8"):
        print(f"Loading transcriber model '{model_size}' on '{device}'...")
        try:
            # Try loading on specified device
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
            print(f"Transcriber model '{model_size}' loaded successfully on '{device}'.")
        except Exception as e:
            print(f"Could not load on {device} ({e}). Falling back to CPU (int8)...")
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            print(f"Transcriber model '{model_size}' loaded successfully on 'cpu'.")

    def transcribe(self, audio_data) -> str:
        """
        Transcribes the given 1D float32 numpy array.
        Returns the concatenated transcribed text.
        """
        if audio_data is None or len(audio_data) == 0:
            return ""
        
        # transcribe returns a generator of segments, plus info
        segments, info = self.model.transcribe(
            audio_data, 
            beam_size=5,
            vad_filter=True, # Helps filter out silence/noise
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        text_segments = []
        for segment in segments:
            text_segments.append(segment.text)
            
        full_text = " ".join(text_segments).strip()
        return full_text
