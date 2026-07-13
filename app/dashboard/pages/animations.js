window.pages.animations = {
    render: async (container) => {
        let animation = await window.electronAPI.getAnimation();
        
        const renderLayout = () => {
            const layout = `
                <div style="display: flex; gap: 30px; height: calc(100vh - 150px); overflow: hidden;">
                    <!-- Controls Left -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                        <div class="hud-panel" style="margin-bottom: 0;">
                            <div class="hud-panel-header">
                                <span class="hud-eyebrow">Visual Parameters</span>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <label>Idle State Color</label>
                                <input type="text" id="anim-idle" placeholder="e.g. #4c566a" value="${animation.idle || '#4c566a'}">
                            </div>

                            <div style="margin-bottom: 15px;">
                                <label>Listening State Color</label>
                                <input type="text" id="anim-listening" placeholder="e.g. #22d3ee" value="${animation.listening || '#22d3ee'}">
                            </div>

                            <div style="margin-bottom: 15px;">
                                <label>Processing State Color</label>
                                <input type="text" id="anim-processing" placeholder="e.g. #e040fb" value="${animation.processing || '#e040fb'}">
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label>Speaking State Color</label>
                                <input type="text" id="anim-speaking" placeholder="e.g. #b98cff" value="${animation.speaking || '#b98cff'}">
                            </div>

                            <button class="hud-button" id="btn-save-anim">Save Style Settings</button>
                            <span id="anim-save-status" style="margin-left: 15px; font-size: 0.85rem; color: var(--success-color);"></span>
                        </div>

                        <!-- Manual Previews -->
                        <div class="hud-panel" style="margin-bottom: 0;">
                            <div class="hud-panel-header">
                                <span class="hud-eyebrow">Preview State Controllers</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <button class="hud-button secondary" data-state="idle">Trigger Idle</button>
                                <button class="hud-button secondary" data-state="listening">Trigger Listening</button>
                                <button class="hud-button secondary" data-state="processing">Trigger Processing</button>
                                <button class="hud-button secondary" data-state="speaking">Trigger Speaking</button>
                            </div>
                        </div>
                    </div>

                    <!-- Previews Right -->
                    <div style="width: 380px; display: flex; flex-direction: column; gap: 20px; align-items: center; justify-content: center;" class="hud-panel">
                        <div class="hud-panel-header" style="width: 100%;">
                            <span class="hud-eyebrow">Holographic Render Previews</span>
                        </div>
                        
                        <!-- Concentric Ring Preview -->
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative; width: 100%;">
                            <div id="preview-glow" style="position: absolute; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%); filter: blur(20px); pointer-events: none;"></div>
                            
                            <div id="preview-pulse-container" class="idle" style="position: relative; width: 180px; height: 180px; display: flex; align-items: center; justify-content: center;">
                                <div class="prev-ring-inner">
                                    <span class="display-title" style="font-size: 0.75rem; color: var(--text-primary);">OMEGA</span>
                                </div>
                                <div class="prev-ring-middle"></div>
                                <div class="prev-ring-outer"></div>
                                <div class="prev-ring-radar-ping"></div>
                            </div>
                        </div>

                        <!-- Triangle Overlay Preview -->
                        <div style="height: 120px; display: flex; align-items: center; justify-content: center; width: 100%; border-top: 1px solid var(--border-color); padding-top: 15px;">
                            <div id="preview-triangle-container" class="idle" style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
                                <div class="prev-triangle"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    /* Ring styles */
                    .prev-ring-inner {
                        position: absolute; width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--accent-cyan);
                        display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(34, 211, 238, 0.2);
                        z-index: 5;
                    }
                    .prev-ring-middle {
                        position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 2px dashed rgba(34, 211, 238, 0.35);
                        animation: rotate-cw 20s linear infinite;
                    }
                    .prev-ring-outer {
                        position: absolute; width: 160px; height: 160px; border-radius: 50%; border: 1px solid rgba(34, 211, 238, 0.18);
                    }
                    .prev-ring-radar-ping {
                        position: absolute; width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--accent-cyan);
                        opacity: 0; pointer-events: none;
                    }

                    #preview-pulse-container.listening .prev-ring-inner { border-color: var(--listening-color); box-shadow: 0 0 20px var(--listening-color); }
                    #preview-pulse-container.listening .prev-ring-middle { border-color: rgba(34, 211, 238, 0.8); animation: rotate-cw 8s linear infinite; }
                    #preview-pulse-container.listening .prev-ring-outer { border-color: rgba(34, 211, 238, 0.5); animation: ring-breath 1s infinite ease-in-out; }
                    #preview-pulse-container.listening .prev-ring-radar-ping { border-color: var(--listening-color); animation: radar-pulse 1.2s infinite cubic-bezier(0.1, 0.8, 0.3, 1); }
                    
                    #preview-pulse-container.speaking .prev-ring-inner { border-color: var(--speaking-color); box-shadow: 0 0 20px var(--speaking-color); }
                    #preview-pulse-container.speaking .prev-ring-middle { border-color: rgba(185, 140, 255, 0.8); animation: rotate-ccw 12s linear infinite; }
                    #preview-pulse-container.speaking .prev-ring-outer { border-color: rgba(185, 140, 255, 0.5); animation: ring-breath 2s infinite ease-in-out; }
                    
                    #preview-pulse-container.processing .prev-ring-inner { border-color: var(--processing-color); box-shadow: 0 0 20px var(--processing-color); }
                    #preview-pulse-container.processing .prev-ring-middle { animation: rotate-cw 3s linear infinite; }
                    #preview-pulse-container.processing .prev-ring-outer { border-color: rgba(224, 64, 251, 0.6); animation: ring-breath 0.5s infinite ease-in-out; }

                    /* Triangle preview styles */
                    .prev-triangle {
                        width: 0; height: 0;
                        border-left: 20px solid transparent; border-right: 20px solid transparent;
                        border-bottom: 35px solid var(--accent-cyan);
                        filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
                        transition: all 0.3s ease;
                    }
                    
                    #preview-triangle-container.idle .prev-triangle {
                        border-bottom-color: var(--idle-color);
                        filter: drop-shadow(0 0 4px rgba(124, 134, 153, 0.3));
                    }
                    #preview-triangle-container.listening .prev-triangle {
                        border-bottom-color: var(--listening-color);
                        filter: drop-shadow(0 0 12px var(--listening-color));
                        animation: ring-breath 0.8s infinite ease-in-out;
                    }
                    #preview-triangle-container.processing .prev-triangle {
                        border-bottom-color: var(--processing-color);
                        filter: drop-shadow(0 0 10px var(--processing-color));
                        animation: ring-breath 1.2s infinite ease-in-out;
                    }
                    #preview-triangle-container.speaking .prev-triangle {
                        border-bottom-color: var(--speaking-color);
                        filter: drop-shadow(0 0 10px var(--speaking-color));
                        animation: ring-breath 2s infinite ease-in-out;
                    }
                </style>
            `;
            
            container.innerHTML = layout;
            
            // Wire trigger buttons
            const pButtons = container.querySelectorAll('[data-state]');
            const pulseContainer = document.getElementById('preview-pulse-container');
            const triContainer = document.getElementById('preview-triangle-container');
            const glow = document.getElementById('preview-glow');
            
            pButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const state = btn.dataset.state;
                    pulseContainer.className = state;
                    triContainer.className = state;
                    
                    let color = 'rgba(34, 211, 238, 0.08)';
                    if (state === 'listening') color = 'rgba(34, 211, 238, 0.2)';
                    else if (state === 'speaking') color = 'rgba(185, 140, 255, 0.2)';
                    else if (state === 'processing') color = 'rgba(224, 64, 251, 0.15)';
                    glow.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
                });
            });
            
            // Save parameters
            document.getElementById('btn-save-anim').addEventListener('click', async () => {
                const idle = document.getElementById('anim-idle').value.trim();
                const listening = document.getElementById('anim-listening').value.trim();
                const processing = document.getElementById('anim-processing').value.trim();
                const speaking = document.getElementById('anim-speaking').value.trim();
                const statusSpan = document.getElementById('anim-save-status');
                
                animation = { idle, listening, processing, speaking };
                const success = await window.electronAPI.saveAnimation(animation);
                
                if (success) {
                    statusSpan.textContent = 'Styles Saved Successfully!';
                    // Update variables in live previews
                    document.documentElement.style.setProperty('--listening-color', listening);
                    document.documentElement.style.setProperty('--speaking-color', speaking);
                    document.documentElement.style.setProperty('--processing-color', processing);
                    document.documentElement.style.setProperty('--idle-color', idle);
                    setTimeout(() => { statusSpan.textContent = ''; }, 3000);
                }
            });
        };
        
        renderLayout();
    }
};
