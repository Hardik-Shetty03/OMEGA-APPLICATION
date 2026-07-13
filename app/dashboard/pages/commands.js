window.pages.commands = {
    render: async (container) => {
        let commands = await window.electronAPI.getCommands();
        let workspace = await window.electronAPI.getWorkspace();
        
        const renderLayout = () => {
            const layout = `
                <div style="display: flex; flex-direction: column; gap: 30px; height: calc(100vh - 150px); overflow-y: auto;">
                    <!-- Navigation Tabs -->
                    <div style="display: flex; gap: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                        <button id="tab-voice" class="hud-button" style="background: var(--surface-color); color: var(--text-primary); border: 1px solid var(--border-color);">Voice Commands</button>
                        <button id="tab-workspace" class="hud-button secondary">Workspace Config</button>
                    </div>

                    <!-- Voice Commands Editor Section -->
                    <div id="section-voice" class="section">
                        <div class="hud-panel" style="margin-bottom: 25px;">
                            <div class="hud-panel-header">
                                <span class="hud-eyebrow">Add New Voice Command</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                <div>
                                    <label>Action Key (e.g. apps.open)</label>
                                    <input type="text" id="add-action" placeholder="e.g. apps.open" required>
                                </div>
                                <div>
                                    <label>Trigger Phrases (comma separated)</label>
                                    <input type="text" id="add-triggers" placeholder="e.g. open paint, launch paint" required>
                                </div>
                            </div>
                            <button class="hud-button" id="btn-add-command">Add Command</button>
                        </div>

                        <div class="hud-panel-header" style="margin-bottom: 15px;">
                            <span class="hud-eyebrow">Active Voice Commands</span>
                        </div>
                        <div id="commands-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <!-- Active commands will be rendered here -->
                        </div>
                    </div>

                    <!-- Workspace Config Section -->
                    <div id="section-workspace" class="section" style="display: none;">
                        <div class="hud-panel">
                            <div class="hud-panel-header">
                                <span class="hud-eyebrow">Workspace Launcher Settings</span>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label>Apps / Shortcuts Path (One per line)</label>
                                <textarea id="ws-apps" rows="3" placeholder="e.g. C:\\Users\\gamin\\AppData\\Roaming\\...\\Antigravity.lnk">${(workspace.apps || []).join('\n')}</textarea>
                            </div>

                            <div style="margin-bottom: 15px;">
                                <label>Workspace Folder Path (Optional)</label>
                                <input type="text" id="ws-folder" placeholder="e.g. C:/Users/gamin/Documents/my-project" value="${workspace.folder || ''}">
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label>Browser URLs (One per line)</label>
                                <textarea id="ws-urls" rows="3" placeholder="e.g. https://github.com">${(workspace.urls || []).join('\n')}</textarea>
                            </div>

                            <button class="hud-button" id="btn-save-workspace">Save Workspace Settings</button>
                            <span id="ws-save-status" style="margin-left: 15px; font-size: 0.85rem; color: var(--success-color);"></span>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML = layout;
            
            const tabVoice = document.getElementById('tab-voice');
            const tabWorkspace = document.getElementById('tab-workspace');
            const secVoice = document.getElementById('section-voice');
            const secWorkspace = document.getElementById('section-workspace');
            
            tabVoice.addEventListener('click', () => {
                tabVoice.style.background = 'rgba(34, 211, 238, 0.08)';
                tabVoice.style.color = 'var(--accent-cyan)';
                tabVoice.style.border = '1px solid var(--accent-cyan)';
                
                tabWorkspace.style.background = 'transparent';
                tabWorkspace.style.color = 'var(--text-secondary)';
                tabWorkspace.style.border = '1px solid var(--border-color)';
                
                secVoice.style.display = 'block';
                secWorkspace.style.display = 'none';
            });
            
            tabWorkspace.addEventListener('click', () => {
                tabWorkspace.style.background = 'rgba(34, 211, 238, 0.08)';
                tabWorkspace.style.color = 'var(--accent-cyan)';
                tabWorkspace.style.border = '1px solid var(--accent-cyan)';
                
                tabVoice.style.background = 'transparent';
                tabVoice.style.color = 'var(--text-secondary)';
                tabVoice.style.border = '1px solid var(--border-color)';
                
                secVoice.style.display = 'none';
                secWorkspace.style.display = 'block';
            });
            
            document.getElementById('btn-add-command').addEventListener('click', async () => {
                const action = document.getElementById('add-action').value.trim();
                const triggersRaw = document.getElementById('add-triggers').value.trim();
                
                if (!action || !triggersRaw) return;
                
                const triggers = triggersRaw.split(',').map(t => t.trim()).filter(Boolean);
                if (triggers.length === 0) return;
                
                commands[action] = triggers;
                await window.electronAPI.saveCommands(commands);
                
                document.getElementById('add-action').value = '';
                document.getElementById('add-triggers').value = '';
                renderActiveCommands();
            });

            document.getElementById('btn-save-workspace').addEventListener('click', async () => {
                const appsText = document.getElementById('ws-apps').value.trim();
                const folder = document.getElementById('ws-folder').value.trim();
                const urlsText = document.getElementById('ws-urls').value.trim();
                const statusSpan = document.getElementById('ws-save-status');
                
                const apps = appsText.split('\n').map(a => a.trim()).filter(Boolean);
                const urls = urlsText.split('\n').map(u => u.trim()).filter(Boolean);
                
                workspace = { apps, urls, folder };
                const success = await window.electronAPI.saveWorkspace(workspace);
                
                if (success) {
                    statusSpan.textContent = 'Settings Saved Successfully!';
                    setTimeout(() => { statusSpan.textContent = ''; }, 3000);
                }
            });

            renderActiveCommands();
        };

        const renderActiveCommands = () => {
            const list = document.getElementById('commands-list');
            list.innerHTML = '';
            
            Object.entries(commands).forEach(([action, triggers]) => {
                const card = document.createElement('div');
                card.className = 'hud-panel';
                card.style.display = 'flex';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';
                card.style.marginBottom = '10px';
                card.style.padding = '12px 16px';
                
                card.innerHTML = `
                    <div>
                        <h4 style="color: var(--listening-color); font-size: 0.9rem; font-family: 'Orbitron', sans-serif;">${action}</h4>
                        <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;">
                            Triggers: ${triggers.map(t => `<code style="background-color: rgba(5, 8, 16, 0.8); padding: 2px 6px; border: 1px solid var(--border-color); color: var(--text-primary); margin-right: 4px;">"${t}"</code>`).join('')}
                        </p>
                    </div>
                    <button class="hud-button danger" style="padding: 6px 12px; font-size: 0.75rem;" data-action="${action}">Delete</button>
                `;
                
                card.querySelector('.danger').addEventListener('click', async () => {
                    delete commands[action];
                    await window.electronAPI.saveCommands(commands);
                    renderActiveCommands();
                });
                
                list.appendChild(card);
            });
        };
        
        renderLayout();
    }
};
