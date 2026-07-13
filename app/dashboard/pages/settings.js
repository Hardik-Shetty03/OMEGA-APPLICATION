window.pages.settings = {
    render: async (container) => {
        let settings = await window.electronAPI.getSettings();
        
        const renderLayout = () => {
            const layout = `
                <div style="display: flex; flex-direction: column; gap: 30px; height: calc(100vh - 150px); overflow-y: auto;">
                    <div class="hud-panel" style="margin-bottom: 0;">
                        <div class="hud-panel-header">
                            <span class="hud-eyebrow">System Configuration</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label>Push-To-Talk Activation Hotkey</label>
                            <input type="text" id="setting-hotkey" placeholder="e.g. f9" value="${settings.hotkey || 'f9'}">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label>Whisper Model Size</label>
                            <select id="setting-model">
                                <option value="tiny.en" ${settings.whisper_model === 'tiny.en' ? 'selected' : ''}>tiny.en (Fastest)</option>
                                <option value="base.en" ${settings.whisper_model === 'base.en' ? 'selected' : ''}>base.en (Recommended)</option>
                                <option value="small" ${settings.whisper_model === 'small' ? 'selected' : ''}>small (Accurate but slower)</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label>Speech Output Voice</label>
                            <select id="setting-voice">
                                <option value="en-US-GuyNeural" ${settings.tts_voice === 'en-US-GuyNeural' ? 'selected' : ''}>en-US-GuyNeural (Male)</option>
                                <option value="en-US-AriaNeural" ${settings.tts_voice === 'en-US-AriaNeural' ? 'selected' : ''}>en-US-AriaNeural (Female)</option>
                                <option value="en-GB-SoniaNeural" ${settings.tts_voice === 'en-GB-SoniaNeural' ? 'selected' : ''}>en-GB-SoniaNeural (UK Female)</option>
                                <option value="en-GB-RyanNeural" ${settings.tts_voice === 'en-GB-RyanNeural' ? 'selected' : ''}>en-GB-RyanNeural (UK Male)</option>
                            </select>
                        </div>

                        <button class="hud-button" id="btn-save-settings">Save System Settings</button>
                        <span id="settings-save-status" style="margin-left: 15px; font-size: 0.85rem; color: var(--success-color);"></span>
                    </div>

                    <div class="hud-panel" style="margin-bottom: 0;">
                        <div class="hud-panel-header">
                            <span class="hud-eyebrow">App Lifecycle</span>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">
                            Relaunch the entire OMEGA desktop app shell and Python engine.
                        </p>
                        <button class="hud-button danger" id="btn-relaunch-app">Relaunch Application</button>
                    </div>
                </div>
            `;
            
            container.innerHTML = layout;
            
            document.getElementById('btn-save-settings').addEventListener('click', async () => {
                const hotkey = document.getElementById('setting-hotkey').value.trim().toLowerCase();
                const whisper_model = document.getElementById('setting-model').value;
                const tts_voice = document.getElementById('setting-voice').value;
                const statusSpan = document.getElementById('settings-save-status');
                
                if (!hotkey) return;
                
                settings.hotkey = hotkey;
                settings.whisper_model = whisper_model;
                settings.tts_voice = tts_voice;
                
                const success = await window.electronAPI.saveSettings(settings);
                if (success) {
                    statusSpan.textContent = 'Settings Saved! Restart engine to apply.';
                    setTimeout(() => { statusSpan.textContent = ''; }, 3000);
                }
            });

            document.getElementById('btn-relaunch-app').addEventListener('click', () => {
                window.electronAPI.relaunchApp();
            });
        };
        
        renderLayout();
    }
};
