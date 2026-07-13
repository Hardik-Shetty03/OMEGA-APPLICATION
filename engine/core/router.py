import json
import os
import requests
from rapidfuzz import fuzz
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class CommandRouter:
    """
    Fuzzy-matches transcribed text against command triggers.
    If confidence is low, falls back to LLM-based routing using Gemini or Claude APIs.
    """
    def __init__(self, commands_path="config/commands.json"):
        self.commands_path = commands_path
        self.commands = {}
        self.load_commands()

    def load_commands(self):
        """Loads command configuration from JSON file."""
        if os.path.exists(self.commands_path):
            try:
                with open(self.commands_path, "r", encoding="utf-8") as f:
                    self.commands = json.load(f)
                print(f"Loaded {len(self.commands)} command routing groups.")
            except Exception as e:
                print(f"Error loading commands config: {e}")
        else:
            print(f"Commands config file not found at {self.commands_path}")

    def route(self, text: str):
        """
        Routes the transcript text. First tries fuzzy trigger matching.
        If fuzzy confidence is low, calls LLM router if credentials are configured.
        """
        text = text.lower().strip()
        if not text:
            return None, None

        # Clean trailing punctuation from the transcript to prevent word-matching score degradation
        for char in [".", "?", "!", ",", ";", ":"]:
            text = text.replace(char, "")
        text = text.strip()

        best_action = None
        best_score = 0.0
        best_parameter = ""
        matched_trigger_len = 0

        text_words = text.split()
        n_text_words = len(text_words)

        for action, triggers in self.commands.items():
            for trigger in triggers:
                trigger = trigger.lower().strip()
                trigger_words = trigger.split()
                n_trigger_words = len(trigger_words)

                if n_trigger_words == 0:
                    continue

                for window_size in (n_trigger_words, n_trigger_words + 1, n_trigger_words - 1):
                    if window_size <= 0:
                        continue
                    
                    for i in range(n_text_words - window_size + 1):
                        window_words = text_words[i : i + window_size]
                        window_text = " ".join(window_words)

                        score = fuzz.ratio(trigger, window_text)
                        position_bonus = 3 if i == 0 else 0
                        effective_score = score + position_bonus

                        is_better = effective_score > best_score
                        is_tie_breaker = (
                            abs(effective_score - best_score) < 0.01 and 
                            len(trigger) > matched_trigger_len
                        )

                        if is_better or is_tie_breaker:
                            best_score = effective_score
                            best_action = action
                            matched_trigger_len = len(trigger)
                            
                            param_words = text_words[i + window_size :]
                            best_parameter = " ".join(param_words).strip()

        CONFIDENCE_THRESHOLD = 75
        if best_score >= CONFIDENCE_THRESHOLD:
            return best_action, best_parameter

        # Fuzzy match score was too low; try LLM-based NLU routing
        print(f"[Router] Fuzzy match confidence ({best_score:.1f}) below threshold. Trying Smart LLM NLU...")
        llm_action, llm_param = self.llm_route(text)
        if llm_action:
            return llm_action, llm_param

        # If NLU fails or cannot route, fall back to general chat conversation
        return "chat.respond", text

    def llm_route(self, text: str):
        """
        Calls Gemini API (primary) or Anthropic API (secondary) using requests.
        Returns (action, param) from strict JSON response.
        """
        gemini_key = os.getenv("GEMINI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        if not gemini_key and not anthropic_key:
            print("[LLM Router] No GEMINI_API_KEY or ANTHROPIC_API_KEY in .env. Skipping NLU.")
            return None, None

        system_prompt = (
            "You are a command router for a voice assistant named Omega.\n"
            "Analyze the user's intent and route it to one of the following actions:\n"
            "- 'browser.search': for web searches. Parameter is the search query.\n"
            "- 'apps.open': for launching applications (e.g., notepad, calc, paint, chrome). Parameter is the application name.\n"
            "- 'apps.build_website': for starting/building a website. No parameter.\n"
            "- 'workspace.open': for opening the developer workspace. No parameter.\n"
            "- 'schedule.today': for checking today's schedule. No parameter.\n"
            "- 'schedule.save': for adding an event to the schedule. Parameter is the event details.\n"
            "- 'schedule.clear': for clearing the local schedule. No parameter.\n"
            "- 'weather.get': for checking weather. Parameter is the optional location.\n"
            "- 'chat.respond': for general conversation, questions, greetings, jokes, or chit-chat. Parameter is the exact user input.\n\n"
            "You MUST respond with a strict JSON object:\n"
            '{"action": "action.name", "param": "extracted parameter or the input text"}\n'
            "Respond ONLY with this JSON. Do not write anything else or include markdown blocks."
        )

        user_prompt = f"User input to route: '{text}'"

        # 1. Try Gemini API
        if gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"{system_prompt}\n\n{user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            import time
            max_retries = 3
            backoff = 1.0
            for attempt in range(max_retries):
                try:
                    response = requests.post(url, headers=headers, json=payload, timeout=12)
                    if response.status_code == 200:
                        res_json = response.json()
                        content = res_json["candidates"][0]["content"]["parts"][0]["text"]
                        data = json.loads(content.strip())
                        return data.get("action"), data.get("param")
                    elif response.status_code in (429, 503):
                        print(f"[LLM Router] Gemini API returned {response.status_code}. Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(backoff)
                        backoff *= 2.0
                    else:
                        print(f"[LLM Router] Gemini API returned status {response.status_code}")
                        break
                except Exception as e:
                    print(f"[LLM Router] Gemini API request failed: {e}. Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(backoff)
                    backoff *= 2.0

        # 2. Try Anthropic API as fallback
        elif anthropic_key:
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            payload = {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 512,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }
            import time
            max_retries = 3
            backoff = 1.0
            for attempt in range(max_retries):
                try:
                    response = requests.post(url, headers=headers, json=payload, timeout=12)
                    if response.status_code == 200:
                        res_json = response.json()
                        content = res_json["content"][0]["text"]
                        data = json.loads(content.strip())
                        return data.get("action"), data.get("param")
                    elif response.status_code in (429, 503):
                        print(f"[LLM Router] Anthropic API returned {response.status_code}. Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(backoff)
                        backoff *= 2.0
                    else:
                        print(f"[LLM Router] Anthropic API returned status {response.status_code}")
                        break
                except Exception as e:
                    print(f"[LLM Router] Anthropic API request failed: {e}. Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(backoff)
                    backoff *= 2.0

        return None, None
