/* ==========================================================================
   NOVUM OS — Main Application Logic (app.js)
   Brand: NovumAppsSolution
   Architecture: PWA, LocalStorage-First, Multi-Domain Intelligence
   ========================================================================== */

/* --- GLOBALE VARIABLEN & ZUSTAND --- */
let currentWorkspaceId = 'all';
let chatHistory = [];
let activeReportForChat = null;
let scanTimerInterval = null;

// File Upload Speicher (PDF & Text)
let attachedFileContent = null;
let attachedFileName = null;

// PDF.js Worker Konfiguration
if (window['pdfjs-dist/build/pdf']) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* --- INITIALISIERUNG BEIM START --- */
document.addEventListener('DOMContentLoaded', () => {
    initDefaultWorkspaces();
    renderWorkspaceUI();
    renderReports();
});

/* --- WORKSPACE MANAGEMENT --- */
function initDefaultWorkspaces() {
    if (!localStorage.getItem('tw_workspaces')) {
        const defaults = [
            {
                id: 'ws_dev',
                name: 'DevTools & Micro-SaaS',
                icon: '🛠️',
                keywords: 'Micro-SaaS developer tools Web API PWA productivity tech trends',
                competitors: 'ProductHunt, IndieHackers, HackerNews',
                systemPrompt: 'Fokus auf Entwickler-Tools, Micro-SaaS Geschäftschancen, API-Integrationen und PWA Tech-Stack.'
            },
            {
                id: 'ws_booktok',
                name: 'BookTok & Indie Romance',
                icon: '📚',
                keywords: 'BookTok viral romance tropes dark romance indie author self-publishing TikTok trends',
                competitors: 'Goodreads, TikTok #BookTok, Amazon Bestsellers',
                systemPrompt: 'Fokus auf Buchmarketing, virale Tropes, Indie-Romance Zielgruppen und BookTok Community-Trends.'
            }
        ];
        localStorage.setItem('tw_workspaces', JSON.stringify(defaults));
    }
}

function getWorkspaces() {
    return JSON.parse(localStorage.getItem('tw_workspaces')) || [];
}

function switchWorkspace(id) {
    currentWorkspaceId = id;
    renderWorkspaceUI();
    renderReports();
}

function renderWorkspaceUI() {
    const container = document.getElementById('workspace-tabs');
    if (!container) return;

    const workspaces = getWorkspaces();
    let html = `
        <button onclick="switchWorkspace('all')" class="px-3 py-1.5 rounded-xl text-xs font-medium transition ${currentWorkspaceId === 'all' ? 'bg-novum-accent text-white font-semibold' : 'bg-black/5 text-novum-subtext hover:text-novum-text'}">
            🌐 Global (Alle)
        </button>
    `;

    workspaces.forEach(ws => {
        const isActive = ws.id === currentWorkspaceId;
        html += `
            <button onclick="switchWorkspace('${ws.id}')" class="px-3 py-1.5 rounded-xl text-xs font-medium transition ${isActive ? 'bg-novum-accent text-white font-semibold' : 'bg-black/5 text-novum-subtext hover:text-novum-text'}">
                ${ws.icon} ${ws.name}
            </button>
        `;
    });

    container.innerHTML = html;
}

/* --- FETCH ENGINE MIT TIMEOUT --- */
async function fetchWithTimeout(resource, options = {}, timeout = 60000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Zeitüberschreitung bei der Anfrage (Timeout nach 60s).');
        }
        throw error;
    }
}

/* --- KI-CALL ENGINE (GEMINI 3.8 / 2.5 / 3.5 FALLBACK + OPENAI) --- */
async function callAI(promptText, maxTime = 60000) {
    const openaiKey = localStorage.getItem('tw_key_openai');
    const geminiKey = localStorage.getItem('tw_key_gemini');

    if (openaiKey) {
        const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: promptText }] })
        }, maxTime);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    } else if (geminiKey) {
        /*
          Aktuelle Google Gemini Modelle im v1beta REST-Endpoint:
          Primary: gemini-3.8-flash
          Fallbacks: gemini-2.5-flash, gemini-3.5-flash
        */
        const candidateModels = [
            'gemini-3.8-flash',
            'gemini-2.5-flash',
            'gemini-3.5-flash'
        ];

        let lastErrorMessage = '';

        for (const model of candidateModels) {
            try {
                const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                }, maxTime);

                const data = await res.json();
                
                if (data.error) {
                    lastErrorMessage = data.error.message;
                    continue; // Nächstes Modell versuchen
                }

                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
            } catch (err) {
                lastErrorMessage = err.message;
            }
        }

        throw new Error(`Gemini API Fehler: ${lastErrorMessage || 'Kein gültiges Modell erreichbar.'}`);
    }
    throw new Error('Kein API-Key hinterlegt. Bitte hinterlege einen kostenlosen Gemini API-Key in den Einstellungen.');
}

/* --- SERPER.DEV WEB RETRIEVAL --- */
async function fetchSerperData(queryKeywords, competitorList = '') {
    const serperKey = localStorage.getItem('tw_key_serper');
    if (!serperKey) throw new Error('Kein Serper.dev Key gefunden.');

    const fullQuery = `${queryKeywords} ${competitorList}`.trim();

    const response = await fetchWithTimeout('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
            'X-API-KEY': serperKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: fullQuery, num: 8 })
    }, 20000);

    const data = await response.json();
    if (!data.organic) return 'Keine Live-Ergebnisse gefunden.';

    return data.organic.map(item => `Titel: ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}`).join('\n\n');
}

/* --- COUNTDOWN TIMER FÜR SCAN --- */
function startScanCountdown(seconds = 20) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('scan-timer-display');
    
    if (timerEl) {
        timerEl.textContent = `Geschätzte Dauer: ca. ${timeLeft}s`;
    }

    clearInterval(scanTimerInterval);
    scanTimerInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            if (timeLeft > 0) {
                timerEl.textContent = `Geschätzte Dauer: ca. ${timeLeft}s`;
            } else {
                timerEl.textContent = `Wird fertiggestellt...`;
            }
        }
        if (timeLeft <= 0) {
            clearInterval(scanTimerInterval);
        }
    }, 1000);
}

function stopScanCountdown() {
    clearInterval(scanTimerInterval);
}

function updateScanProgress(percent, phaseTitle, subText, detailText) {
    const bar = document.getElementById('scan-progress-bar');
    const phaseEl = document.getElementById('scan-phase-title');
    const subEl = document.getElementById('scan-sub-text');
    const detailEl = document.getElementById('scan-detail-text');

    if (bar) bar.style.width = `${percent}%`;
    if (phaseEl) phaseEl.textContent = phaseTitle;
    if (subEl) subEl.textContent = subText;
    if (detailEl) detailEl.textContent = detailText;
}

/* --- LIVE SCAN ENGINE --- */
async function startLiveScan() {
    const serperKey = localStorage.getItem('tw_key_serper');
    if (!serperKey) {
        alert('Bitte Serper.dev Key in den Profil-Einstellungen hinterlegen.');
        toggleProfileModal();
        return;
    }

    requestNotificationPermission();
    const customPromptEl = document.getElementById('scan-custom-prompt');
    const langEl = document.getElementById('ai-response-lang');
    const customPrompt = customPromptEl ? customPromptEl.value.trim() : '';
    const aiLang = langEl ? langEl.value : 'de';

    const scanModal = document.getElementById('scan-modal');
    if (scanModal) scanModal.classList.remove('hidden');

    // ⏱️ Start 20s Countdown
    startScanCountdown(20);

    try {
        updateScanProgress(25, 'Phase 1: Retrieval', 'Serper.dev Web-Suche läuft...', 'Sammle Live-Daten...');

        let rawData = '', reportTitle = '', isGlobal = (currentWorkspaceId === 'all');
        const workspaces = getWorkspaces();

        if (isGlobal) {
            const combinedKeywords = workspaces.map(w => w.keywords).join(' ');
            rawData = await fetchSerperData(combinedKeywords);
            reportTitle = `Global Novum Delta — ${new Date().toLocaleDateString()}`;
        } else {
            const activeWs = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];
            rawData = await fetchSerperData(activeWs.keywords, activeWs.competitors);
            reportTitle = `${activeWs.name} (Delta Scan)`;
        }

        updateScanProgress(65, 'Phase 2: LLM Synthesis', 'Verarbeitung via Novum Engine...', 'Generiere SWOT Matrix...');

        const langInst = aiLang === 'de' ? 'Antworte auf Deutsch.' : 'Answer in English.';
        const prompt = `You are Novum OS, expert intelligence agent by NovumAppsSolution. ${langInst}\n\nData:\n${rawData}\n\n${customPrompt ? 'Focus: ' + customPrompt : ''}\n\nMarkdown Report Format:\n# Executive Summary\n[Summary]\n\n# SWOT Matrix\n### Strengths & Opportunities (Chancen)\n- [Point]\n### Weaknesses & Threats (Risiken)\n- [Point]\n\n# Quick-Win Action Items (Top 3)\n1. [Item]\n2. [Item]\n3. [Item]`;

        const aiReport = await callAI(prompt, 60000);

        updateScanProgress(100, 'Phase 3: Speichern', 'Report erstellt.', 'Speichere Daten...');

        stopScanCountdown();

        const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
        const newReport = {
            id: Date.now().toString(),
            workspaceId: currentWorkspaceId,
            workspaceName: isGlobal ? 'Global' : workspaces.find(w => w.id === currentWorkspaceId)?.name,
            title: reportTitle,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date().toLocaleDateString(),
            content: aiReport,
            isPinned: false,
            userNote: ''
        };

        allReports.unshift(newReport);
        localStorage.setItem('tw_reports', JSON.stringify(allReports));
        sendNotification('Novum OS', `Report "${reportTitle}" ist fertig!`);

        setTimeout(() => {
            renderReports();
            if (scanModal) scanModal.classList.add('hidden');
        }, 600);

    } catch (err) {
        stopScanCountdown();
        alert(`Fehler beim Scan: ${err.message}`);
        if (scanModal) scanModal.classList.add('hidden');
    }
}

/* --- REPORTS RENDERING & LOGIK --- */
function renderReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;

    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    const filtered = currentWorkspaceId === 'all' 
        ? allReports 
        : allReports.filter(r => r.workspaceId === currentWorkspaceId);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-novum-subtext text-xs">
                Keine Berichte für diesen Workspace vorhanden. Starte einen Live-Scan.
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(rep => {
        html += `
            <div class="p-4 bg-novum-card border border-novum-border rounded-2xl mb-3 transition hover:border-novum-accent/50">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-novum-accent/10 text-novum-accent font-semibold">${rep.workspaceName || 'General'}</span>
                    <span class="text-[10px] text-novum-subtext">${rep.date}</span>
                </div>
                <h3 class="text-sm font-bold text-novum-text mb-2">${rep.title}</h3>
                <div class="text-xs text-novum-subtext line-clamp-3 mb-3 font-mono whitespace-pre-wrap">${rep.content}</div>
                <div class="flex items-center gap-2 pt-2 border-t border-novum-border/50">
                    <button onclick="openChatForReport('${rep.id}')" class="text-xs px-3 py-1 rounded-xl bg-novum-accent/10 text-novum-accent hover:bg-novum-accent hover:text-white transition font-medium">
                        💬 Im Chat analysieren
                    </button>
                    <button onclick="deleteReport('${rep.id}')" class="text-xs px-2 py-1 rounded-xl text-red-400 hover:bg-red-500/10 transition ml-auto">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function deleteReport(id) {
    let allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    allReports = allReports.filter(r => r.id !== id);
    localStorage.setItem('tw_reports', JSON.stringify(allReports));
    renderReports();
}

/* --- FILE UPLOAD ENGINE (INCL. PDF.js TEXT-EXTRAKTION) --- */
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    attachedFileName = file.name;
    const previewContainer = document.getElementById('chat-file-preview');
    const fileNameEl = document.getElementById('chat-file-name');

    if (fileNameEl) fileNameEl.textContent = `⏳ Verarbeite ${file.name}...`;
    if (previewContainer) previewContainer.classList.remove('hidden');

    try {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            attachedFileContent = await extractTextFromPDF(file);
        } else {
            attachedFileContent = await file.text();
        }

        if (fileNameEl) {
            fileNameEl.textContent = `📄 ${attachedFileName} (${Math.round(attachedFileContent.length / 1024)} KB Text)`;
        }
    } catch (err) {
        alert(`Fehler beim Einlesen der Datei: ${err.message}`);
        clearAttachedFile();
    }
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `--- Seite ${pageNum} ---\n${pageText}\n\n`;
    }

    return fullText;
}

function clearAttachedFile() {
    attachedFileContent = null;
    attachedFileName = null;
    const inputEl = document.getElementById('chat-file-input');
    if (inputEl) inputEl.value = '';
    const previewContainer = document.getElementById('chat-file-preview');
    if (previewContainer) previewContainer.classList.add('hidden');
}

/* --- CHAT ENGINE & PROMPT SYNTHESIS --- */
function openChatForReport(reportId) {
    const allReports = JSON.parse(localStorage.getItem('tw_reports')) || [];
    activeReportForChat = allReports.find(r => r.id === reportId) || null;
    
    chatHistory = [];
    if (activeReportForChat) {
        chatHistory.push({ 
            role: 'assistant', 
            text: `Ich habe den Bericht **"${activeReportForChat.title}"** geladen. Stelle mir eine Frage dazu oder hänge Notizen/PDFs an!` 
        });
    }

    const chatModal = document.getElementById('chat-modal');
    if (chatModal) chatModal.classList.remove('hidden');
    renderChatMessages();
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    let html = '';
    chatHistory.forEach(msg => {
        const isUser = msg.role === 'user';
        html += `
            <div class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-3">
                <div class="max-w-[85%] p-3 rounded-2xl text-xs ${isUser ? 'bg-novum-accent text-white rounded-br-none' : 'bg-black/10 border border-novum-border text-novum-text rounded-bl-none'} whitespace-pre-wrap font-sans">
                    ${msg.text}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input ? input.value.trim() : '';
    if (!msg && !attachedFileContent) return;

    const intensityEl = document.getElementById('chat-intensity');
    const intensity = intensityEl ? intensityEl.value : 'standard';

    let userDisplayText = msg;
    if (attachedFileName) {
        userDisplayText = `[Angehängte Datei: ${attachedFileName}]\n${msg}`;
    }

    chatHistory.push({ role: 'user', text: userDisplayText });
    if (input) input.value = '';
    renderChatMessages();

    const reportSnippet = activeReportForChat ? activeReportForChat.content.slice(0, 3000) : '';

    let intensityPrompt = "Antworte präzise, klar und lösungsorientiert.";
    if (intensity === 'quick') intensityPrompt = "Antworte sehr kurz, prägnant und in Stichpunkten.";
    if (intensity === 'deep') intensityPrompt = "Antworte auf Senior-Architekten-Niveau: tiefgehend, mit vollem Code, klaren Schritten und fundierten Logiken.";

    let fileContext = "";
    if (attachedFileContent) {
        fileContext = `\n\n[Angehängtes Dokument / Gedankensammlung (${attachedFileName})]:\n${attachedFileContent}`;
    }

    const systemPrompt = `Du bist Novum OS — KI-Agent auf Claude 3.5 Niveau von NovumAppsSolution. Keine Floskeln, starte direkt mit der Antwort.\n\nKontext aus aktuellem Bericht:\n${reportSnippet}${fileContext}\n\n${intensityPrompt}\n\nAnfrage: ${msg}`;

    clearAttachedFile();

    try {
        const reply = await callAI(systemPrompt, 45000);
        chatHistory.push({ role: 'assistant', text: reply });
        renderChatMessages();
    } catch (err) {
        chatHistory.push({ role: 'assistant', text: `⚠️ Fehler: ${err.message}` });
        renderChatMessages();
    }
}

/* --- SETTINGS & NOTIFICATIONS --- */
function toggleProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    
    if (modal.classList.contains('hidden')) {
        document.getElementById('pref-serper-key').value = localStorage.getItem('tw_key_serper') || '';
        document.getElementById('pref-gemini-key').value = localStorage.getItem('tw_key_gemini') || '';
        document.getElementById('pref-openai-key').value = localStorage.getItem('tw_key_openai') || '';
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function saveProfileSettings() {
    const serper = document.getElementById('pref-serper-key').value.trim();
    const gemini = document.getElementById('pref-gemini-key').value.trim();
    const openai = document.getElementById('pref-openai-key').value.trim();

    localStorage.setItem('tw_key_serper', serper);
    localStorage.setItem('tw_key_gemini', gemini);
    localStorage.setItem('tw_key_openai', openai);

    alert('Einstellungen erfolgreich gespeichert!');
    toggleProfileModal();
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'icon.png' });
    }
}
