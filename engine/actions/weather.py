import requests

# Map WMO Weather Interpretation Codes to speakable descriptions
WEATHER_CODES = {
    0: "clear sky",
    1: "mainly clear sky",
    2: "partly cloudy conditions",
    3: "overcast sky",
    45: "foggy conditions",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    56: "light freezing drizzle",
    57: "dense freezing drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    66: "light freezing rain",
    67: "heavy freezing rain",
    71: "slight snow fall",
    73: "moderate snow fall",
    75: "heavy snow fall",
    77: "snow grains",
    80: "slight rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    85: "slight snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with slight hail",
    99: "thunderstorm with heavy hail"
}

def get_weather(location_query: str = "") -> str:
    """
    Checks the weather. If a location parameter is provided, geocodes it.
    Otherwise, detects user's location via IP.
    Queries Open-Meteo for current conditions.
    """
    location_query = location_query.lower().strip()
    
    # Strip common noise words at the start of queries
    for noise in ["in ", "for ", "at ", "the weather in ", "the weather for "]:
        if location_query.startswith(noise):
            location_query = location_query[len(noise):].strip()
            
    city = "your area"
    lat = None
    lon = None

    try:
        if location_query:
            # 1. Geocode custom location query
            geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location_query}&count=1"
            geo_res = requests.get(geocode_url, timeout=5).json()
            results = geo_res.get("results")
            if not results:
                return f"I couldn't find any location matching '{location_query}'."
                
            loc_data = results[0]
            name = loc_data.get("name", location_query.title())
            country = loc_data.get("country", "")
            city = f"{name}, {country}" if country else name
            lat = loc_data.get("latitude")
            lon = loc_data.get("longitude")
        else:
            # 2. Geolocate user's IP
            loc_res = requests.get("http://ip-api.com/json", timeout=5).json()
            if loc_res.get("status") == "success":
                city = loc_res.get("city", "your area")
                lat = loc_res.get("lat")
                lon = loc_res.get("lon")
            else:
                return "I couldn't locate your region to check the weather."
            
        if lat is None or lon is None:
            return f"Coordinates for {city} could not be resolved."

        # 3. Fetch weather from Open-Meteo
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        w_res = requests.get(weather_url, timeout=5).json()
        
        current = w_res.get("current_weather")
        if not current:
            return f"I couldn't retrieve weather details for {city}."
            
        temp = current.get("temperature")
        code = current.get("weathercode", 0)
        condition = WEATHER_CODES.get(code, "unknown conditions")
        
        return f"Currently in {city}, it is {temp:.1f} degrees Celsius with {condition}."
        
    except Exception as e:
        return f"Failed to retrieve weather data: {e}"
