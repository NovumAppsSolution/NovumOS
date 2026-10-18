/* ==========================================================================
   Novum OS — Intelligence & Co-Writer Engine
   Developed by NovumAppsSolution
   - Vanilla JS / Single-Page Application Architecture
   - BYOK (Bring Your Own Key) Model
   - Live Web Intelligence (Serper.dev) & LLM Synthesis (Claude-Level Gemini Prompting)
   ========================================================================== */

let activeReportForChat = null;
let currentReportForHooks = null;
let chatHistory = [];
let currentWorkspaceId = localStorage.getItem('tw_active_ws') || 'all';
let searchFilterQuery = '';

/* --- FINELINE SVG ICONS --- */
const Icons = {
    pin: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c.11.128.19.278.232.441l.942 3.766a2.25 2.25 0 01-.58 2.023l-1.126 1.126c-.282.282-.44.664-.44 1.063V15.75A2.25 2.25 0 0114.375 18H9.625A2.25 2.25 0 017.375 15.75v-4.015c0-.399-.158-.781-.44-1.063L5.809 9.546a2.25 2.25 0 01-.58-2.023l.942-3.766a1.125 1.125 0 01.378-.58M12 18v3.75"/></svg>`,
    trash: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>`,
    zap: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>`,
    chat: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>`,
    chevronDown: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>`,
    edit: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
    runInitialAppLoader();
    loadProfileAndTheme();
    initWorkspaces();
    loadSavedApiKeys();
    renderWorkspaceUI();
    renderReports();
    requestNotificationPermission();
});

/* --- NOTIFICATIONS SYSTEM --- */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: './icon-192.png'
        });
    }
}

/* --- INITIAL LAUNCH ANIMATION --- */
function runInitialAppLoader() {
    const loader = document.getElementById('novum-app-loader');
    const loadBar = document.getElementById('app-load-bar');
    if (!loader || !loadBar) return;

    setTimeout(() => { loadBar.style.width = '100%'; }, 100);
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 700);
    }, 1100);
}

/* --- THEME & PROFILE ENGINE --- */
function toggleProfileModal() {
    document.getElementById('profile-modal').classList.toggle('hidden');
    checkApiKeyHealth();
}

function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('novum_theme', themeName);
}

function loadProfileAndTheme() {
    const savedTheme = localStorage.getItem('novum_theme') || 'sage';
    setTheme(savedTheme);

    const userName = localStorage.getItem('novum_user_name') || 'Novum User';
    const userRole = localStorage.getItem('novum_user_role') || 'Developer';

    const nameInput = document.getElementById('user-name-input');
    const roleInput = document.getElementById('user-role-input');
    if (nameInput) nameInput.value = userName;
    if (roleInput) roleInput.value = userRole;

    const initial = userName.charAt(0).toUpperCase() || 'N';
    const headerAvatar = document.getElementById('header-avatar');
    const modalAvatar = document.getElementById('modal-avatar');
    const headerUserName = document.getElementById('header-user-name');

    if (headerAvatar) headerAvatar.textContent = initial;
    if (modalAvatar) modalAvatar.textContent = initial;
    if (headerUserName) headerUserName.textContent = userName;
}

function saveProfileAndKeys() {
    const userName = document.getElementById('user-name-input').value.trim() || 'Novum User';
    const userRole = document.getElementById('user-role-input').value.trim() || 'Developer';

    localStorage.setItem('novum_user_name', userName);
    localStorage.setItem('novum_user_role', userRole);

    saveApiKeys();
    loadProfileAndTheme();
    toggleProfileModal();
}

/* --- API KEYS & HEALTH CHECK --- */
function saveApiKeys() {
    localStorage.setItem('tw_key_serper', document.getElementById('key-serper').value.trim());
    localStorage.setItem('tw_key_openai', document.getElementById('key-openai').value.trim());
    localStorage.setItem('tw_key_gemini', document.getElementById('key-gemini').value.trim());
}

function loadSavedApiKeys() {
    if (document.getElementById('key-serper')) {
        document.getElementById('key-serper').value = localStorage.getItem('tw_key_serper') || '';
        document.getElementById('key-openai').value = localStorage.getItem('tw_key_openai') || '';
        document.getElementById('key-gemini').value = localStorage.getItem('tw_key_gemini') || '';
    }
}

function checkApiKeyHealth() {
    const serper = localStorage.getItem('tw_key_serper');
    const openai = localStorage.getItem('tw_key_openai');
    const gemini = localStorage.getItem('tw_key_gemini');

    const statusEl = document.getElementById('api-status-badge');
    if (!statusEl) return;

    if (serper && (openai || gemini)) {
        statusEl.className = "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
        statusEl.textContent = "● APIs Aktiv";
    } else {
        statusEl.className = "text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30";
        statusEl.textContent = "● Keys Unvollständig";
    }
}

/* --- WORKSPACE MEMORY ENGINE --- */
function toggleStoryBibleModal() {
    const modal = document.getElementById('story-bible-modal');
    if (!modal) return;
    
    if (modal.classList.contains('hidden')) {
        loadStoryBible();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function getMemoryKey() {
    return `novum_memory_ws_${currentWorkspaceId}`;
}

function loadStoryBible() {
    const savedMemory = JSON.parse(localStorage.getItem(getMemoryKey())) || { voice: '', characters: '', progress: '' };
    document.getElementById('sb-author-voice').value = savedMemory.voice || '';
    document.getElementById('sb-characters').value = savedMemory.characters || '';
    document.getElementById('sb-plot-progress').value = savedMemory.progress || '';
}

function saveStoryBible() {
    const memoryData = {
        voice: document.getElementById('sb-author-voice').value.trim(),
        characters: document.getElementById('sb-characters').value.trim(),
        progress: document.getElementById('sb-plot-progress').value.trim()
    };

    localStorage.setItem(getMemoryKey(), JSON.stringify(memoryData));
    alert('Workspace Memory erfolgreich aktualisiert!');
    toggleStoryBibleModal();
}

/* --- SIDEBAR & WORKSPACES --- */
function toggleSidebar() {
    const drawer = document.getElementById('sidebar-drawer');
    const overlay = document.getElementById('sidebar-overlay');
    if (!drawer) return;

    if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'translateX(0)') {
        drawer.style.transform = 'translateX(-100%)';
        if (overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.style.display = 'none', 300); }
    } else {
        if (overlay) { overlay.style.display = 'block'; setTimeout(() => overlay.style.opacity = '1', 10); }
        drawer.style.transform = 'translateX(0)';
    }
}

function getWorkspaces() {
    return JSON.parse(localStorage.getItem('tw_workspaces')) || [
        { id: '1', name: 'NovumAppsSolution — Dev & Micro-SaaS', keywords: 'Micro SaaS developer tools BYOK architecture Stripe Gumroad', competitors: 'Vercel, Supabase' },
        { id: '2', name: 'AI Business & Solopreneur', keywords: 'AI Business Micro SaaS Automation Trends', competitors: 'OpenAI' }
    ];
}

function initWorkspaces() {
    const workspaces = getWorkspaces();
    const sidebarList = document.getElementById('sidebar-workspace-list');
    if (!sidebarList) return;

    sidebarList.innerHTML = workspaces.map(w => `
        <div class="flex items-center gap-1.5">
            <button onclick="switchWorkspace('${w.id}'); toggleSidebar();" class="flex-1 text-left p-3.5 rounded-2xl border ${currentWorkspaceId === w.id ? 'bg-novum-accent/20 border-novum-accent/40 text-novum-text font-medium' : 'bg-novum-card/60 border-novum-border text-novum-subtext hover:bg-black/5'} transition active:scale-95 flex items-center justify-between text-xs">
                <span class="truncate">${w.name}</span>
                <span class="text-[10px] text-novum-subtext">→</span>
            </button>
            <button onclick="deleteWorkspace('${w.id}', event)" title="Workspace löschen" class="p-3.5 rounded-2xl border border-novum-border bg-novum-card/60 text-novum-subtext hover:text-red-400 hover:border-red-400/30 transition active:scale-95">
                ${Icons.trash}
            </button>
        </div>
    `).join('');
}

function deleteWorkspace(id, event) {
    if (event) event.stopPropagation();
    
    const workspaces = getWorkspaces();
    if (workspaces.length <= 1) {
        alert("Du musst mindestens einen Workspace behalten.");
        return;
    }

    const wsToDelete = workspaces.find(w => w.id === id);
    if (!confirm(`Möchtest du den Workspace "${wsToDelete?.name}" und alle zugehörigen Reports wirklich löschen?`)) {
        return;
    }

    const updatedWorkspaces = workspaces.filter(w => w.id !== id);
    localStorage.setItem('tw_workspaces', JSON.stringify(updatedWorkspaces));

    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    const updatedReports = allReports.filter(r => r.workspaceId !== id);
    localStorage.setItem('tw_reports', JSON.stringify(updatedReports));

    switchWorkspace('all');
}

function switchWorkspace(id) {
    currentWorkspaceId = id;
    localStorage.setItem('tw_active_ws', id);
    renderWorkspaceUI();
    renderReports();
    initWorkspaces();
}

function renderWorkspaceUI() {
    const workspaces = getWorkspaces();
    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];

    document.getElementById('stat-ws-count').textContent = workspaces.length;
    document.getElementById('stat-report-count').textContent = allReports.length;
    document.getElementById('stat-last-scan').textContent = allReports.length > 0 ? allReports[0].date : 'Kein Scan';

    if (currentWorkspaceId === 'all') {
        document.getElementById('ws-badge').textContent = 'Global Intelligence';
        document.getElementById('ws-title').textContent = 'Executive Overview';
        document.getElementById('ws-keywords').textContent = 'Workspace-übergreifendes Trend-Tracking & Delta-Analysen.';
        document.getElementById('reports-section-title').textContent = 'Alle Intelligence Reports';
    } else {
        const activeWs = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];
        document.getElementById('ws-badge').textContent = `Workspace: ${activeWs.name}`;
        document.getElementById('ws-title').textContent = activeWs.name;
        document.getElementById('ws-keywords').textContent = `Keywords: ${activeWs.keywords}${activeWs.competitors ? ' | Competitors: ' + activeWs.competitors : ''}`;
        document.getElementById('reports-section-title').textContent = `Reports für "${activeWs.name}"`;
    }
}

function toggleNewWorkspaceModal() { document.getElementById('new-workspace-modal').classList.toggle('hidden'); }

function createWorkspace() {
    const name = document.getElementById('ws-new-name').value.trim();
    const keywords = document.getElementById('ws-new-keywords').value.trim();
    const competitors = document.getElementById('ws-new-competitors')?.value.trim() || '';

    if (!name || !keywords) { alert('Bitte fülle alle Felder aus.'); return; }

    const workspaces = getWorkspaces();
    const newWs = { id: Date.now().toString(), name, keywords, competitors };
    workspaces.push(newWs);
    localStorage.setItem('tw_workspaces', JSON.stringify(workspaces));
    switchWorkspace(newWs.id);
    toggleNewWorkspaceModal();

    document.getElementById('ws-new-name').value = '';
    document.getElementById('ws-new-keywords').value = '';
}

/* --- SCAN ENGINE WITH TIMEOUT CONTROL --- */
function updateScanProgress(percent, title, subtitle, logText) {
    document.getElementById('scan-progress-bar').style.width = `${percent}%`;
    document.getElementById('scan-step-title').textContent = title;
    document.getElementById('scan-step-subtitle').textContent = subtitle;
    if (logText) document.getElementById('scan-log-line').textContent = `> ${logText}`;
}

async function fetchSerperData(keyword, competitors = '') {
    const serperKey = localStorage.getItem('tw_key_serper');
    if (!serperKey) throw new Error('Serper.dev API Key fehlt in Profil / Einstellungen.');

    const searchQuery = `${keyword} ${competitors ? 'Competitors: ' + competitors : ''} Trends Bestseller`;

    const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, num: 6, gl: 'de', hl: 'de' })
    });
    const data = await res.json();
    let snippets = [];
    if (data.organic) {
        data.organic.forEach(item => snippets.push(`- ${item.title}: ${item.snippet}`));
    }
    return snippets.join('\n');
}

async function fetchWithTimeout(resource, options = {}, timeout = 60000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        if (err.name === 'AbortError') throw new Error('Zeitüberschreitung: KI-Anfrage hat zu lange gedauert.');
        throw err;
    }
}

async function generateAIReport(title, rawData, customInstruction, isGlobal, previousContent, lang) {
    const openaiKey = localStorage.getItem('tw_key_openai');
    const geminiKey = localStorage.getItem('tw_key_gemini');
    const langInstruction = lang === 'de' ? 'Antworte auf Deutsch.' : 'Answer in English.';

    let prompt = `
You are Novum OS, an expert market intelligence agent built by NovumAppsSolution. ${langInstruction}

Live Web Data:
${rawData}

${previousContent ? `PREVIOUS REPORT:\n${previousContent}` : ''}
${customInstruction ? `CUSTOM FOCUS: ${customInstruction}` : ''}

Generate a concise report in Markdown:
# Executive Summary
[Brief summary]

# SWOT Matrix
### Strengths & Opportunities (Chancen)
- [Point 1]
### Weaknesses & Threats (Risiken)
- [Point 1]

# Quick-Win Action Items (Top 3)
1. [Action 1]
2. [Action 2]
3. [Action 3]

# Key Market Changes & Delta Shifts
[Details]
`;

    if (openaiKey) {
        const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] })
        }, 60000);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    } else if (geminiKey) {
    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }, 60000);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
}

    throw new Error('Kein OpenAI oder Gemini API Key hinterlegt.');
}

async function startLiveScan() {
    const serperKey = localStorage.getItem('tw_key_serper');
    if (!serperKey) { alert('Bitte hinterlege deinen Serper.dev API Key im Profil.'); toggleProfileModal(); return; }

    requestNotificationPermission();

    const customPrompt = document.getElementById('scan-custom-prompt').value.trim();
    const aiLang = document.getElementById('ai-response-lang').value;
    const scanModal = document.getElementById('scan-modal');
    scanModal.classList.remove('hidden');

    try {
        updateScanProgress(25, 'Phase 1: Retrieval', 'Serper.dev Web-Suche läuft...', 'Sammle Live-Daten...');
        
        const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
        let rawData = '';
        let reportTitle = '';
        let isGlobal = (currentWorkspaceId === 'all');

        if (isGlobal) {
            const workspaces = getWorkspaces();
            rawData = await fetchSerperData(workspaces.map(w => w.keywords).join(' '));
            reportTitle = `Global Novum Delta — ${new Date().toLocaleDateString()}`;
        } else {
            const workspaces = getWorkspaces();
            const activeWs = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];
            rawData = await fetchSerperData(activeWs.keywords, activeWs.competitors);
            reportTitle = `${activeWs.name} (Delta Scan)`;
        }

        updateScanProgress(65, 'Phase 2: LLM Synthesis', 'Verarbeitung via Novum Engine...', 'Generiere SWOT Matrix...');

        const aiReport = await generateAIReport(reportTitle, rawData, customPrompt, isGlobal, '', aiLang);

        updateScanProgress(100, 'Phase 3: Speichern', 'Report erstellt.', 'Speichere Daten...');

        const newReport = {
            id: Date.now().toString(),
            workspaceId: currentWorkspaceId,
            workspaceName: isGlobal ? 'Global' : getWorkspaces().find(w => w.id === currentWorkspaceId)?.name,
            title: reportTitle,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date().toLocaleDateString(),
            content: aiReport,
            isPinned: false,
            userNote: ''
        };

        allReports.unshift(newReport);
        localStorage.setItem('tw_reports', JSON.stringify(allReports));

        sendNotification('Novum OS', `Dein Analyse-Report "${reportTitle}" ist fertig!`);

        setTimeout(() => {
            renderWorkspaceUI();
            renderReports();
            scanModal.classList.add('hidden');
        }, 600);

    } catch (err) {
        alert(`Fehler bei der Analyse: ${err.message}`);
        scanModal.classList.add('hidden');
    }
}

/* --- REPORTS FEED & NOTES --- */
function calculateVolatilityScore(content) {
    const shiftKeywords = ['boom', 'trend', 'neue', 'shift', 'hype', 'anstieg', 'wechsel', 'bestseller', 'trope', 'explosiv'];
    let matches = 0;
    const lowerContent = content.toLowerCase();

    shiftKeywords.forEach(word => {
        const count = (lowerContent.match(new RegExp(word, 'g')) || []).length;
        matches += count;
    });

    if (matches > 8) return { label: 'Volatilität: Hoch', class: 'bg-red-500/10 border-red-500/30 text-red-400' };
    if (matches > 4) return { label: 'Volatilität: Moderat', class: 'bg-novum-accent/15 border-novum-accent/30 text-novum-accent' };
    return { label: 'Volatilität: Stabil', class: 'bg-black/10 border-novum-border text-novum-subtext' };
}

function saveReportNote(reportId, noteText) {
    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    const report = allReports.find(r => r.id === reportId);
    if (report) {
        report.userNote = noteText;
        localStorage.setItem('tw_reports', JSON.stringify(allReports));
    }
}

function filterReports(query) {
    searchFilterQuery = query.toLowerCase();
    renderReports();
}

function togglePinReport(id) {
    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    const report = allReports.find(r => r.id === id);
    if (report) {
        report.isPinned = !report.isPinned;
        localStorage.setItem('tw_reports', JSON.stringify(allReports));
        renderReports();
    }
}

function deleteReport(id) {
    if (!confirm("Möchtest du diesen Report wirklich löschen?")) return;

    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    const updatedReports = allReports.filter(r => r.id !== id);
    localStorage.setItem('tw_reports', JSON.stringify(updatedReports));

    renderWorkspaceUI();
    renderReports();
}

function parseAndRenderSWOT(content) {
    const oppsMatch = content.match(/### Strengths & Opportunities[\s\S]*?(?=###|#|$)/i);
    const threatsMatch = content.match(/### Weaknesses & Threats[\s\S]*?(?=###|#|$)/i);
    const actionsMatch = content.match(/# Quick-Win Action Items[\s\S]*?(?=#|$)/i);

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
            <div class="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl">
                <span class="text-emerald-500 text-xs font-bold uppercase tracking-wider block mb-1">Chancen (Opportunities)</span>
                <div class="text-[11px] text-novum-text whitespace-pre-line">${oppsMatch ? oppsMatch[0].replace(/### Strengths & Opportunities/i, '').trim() : 'Keine spezifischen Chancen.'}</div>
            </div>
            <div class="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl">
                <span class="text-red-400 text-xs font-bold uppercase tracking-wider block mb-1">Risiken (Threats)</span>
                <div class="text-[11px] text-novum-text whitespace-pre-line">${threatsMatch ? threatsMatch[0].replace(/### Weaknesses & Threats/i, '').trim() : 'Keine Risiken.'}</div>
            </div>
        </div>
        ${actionsMatch ? `
            <div class="bg-novum-accent/10 border border-novum-accent/30 p-3.5 rounded-2xl my-3">
                <span class="text-novum-accent text-xs font-bold uppercase tracking-wider block mb-1">Quick-Win Wochenaufgaben</span>
                <div class="text-[11px] text-novum-text whitespace-pre-line">${actionsMatch[0].replace(/# Quick-Win Action Items/i, '').trim()}</div>
            </div>
        ` : ''}
    `;
}

function renderReports() {
    const reportsList = document.getElementById('reports-list');
    let allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    
    let reports = currentWorkspaceId === 'all' 
        ? allReports 
        : allReports.filter(r => r.workspaceId === currentWorkspaceId);

    if (searchFilterQuery) {
        reports = reports.filter(r => r.title.toLowerCase().includes(searchFilterQuery) || r.content.toLowerCase().includes(searchFilterQuery));
    }

    reports.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    document.getElementById('report-count-badge').textContent = `${reports.length} Reports`;

    if (reports.length === 0) {
        reportsList.innerHTML = `<div class="bg-novum-card border border-novum-border p-6 rounded-[24px] text-center text-novum-subtext text-xs backdrop-blur-xl">Keine Berichte gefunden. Starte einen Agenten-Scan.</div>`;
        return;
    }

    reportsList.innerHTML = reports.map(r => {
        const volScore = calculateVolatilityScore(r.content);

        return `
        <div class="bg-novum-card border border-novum-border hover:border-novum-accent/40 transition-all rounded-[24px] p-5 space-y-3 backdrop-blur-xl shadow-md">
            <div class="flex items-start justify-between">
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] text-novum-accent font-semibold uppercase tracking-wider bg-novum-accent/15 px-2.5 py-0.5 rounded-full border border-novum-accent/30">${r.workspaceName}</span>
                        ${r.isPinned ? `<span class="text-[10px] text-amber-400 font-semibold uppercase tracking-wider bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">${Icons.pin} Pinned</span>` : ''}
                        <span class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${volScore.class}">${volScore.label}</span>
                    </div>
                    <h4 class="font-bold text-novum-text text-base tracking-tight mt-2">${r.title}</h4>
                    <p class="text-[11px] text-novum-subtext mt-0.5">${r.date}</p>
                </div>
                <button onclick="togglePinReport('${r.id}')" class="p-2 rounded-2xl bg-black/5 border border-novum-border ${r.isPinned ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : 'text-novum-subtext hover:text-novum-text'} transition">
                    ${Icons.pin}
                </button>
            </div>

            <div class="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
                <button onclick="generateSocialHooks('${r.id}')" class="px-3 py-1.5 rounded-xl bg-novum-accent/15 text-novum-accent border border-novum-accent/30 text-xs font-semibold hover:bg-novum-accent/25 transition shrink-0 active:scale-95 flex items-center gap-1.5">
                    ${Icons.zap}
                    <span>Content Studio</span>
                </button>
                <button onclick="openChatForReport('${r.id}')" class="px-3 py-1.5 rounded-xl bg-black/5 text-novum-text border border-novum-border text-xs font-medium hover:bg-black/10 transition shrink-0 active:scale-95 flex items-center gap-1.5">
                    ${Icons.chat}
                    <span>Agent Chat</span>
                </button>
                <button onclick="toggleReportDetail('${r.id}')" class="px-3 py-1.5 rounded-xl bg-black/5 text-novum-subtext border border-novum-border text-xs font-medium hover:text-novum-text transition shrink-0 active:scale-95 flex items-center gap-1">
                    <span>Details</span>
                    ${Icons.chevronDown}
                </button>
                <button onclick="deleteReport('${r.id}')" class="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition shrink-0 active:scale-95 ml-auto">
                    ${Icons.trash}
                </button>
            </div>

            <div id="report-detail-${r.id}" class="hidden pt-3 border-t border-novum-border text-xs text-novum-text leading-relaxed font-sans bg-black/5 p-4 rounded-2xl space-y-4">
                ${parseAndRenderSWOT(r.content)}
                <div class="pt-3 border-t border-novum-border/50 whitespace-pre-wrap mt-3">${r.content}</div>

                <div class="pt-3 border-t border-novum-border/50 space-y-1.5">
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-novum-subtext flex items-center gap-1.5">
                        ${Icons.edit}
                        <span>Aktions-Notiz:</span>
                    </label>
                    <textarea onchange="saveReportNote('${r.id}', this.value)" placeholder="Gedanken eintragen..." class="w-full bg-black/5 border border-novum-border rounded-xl p-2.5 text-xs text-novum-text focus:outline-none focus:border-novum-accent h-16 resize-none">${r.userNote || ''}</textarea>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function toggleReportDetail(id) {
    document.getElementById(`report-detail-${id}`)?.classList.toggle('hidden');
}

/* --- CLAUDE-3.5-SONNET LEVEL CHAT ENGINE (VIA GEMINI & OPENAI) --- */
function openChatForReport(id) {
    const reports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    activeReportForChat = reports.find(r => r.id === id);

    document.getElementById('chat-report-title').textContent = activeReportForChat ? activeReportForChat.title : 'Agent Chat';
    chatHistory = [{ role: 'assistant', text: `Novum OS Chat bereit. Bereit für Strategien, Code-Architektur und Markt-Intelligence zu "${activeReportForChat ? activeReportForChat.title : 'deinem Projekt'}".` }];
    renderChatMessages();
    document.getElementById('chat-modal').classList.remove('hidden');
}

function closeChatModal() { document.getElementById('chat-modal').classList.add('hidden'); }

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = chatHistory.map(m => `
        <div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] p-3.5 rounded-2xl ${m.role === 'user' ? 'bg-novum-accent text-white font-medium shadow-sm' : 'bg-novum-card border border-novum-border text-novum-text shadow-sm'}">${m.text}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const intensity = document.getElementById('chat-intensity')?.value || 'standard';

    chatHistory.push({ role: 'user', text: msg });
    input.value = '';
    renderChatMessages();

    const openaiKey = localStorage.getItem('tw_key_openai');
    const geminiKey = localStorage.getItem('tw_key_gemini');

    const memory = JSON.parse(localStorage.getItem(getMemoryKey())) || { voice: '', characters: '', progress: '' };
    const reportSnippet = activeReportForChat ? activeReportForChat.content.slice(0, 3000) : 'Kein spezifischer Report gewählt.';

    let intensityInstruction = "Formuliere deine Antwort glasklar, präzise und direkt lösungsorientiert.";
    if (intensity === 'quick') intensityInstruction = "Antworte absolut stichpunktartig, extrem knapp und fokussiert.";
    if (intensity === 'deep') intensityInstruction = "Antworte auf Senior-Software-Architekten-Niveau: Gehe tief ins Detail, liefere voll einsatzbereite Code-Beispiele, konkrete Schritte und durchdachte Business-Logiken.";

    /* Claude 3.5 Sonnet Persona System Prompting */
    const claudeSystemPrompt = `
Du bist Novum OS — der KI-Co-Autor, Dev-Strategist und KI-Architekt von NovumAppsSolution.
Deine Intelligenz entspricht dem Qualitätsstandard von Anthropic Claude 3.5 Sonnet.

=== CLAUDE QUALITY RULES ===
1. KEIN AI-FLUFF: Verwende keine Floskeln, keine höflichen Floskel-Einleitungen ("Sehr gerne helfe ich...") und kein Bla-Bla. Starte SOFORT mit der Antwort.
2. HOHE DENSITY: Liefere extrem dichte, wertvolle Informationen, logische Strukturen und saubere Formatierung.
3. SAUBERER CODE: Wenn Code verlangt wird, schreibe vollständigen, modernen, fehlerfreien Vanilla JS / HTML5 / CSS Code ohne Unvollständigkeiten oder Platzhalter.

=== WORKSPACE KONTEXT & TONALITÄT ===
${memory.voice ? 'Tonalitäts-Vorgabe: ' + memory.voice : ''}
${memory.characters ? 'Projekt-Details: ' + memory.characters : ''}

=== CURRENT REPORT DATA ===
${reportSnippet}

=== REGIEANWEISUNG ===
${intensityInstruction}

Benutzeranfrage: ${msg}
`;

    try {
        let reply = '';
        if (openaiKey) {
            const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: claudeSystemPrompt }] 
                })
            }, 45000);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            reply = data.choices[0].message.content;
        } } else if (geminiKey) {
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: claudeSystemPrompt }] }] })
    }, 45000);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0]?.content) {
        throw new Error('Gemini hat keine Antwort geliefert.');
    }
    reply = data.candidates[0].content.parts[0].text;

        } else { 
            reply = 'Bitte hinterlege deine API-Schlüssel (OpenAI oder Gemini) im Profil.'; 
        }

        chatHistory.push({ role: 'assistant', text: reply });
        renderChatMessages();
    } catch (err) {
        console.error("Chat Error:", err);
        chatHistory.push({ role: 'assistant', text: `⚠️ Fehler beim Antworten: ${err.message}` });
        renderChatMessages();
    }
}

/* --- HOOK STUDIO --- */
function generateSocialHooks(reportId) {
    const reports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    currentReportForHooks = reports.find(r => r.id === reportId);
    if (!currentReportForHooks) return;

    document.getElementById('hook-output-container').classList.add('hidden');
    document.getElementById('hook-output-text').textContent = '';
    document.getElementById('hooks-modal').classList.remove('hidden');
}

function closeHooksModal() { document.getElementById('hooks-modal').classList.add('hidden'); }

async function executeHookGeneration() {
    if (!currentReportForHooks) return;

    const formatType = document.getElementById('hook-format-type').value;
    const outputContainer = document.getElementById('hook-output-container');
    const outputText = document.getElementById('hook-output-text');

    outputText.textContent = "Novum KI generiert Content...";
    outputContainer.classList.remove('hidden');

    const openaiKey = localStorage.getItem('tw_key_openai');
    const geminiKey = localStorage.getItem('tw_key_gemini');

    let formatPrompt = "Erstelle 3 virale Social Media Hooks und ein kurzes Pitch-Skript basierend auf diesen Markttrends.";
    if (formatType === 'newsletter') formatPrompt = "Erstelle eine Newsletter-Kampagne mit 3 Betreffzeilen und Teaser-Text.";
    if (formatType === 'blurb') formatPrompt = "Erstelle einen Produkt-Pitch / Landingpage-Headline-Set und 3 Anzeigen-Hooks.";

    const fullPrompt = `Novum Report Context:\n${currentReportForHooks.content}\n\nTask: ${formatPrompt}`;

    try {
        let reply = "";
        if (openaiKey) {
            const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: fullPrompt }] })
            });
            const data = await res.json();
            reply = data.choices[0].message.content;
        } else if (geminiKey) {
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    reply = data.candidates[0].content.parts[0].text;
}
        } else { reply = "Bitte API-Schlüssel im Profil hinterlegen."; }
        outputText.textContent = reply;
    } catch (err) { outputText.textContent = `Fehler: ${err.message}`; }
}

function copyHooksToClipboard() {
    navigator.clipboard.writeText(document.getElementById('hook-output-text').textContent);
    alert("In Zwischenablage kopiert!");
}

/* --- SERVICE WORKER REGISTRATION --- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Novum OS Service Worker aktiv:', reg.scope))
            .catch((err) => console.error('Service Worker Fehler:', err));
    });
}
