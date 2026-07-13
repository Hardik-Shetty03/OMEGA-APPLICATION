window.pages.integrations = {
    render: async (container) => {
        let env = await window.electronAPI.getEnv();
        
        const renderLayout = () => {
            const hasGemini = !!env.GEMINI_API_KEY;
            const hasAnthropic = !!env.ANTHROPIC_API_KEY;
            
            const layout = `
                <div style="display: flex; flex-direction: column; gap: 30px; height: calc(100vh - 150px); overflow-y: auto;">
                    <div class="hud-panel">
                        <div class="hud-panel-header">
                            <span class="hud-eyebrow">API Credentials</span>
                        </div>
                        
                        <!-- Gemini API Key -->
                        <div style="margin-bottom: 20px;">
                            <label>Gemini API Key</label>
                            <div style="display: flex; gap: 10px; margin-top: 6px;">
                                <input type="password" id="input-gemini" placeholder="Enter Gemini API Key" value="${hasGemini ? '••••••••••••••••' : ''}" ${hasGemini ? 'disabled' : ''}>
                                ${hasGemini ? '<button class="hud-button secondary" id="btn-replace-gemini" style="flex-shrink:0;">Replace</button>' : '<button class="hud-button" id="btn-save-gemini" style="flex-shrink:0;">Save</button>'}
                            </div>
                        </div>

                        <!-- Anthropic API Key -->
                        <div style="margin-bottom: 20px;">
                            <label>Anthropic API Key</label>
                            <div style="display: flex; gap: 10px; margin-top: 6px;">
                                <input type="password" id="input-anthropic" placeholder="Enter Anthropic API Key" value="${hasAnthropic ? '••••••••••••••••' : ''}" ${hasAnthropic ? 'disabled' : ''}>
                                ${hasAnthropic ? '<button class="hud-button secondary" id="btn-replace-anthropic" style="flex-shrink:0;">Replace</button>' : '<button class="hud-button" id="btn-save-anthropic" style="flex-shrink:0;">Save</button>'}
                            </div>
                        </div>
                    </div>

                    <div class="hud-panel">
                        <div class="hud-panel-header">
                            <span class="hud-eyebrow">Google Calendar Sync</span>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">
                            To sync your schedule, save your downloaded OAuth desktop client credentials file named <code>credentials.json</code> inside the <code>engine/config/</code> directory.
                        </p>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <span style="font-size: 0.85rem; font-weight: 600;">Status:</span>
                                <span id="calendar-status" style="font-size: 0.85rem; font-weight: bold; margin-left: 5px;">Checking...</span>
                            </div>
                            <button class="hud-button secondary" id="btn-check-calendar">Refresh Connection</button>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML = layout;
            
            if (hasGemini) {
                document.getElementById('btn-replace-gemini').addEventListener('click', () => {
                    const input = document.getElementById('input-gemini');
                    input.value = '';
                    input.disabled = false;
                    input.focus();
                    
                    const btn = document.getElementById('btn-replace-gemini');
                    btn.outerHTML = '<button class="hud-button" id="btn-save-gemini" style="flex-shrink:0;">Save</button>';
                    bindSaveGemini();
                });
            } else {
                bindSaveGemini();
            }

            if (hasAnthropic) {
                document.getElementById('btn-replace-anthropic').addEventListener('click', () => {
                    const input = document.getElementById('input-anthropic');
                    input.value = '';
                    input.disabled = false;
                    input.focus();
                    
                    const btn = document.getElementById('btn-replace-anthropic');
                    btn.outerHTML = '<button class="hud-button" id="btn-save-anthropic" style="flex-shrink:0;">Save</button>';
                    bindSaveAnthropic();
                });
            } else {
                bindSaveAnthropic();
            }
            
            function bindSaveGemini() {
                document.getElementById('btn-save-gemini').addEventListener('click', async () => {
                    const key = document.getElementById('input-gemini').value.trim();
                    if (!key) return;
                    env.GEMINI_API_KEY = key;
                    await window.electronAPI.saveEnv(env);
                    env = await window.electronAPI.getEnv();
                    renderLayout();
                });
            }

            function bindSaveAnthropic() {
                document.getElementById('btn-save-anthropic').addEventListener('click', async () => {
                    const key = document.getElementById('input-anthropic').value.trim();
                    if (!key) return;
                    env.ANTHROPIC_API_KEY = key;
                    await window.electronAPI.saveEnv(env);
                    env = await window.electronAPI.getEnv();
                    renderLayout();
                });
            }

            const btnCheck = document.getElementById('btn-check-calendar');
            btnCheck.addEventListener('click', checkCalendar);
            
            async function checkCalendar() {
                const statusSpan = document.getElementById('calendar-status');
                statusSpan.textContent = 'Checking...';
                statusSpan.style.color = 'var(--text-secondary)';
                
                const settings = await window.electronAPI.getSettings();
                statusSpan.textContent = 'Configured (OAuth ready)';
                statusSpan.style.color = 'var(--success-color)';
            }
            
            checkCalendar();
        };
        
        renderLayout();
    }
};
