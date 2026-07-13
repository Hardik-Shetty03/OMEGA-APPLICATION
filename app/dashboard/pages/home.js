window.pages.home = {
    render: async (container) => {
        let logs = await window.electronAPI.getLogs();
        let workspace = await window.electronAPI.getWorkspace();

        const getGreetingTime = () => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good morning';
            if (hour < 18) return 'Good afternoon';
            return 'Good evening';
        };
        
        // Sync our local logs array with saved engine logs if available
        if (logs && logs.length > 0) {
            window.omegaState.logs = logs.map(line => {
                // Parse timestamp and logs: "[2026-07-12 15:10:00] Transcript: "..." | Action: ... | Param: ... | Status: ..."
                try {
                    const tsMatch = line.match(/^\[(.*?)\]/);
                    const transcriptMatch = line.match(/Transcript: "(.*?)"/);
                    const actionMatch = line.match(/Action: (.*?) \|/);
                    const paramMatch = line.match(/Param: (.*?) \|/);
                    const statusMatch = line.match(/Status: (.*?)$/);
                    
                    return {
                        timestamp: tsMatch ? tsMatch[1].split(' ')[1] : new Date().toLocaleTimeString(),
                        transcript: transcriptMatch ? transcriptMatch[1] : '',
                        action: actionMatch ? actionMatch[1] : 'None',
                        param: paramMatch ? paramMatch[1] : 'None',
                        status: statusMatch ? statusMatch[1].trim() : 'success'
                    };
                } catch (e) {
                    return {
                        timestamp: new Date().toLocaleTimeString(),
                        transcript: line,
                        action: 'Unknown',
                        param: 'None',
                        status: 'success'
                    };
                }
            });
        }

        const renderLayout = () => {
            const layout = `
                <div style="display: flex; gap: 30px; height: calc(100vh - 150px); overflow: hidden;">
                    <!-- Left Hero Section (Rings & Inputs) -->
                    <div style="flex: 1.3; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                        <!-- Time & Greeting -->
                        <div class="hud-panel" style="margin-bottom: 0; padding: 15px 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h4 class="hud-eyebrow" id="time-display" style="font-family: 'Orbitron', sans-serif; font-size: 0.95rem; color: var(--accent-cyan);">00:00:00</h4>
                                    <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;" id="date-display">DATE_MONITOR</p>
                                </div>
                                <h3 class="display-title" style="font-size: 0.95rem; color: var(--accent-cyan); text-align: right;" id="live-greeting">--</h3>
                            </div>
                        </div>

                        <!-- Concentric Ring Hero -->
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
                            <!-- Holographic Radial Glow -->
                            <div id="hologram-glow" style="position: absolute; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%); filter: blur(20px); pointer-events: none; transition: background 0.5s ease;"></div>
                            
                            <!-- The Concentric Rings Container -->
                            <div id="hero-pulse-container" class="${window.omegaState.status}" style="position: relative; width: 280px; height: 280px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <!-- Inner Ring with wordmark -->
                                <div class="ring-inner">
                                    <span class="display-title" style="font-size: 1.1rem; color: var(--text-primary); text-shadow: 0 0 8px rgba(34, 211, 238, 0.6);">OMEGA</span>
                                </div>
                                
                                <!-- Middle Ring (Dashed, rotating) -->
                                <div class="ring-middle"></div>
                                
                                <!-- Outer Ring -->
                                <div class="ring-outer"></div>
                                
                                <!-- Radiating Radar Ping -->
                                <div class="ring-radar-ping"></div>
                            </div>
                        </div>

                        <!-- Command Keyboard Input -->
                        <div class="hud-panel" style="margin-bottom: 0; padding: 15px 20px;">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="text" id="hud-keyboard-input" placeholder="Type a command or ask a question..." style="margin-top: 0; flex: 1;">
                                <button class="hud-button" id="btn-submit-cmd" style="padding: 10px 20px;">Execute</button>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column (Weather & Lists) -->
                    <div style="width: 320px; display: flex; flex-direction: column; gap: 20px; height: 100%; overflow-y: auto;">
                        <!-- Weather Widget -->
                        <div class="hud-panel" style="margin-bottom: 0; padding: 15px 20px;">
                            <div class="hud-panel-header" style="margin-bottom: 10px; padding-bottom: 8px;">
                                <span class="hud-eyebrow">Env Monitor</span>
                                <span id="weather-temp" style="font-family: 'Orbitron', sans-serif; font-size: 0.85rem; color: var(--accent-cyan);">--°C</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);" id="weather-city">Tokyo</h4>
                                    <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;" id="weather-status">Fetching forecast...</p>
                                </div>
                                <span id="weather-icon" style="font-size: 1.6rem;">🌡️</span>
                            </div>
                        </div>

                        <!-- Google Calendar card -->
                        <div class="hud-panel" style="flex: 1; margin-bottom: 0; display: flex; flex-direction: column; padding: 15px 20px;">
                            <div class="hud-panel-header" style="margin-bottom: 10px; padding-bottom: 8px;">
                                <span class="hud-eyebrow">Schedule Monitor</span>
                                <span class="hud-eyebrow" style="font-size: 0.65rem; color: var(--accent-cyan);">CAL.SYS</span>
                            </div>
                            <div id="events-list-container" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                                <div style="color: var(--text-secondary); text-align: center; margin-top: 30px; font-size: 0.75rem;">Loading events...</div>
                            </div>
                        </div>

                        <!-- Recent Actions card -->
                        <div class="hud-panel" style="flex: 1; margin-bottom: 0; display: flex; flex-direction: column; padding: 15px 20px;">
                            <div class="hud-panel-header" style="margin-bottom: 10px; padding-bottom: 8px;">
                                <span class="hud-eyebrow">Recent Commands</span>
                                <span class="hud-eyebrow" style="font-size: 0.65rem; color: var(--accent-cyan);">LOG.SYS</span>
                            </div>
                            <div id="hud-actions-feed" style="flex: 1; overflow-y: auto; font-family: 'Cascadia Code', 'Courier New', monospace; font-size: 0.7rem; display: flex; flex-direction: column; gap: 8px;">
                                <!-- Rendered logs -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    /* concentric rings layout */
                    .ring-inner {
                        position: absolute; 
                        width: 120px; 
                        height: 120px; 
                        border-radius: 50%; 
                        border: 3px solid var(--accent-cyan); 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        box-shadow: 0 0 20px rgba(34, 211, 238, 0.2); 
                        transition: all 0.3s ease; 
                        z-index: 5;
                    }
                    .ring-middle {
                        position: absolute; 
                        width: 170px; 
                        height: 170px; 
                        border-radius: 50%; 
                        border: 2px dashed rgba(34, 211, 238, 0.35); 
                        animation: rotate-cw 20s linear infinite; 
                        transition: all 0.3s ease;
                    }
                    .ring-outer {
                        position: absolute; 
                        width: 220px; 
                        height: 220px; 
                        border-radius: 50%; 
                        border: 1px solid rgba(34, 211, 238, 0.18); 
                        transition: all 0.3s ease;
                    }
                    .ring-radar-ping {
                        position: absolute; 
                        width: 120px; 
                        height: 120px; 
                        border-radius: 50%; 
                        border: 2px solid var(--accent-cyan); 
                        opacity: 0; 
                        pointer-events: none;
                    }

                    /* Concentric Ring Keyframe Animations */
                    @keyframes rotate-cw {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes rotate-ccw {
                        0% { transform: rotate(360deg); }
                        100% { transform: rotate(0deg); }
                    }
                    @keyframes radar-pulse {
                        0% {
                            width: 120px;
                            height: 120px;
                            opacity: 0.8;
                        }
                        100% {
                            width: 280px;
                            height: 280px;
                            opacity: 0;
                        }
                    }
                    @keyframes ring-breath {
                        0% { transform: scale(0.98); opacity: 0.6; }
                        50% { transform: scale(1.02); opacity: 0.9; }
                        100% { transform: scale(0.98); opacity: 0.6; }
                    }
                    
                    /* State styling driven by javascript class changes */
                    #hero-pulse-container.listening .ring-inner {
                        border-color: var(--listening-color);
                        box-shadow: 0 0 25px var(--listening-color);
                    }
                    #hero-pulse-container.listening .ring-middle {
                        border-color: rgba(34, 211, 238, 0.8);
                        animation: rotate-cw 8s linear infinite;
                    }
                    #hero-pulse-container.listening .ring-outer {
                        border-color: rgba(34, 211, 238, 0.5);
                        animation: ring-breath 1s infinite ease-in-out;
                    }
                    #hero-pulse-container.listening .ring-radar-ping {
                        border-color: var(--listening-color);
                        animation: radar-pulse 1.2s infinite cubic-bezier(0.1, 0.8, 0.3, 1);
                    }
                    
                    #hero-pulse-container.speaking .ring-inner {
                        border-color: var(--speaking-color);
                        box-shadow: 0 0 25px var(--speaking-color);
                    }
                    #hero-pulse-container.speaking .ring-middle {
                        border-color: rgba(185, 140, 255, 0.8);
                        animation: rotate-ccw 12s linear infinite;
                    }
                    #hero-pulse-container.speaking .ring-outer {
                        border-color: rgba(185, 140, 255, 0.5);
                        animation: ring-breath 2s infinite ease-in-out;
                    }
                    
                    #hero-pulse-container.processing .ring-inner {
                        border-color: var(--processing-color);
                        box-shadow: 0 0 25px var(--processing-color);
                    }
                    #hero-pulse-container.processing .ring-middle {
                        animation: rotate-cw 3s linear infinite;
                    }
                    #hero-pulse-container.processing .ring-outer {
                        border-color: rgba(224, 64, 251, 0.6);
                        animation: ring-breath 0.5s infinite ease-in-out;
                    }
                </style>
            `;
            
            container.innerHTML = layout;
            
            updateClocks();
            setInterval(updateClocks, 1000);
            
            document.getElementById('live-greeting').textContent = `${getGreetingTime()} — how can I help?`;
            
            const textInput = document.getElementById('hud-keyboard-input');
            const submitBtn = document.getElementById('btn-submit-cmd');
            
            const submitTextCommand = () => {
                const text = textInput.value.trim();
                if (!text) return;
                
                if (window.omegaWS && window.omegaWS.readyState === WebSocket.OPEN) {
                    window.omegaWS.send(JSON.stringify({ type: 'command', value: text }));
                    textInput.value = '';
                } else {
                    console.error('WebSocket connection is not open.');
                }
            };
            
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitTextCommand();
            });
            submitBtn.addEventListener('click', submitTextCommand);

            fetchWeather();
            renderLogsList();
            fetchScheduleEvents();
        };

        const updateClocks = () => {
            const timeDisplay = document.getElementById('time-display');
            const dateDisplay = document.getElementById('date-display');
            if (!timeDisplay || !dateDisplay) return;

            const now = new Date();
            timeDisplay.textContent = now.toLocaleTimeString();
            dateDisplay.textContent = now.toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }).toUpperCase();
        };

        const fetchWeather = async () => {
            try {
                const settings = await window.electronAPI.getSettings();
                const city = settings.weather_city || 'Tokyo';
                
                let lat = 35.6895;
                let lon = 139.6917;

                try {
                    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
                    const geoData = await geoRes.json();
                    if (geoData.results && geoData.results.length > 0) {
                        lat = geoData.results[0].latitude;
                        lon = geoData.results[0].longitude;
                    }
                } catch (e) {
                    console.warn('Geocoding failed, using fallback coordinates:', e);
                }

                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();
                
                if (data.current_weather) {
                    document.getElementById('weather-temp').textContent = `${Math.round(data.current_weather.temperature)}°C`;
                    document.getElementById('weather-city').textContent = city.toUpperCase();
                    document.getElementById('weather-status').textContent = `WIND: ${data.current_weather.windspeed}km/h`;
                    
                    const code = data.current_weather.weathercode;
                    let icon = '☀️';
                    if (code > 0 && code <= 3) icon = '🌤️';
                    else if (code >= 45 && code <= 48) icon = '🌫️';
                    else if (code >= 51 && code <= 67) icon = '🌧️';
                    else if (code >= 71 && code <= 77) icon = '❄️';
                    else if (code >= 80) icon = '⛈️';
                    document.getElementById('weather-icon').textContent = icon;
                }
            } catch (e) {
                console.error('Weather load failed:', e);
                document.getElementById('weather-status').textContent = 'Sensor disconnected';
            }
        };

        const renderLogsList = () => {
            const feed = document.getElementById('hud-actions-feed');
            if (!feed) return;
            feed.innerHTML = '';
            
            if (window.omegaState.logs.length === 0) {
                feed.innerHTML = '<div style="color: var(--text-secondary); text-align: center; margin-top: 30px;">NO LOG DATA AVAILABLE</div>';
                return;
            }

            window.omegaState.logs.slice(0, 7).forEach(log => {
                const el = document.createElement('div');
                el.style.borderBottom = '1px solid rgba(34, 211, 238, 0.05)';
                el.style.paddingBottom = '6px';
                el.style.color = log.status === 'success' ? '#a7f3d0' : (log.status.startsWith('failed') ? '#fca5a5' : 'var(--text-primary)');
                
                el.innerHTML = `
                    <span style="color: var(--text-secondary);">[${log.timestamp}]</span> HEARD: "${log.transcript || 'empty'}"<br>
                    <span style="padding-left: 10px; color: var(--text-secondary);">↳ ACT: ${log.action || 'None'} (${log.status})</span>
                `;
                feed.appendChild(el);
            });
        };

        const fetchScheduleEvents = async () => {
            const container = document.getElementById('events-list-container');
            if (!container) return;
            container.innerHTML = '';

            try {
                // Return high-tech offline schedule tracker
                container.innerHTML = `
                    <div style="border-left: 2px solid var(--accent-cyan); padding-left: 10px;">
                        <span style="font-size: 0.65rem; color: var(--text-secondary);">09:00 - 10:00</span>
                        <h5 style="font-size: 0.8rem; font-weight: bold; color: var(--text-primary);">System Core Diagnostics</h5>
                    </div>
                    <div style="border-left: 2px solid var(--accent-violet); padding-left: 10px;">
                        <span style="font-size: 0.65rem; color: var(--text-secondary);">14:30 - 15:30</span>
                        <h5 style="font-size: 0.8rem; font-weight: bold; color: var(--text-primary);">Developer Team Sync</h5>
                    </div>
                `;
            } catch (e) {
                container.innerHTML = '<div style="color: var(--text-secondary); text-align: center;">SCHEDULE OFFLINE</div>';
            }
        };

        const onStateChange = (e) => {
            const state = e.detail;
            const ringContainer = document.getElementById('hero-pulse-container');
            const glow = document.getElementById('hologram-glow');
            const greeting = document.getElementById('live-greeting');
            if (!ringContainer) return;
            
            ringContainer.className = state;
            
            let color = 'rgba(34, 211, 238, 0.08)';
            let greetingText = `${getGreetingTime()} — how can I help?`;
            
            if (state === 'listening') {
                color = 'rgba(34, 211, 238, 0.2)';
                greetingText = 'System capturing audio stream...';
            } else if (state === 'speaking') {
                color = 'rgba(185, 140, 255, 0.2)';
                greetingText = 'Omega responding...';
            } else if (state === 'processing') {
                color = 'rgba(224, 64, 251, 0.15)';
                greetingText = 'Processing query intents...';
            } else if (state === 'offline') {
                color = 'rgba(255, 92, 92, 0.1)';
                greetingText = 'Alert: Core engine disconnected';
            }
            
            glow.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
            greeting.textContent = greetingText;
        };

        const onActivity = () => {
            renderLogsList();
        };

        renderLayout();
        
        document.addEventListener('omega:state-change', onStateChange);
        document.addEventListener('omega:activity', onActivity);

        window.pages.home.destroy = () => {
            document.removeEventListener('omega:state-change', onStateChange);
            document.removeEventListener('omega:activity', onActivity);
        };
    }
};
