import os
import json
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
LOCAL_DB_PATH = 'config/local_schedule.json'

def save_local_event(event_text: str) -> str:
    """
    Saves an event text under today's date in config/local_schedule.json.
    """
    if not event_text.strip():
        return "Please specify what event you want to save."
        
    today_str = datetime.date.today().isoformat()
    
    events = []
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                events = json.load(f)
        except Exception:
            pass
            
    events.append({
        "text": event_text,
        "date": today_str,
        "created_at": datetime.datetime.now().isoformat()
    })
    
    try:
        os.makedirs(os.path.dirname(LOCAL_DB_PATH), exist_ok=True)
        with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(events, f, indent=2)
        return f"I have saved the event: '{event_text}' to your schedule for today."
    except Exception as e:
        return f"Failed to save event locally. Error: {e}"

def get_local_today_events() -> list:
    """
    Reads today's events from config/local_schedule.json.
    """
    if not os.path.exists(LOCAL_DB_PATH):
        return []
    try:
        today_str = datetime.date.today().isoformat()
        with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
            events = json.load(f)
        return [e["text"] for e in events if e.get("date") == today_str]
    except Exception:
        return []

def get_today_events() -> str:
    """
    Retrieves events scheduled for today. Combines local JSON events
    with Google Calendar events if the API is configured.
    """
    # 1. Fetch Local Events
    local_events = get_local_today_events()
    
    # 2. Fetch Google Calendar Events
    google_events = []
    google_configured = True
    google_error = None
    
    token_path = 'config/token.json'
    creds_path = 'config/credentials.json'
    creds = None

    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception:
            pass

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None

        if not creds:
            if not os.path.exists(creds_path):
                google_configured = False
            else:
                try:
                    flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                    creds = flow.run_local_server(port=0)
                    with open(token_path, 'w', encoding='utf-8') as token:
                        token.write(creds.to_json())
                except Exception as e:
                    google_configured = False
                    google_error = f"Authentication failed: {e}"

    if google_configured and creds:
        try:
            service = build('calendar', 'v3', credentials=creds)
            today = datetime.date.today()
            start_of_today = datetime.datetime.combine(today, datetime.time.min).astimezone().isoformat()
            end_of_today = datetime.datetime.combine(today, datetime.time.max).astimezone().isoformat()

            events_result = service.events().list(
                calendarId='primary',
                timeMin=start_of_today,
                timeMax=end_of_today,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            items = events_result.get('items', [])
            for event in items:
                summary = event.get('summary', 'Untitled Event')
                start = event['start'].get('dateTime', event['start'].get('date'))
                
                if 'T' in start:
                    time_str = start.split('T')[1].split('+')[0].split('-')[0]
                    try:
                        time_parts = time_str.split(':')
                        hour = int(time_parts[0])
                        minute = int(time_parts[1])
                        am_pm = "AM" if hour < 12 else "PM"
                        if hour > 12:
                            hour -= 12
                        elif hour == 0:
                            hour = 12
                        formatted_time = f"{hour}:{minute:02d} {am_pm}"
                        google_events.append(f"{summary} at {formatted_time}")
                    except Exception:
                        google_events.append(summary)
                else:
                    google_events.append(f"All-day event: {summary}")
        except HttpError as error:
            google_error = f"Google Calendar API error: {error.reason}"
        except Exception as ex:
            google_error = str(ex)

    # 3. Consolidate Responses
    spoken_parts = []
    
    # Format Local Events
    if local_events:
        if len(local_events) == 1:
            spoken_parts.append(f"Locally, you have: {local_events[0]}")
        else:
            list_str = ", ".join(local_events[:-1]) + f", and {local_events[-1]}"
            spoken_parts.append(f"Locally, you have {len(local_events)} things: {list_str}")
            
    # Format Google Events
    if google_configured and google_events:
        if len(google_events) == 1:
            spoken_parts.append(f"On Google Calendar, you have: {google_events[0]}")
        else:
            list_str = ", ".join(google_events[:-1]) + f", and {google_events[-1]}"
            spoken_parts.append(f"On Google Calendar, you have {len(google_events)} events: {list_str}")
            
    # Final Compilation
    if spoken_parts:
        final_message = ". ".join(spoken_parts) + "."
        if not google_configured:
            final_message += " Note: Google Calendar credentials are not configured."
        elif google_error:
            final_message += f" Note: Google Calendar sync failed."
        return final_message
        
    # If no events at all
    if not google_configured:
        return "You have no local events scheduled for today. Note: Google Calendar is not configured."
    elif google_error:
        return "You have no local events scheduled for today. Google Calendar sync failed."
    else:
        return "You have no events scheduled for today, either locally or on Google Calendar."

def clear_local_schedule() -> str:
    """
    Clears all events stored in config/local_schedule.json.
    """
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
            return "I have cleared all events from your local schedule."
        except Exception as e:
            return f"Failed to clear local schedule. Error: {e}"
    else:
        return "Your local schedule is already empty."
