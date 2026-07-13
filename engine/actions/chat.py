import os
import requests

def chat_response(user_text: str) -> str:
    """
    Queries Gemini to generate a friendly, warm, casual companion reply.
    The response is optimized for speech synthesis (short, natural, no markdown).
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return "I would love to chat, but you need to set up your Gemini API key in the environment configuration first."
        
    system_prompt = (
        "You are Omega, a close, friendly voice assistant and coding companion. "
        "Talk to the user like a human friend in a quick voice chat. "
        "Keep your responses extremely short (often under 10 to 15 words), simple, and conversational. "
        "For example, if asked 'how are you?', reply naturally like 'I'm doing great! How are you?'. "
        "Use warm, casual language and occasionally ask a quick follow-up to keep it natural. "
        "Do NOT use any markdown, lists, or formatting symbols."
    )
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"System Prompt: {system_prompt}\n\nUser input: {user_text}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.8,
                "maxOutputTokens": 150
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=8)
        if response.status_code == 200:
            data = response.json()
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
            reply = parts[0].get("text", "").strip()
            if reply:
                # Clean up any residual markdown characters
                reply = reply.replace("*", "").replace("#", "").replace("`", "")
                return reply
        return "I'm here and listening, but I couldn't process that thought right now."
    except Exception:
        return "I'm here, but I had a little trouble responding."
