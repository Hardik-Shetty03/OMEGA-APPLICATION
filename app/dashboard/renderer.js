const pageContainer = document.getElementById('page-container');
let currentPage = null;

// Window Controls
document.getElementById('btn-minimize').addEventListener('click', () => {
    window.electronAPI.minimizeApp();
});
document.getElementById('btn-close').addEventListener('click', () => {
    window.electronAPI.closeApp();
});

// Sidebar Navigation
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        loadPage(item.dataset.page);
    });
});

async function loadPage(pageName) {
    if (currentPage && currentPage.destroy) {
        currentPage.destroy();
    }
    
    pageContainer.innerHTML = '';
    
    const scriptId = `script-page-${pageName}`;
    let script = document.getElementById(scriptId);
    
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `pages/${pageName}.js`;
        document.body.appendChild(script);
        
        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }
    
    currentPage = window.pages[pageName];
    if (currentPage && currentPage.render) {
        currentPage.render(pageContainer);
    }
}

// Global WebSocket State Bridge
let socket = null;
window.omegaState = {
    status: 'offline',
    logs: []
};

// Set up window.pages namespace
window.pages = {};

function connectWS() {
    window.omegaWS = socket = new WebSocket('ws://localhost:8765');
    
    socket.onopen = () => {
        window.omegaState.status = 'idle';
        document.dispatchEvent(new CustomEvent('omega:state-change', { detail: 'idle' }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'state') {
                window.omegaState.status = data.value;
                document.dispatchEvent(new CustomEvent('omega:state-change', { detail: data.value }));
            } else if (data.type === 'activity') {
                window.omegaState.logs.unshift(data);
                if (window.omegaState.logs.length > 50) {
                    window.omegaState.logs.pop();
                }
                document.dispatchEvent(new CustomEvent('omega:activity', { detail: data }));
            }
        } catch (e) {
            console.error('[WS Renderer] Error parsing message:', e);
        }
    };

    socket.onclose = () => {
        window.omegaState.status = 'offline';
        document.dispatchEvent(new CustomEvent('omega:state-change', { detail: 'offline' }));
        setTimeout(connectWS, 1500);
    };

    socket.onerror = () => {
        socket.close();
    };
}

connectWS();
loadPage('home');
