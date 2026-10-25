// ============================================================
// K-Helps Analytics Center – app.js (Multi-Module Architecture)
// Module 1: Chat Response SLA (≤ 8 Mins)
// Module 2: Task SLA (Incident Management - 2h, 4h, 8h / 28,800s)
// ============================================================

const VALID_AGENTS_ARRAY = ["963516", "สิริยากร  โยธาจันทร์", "สมเกียรติ จารุพฤฒิพงศ์", "komkrit praditja", "สาวิตรี ต้นโนนยาง", "somkiat.ja", "26455", "kittipa.j@kbtg.tech", "34323", "seksan parameejae", "26465", "panisara nerngsri", "mewika phankingtip", "panisara.n@kbtg.tech", "963546", "nithus dangpuk", "theerawut bokkhaodaeng", "23224", "เสกสรร ปาระมีแจ้", "kitibhumi.p", "pantip.to@kbtg.tech", "นุสรา  พูลสมบัติ", "mewika.p@kbtg.tech", "pornpoom tevakoop", "chadaporn.sa@kbtg.tech", "anusit kwaenkonchim", "36145", "pornpoom.t@kbtg.tech", "kochakorn.k", "nutchanat.p@kbtg.tech", "35900", "parinya singthongla", "nusara.p", "28403", "yasumin tansila", "nutchanat pavongna", "kittiyakorn hanraeng", "เมวิกา พันธ์กิ่งทิพย์", "ananya.l", "pattaraporn noisumdang", "อนัญญา โลหะพรหม", "กิตติภา แจ้งคล้ายคม", "20153", "23140", "กิติภูมิ เปรมเดช", "mallika tomprasert", "siriyakorn yothachan", "kochakorn kansomsart", "963535", "พันธุ์ทิพย์ ทองมอญ", "ปาณิสรา เนื่องศรี", "35237", "kittiyakorn.h@kbtg.tech", "พรภูมิ เทวคุปต์", "komkrit.pr@kbtg.tech", "ananya lohaphrom", "จุฑารัตน์ กาลวงษ์", "963722", "mallika.to@kbtg.tech", "kittipa jangklaykom", "theerawut.b@kbtg.tech", "35536", "26215", "sawitree tononnyang", "9299", "27072", "pantip tongmorn", "967229", "อนุสิทธิ์ แคว้นคอนฉิม", "anusit.k@kbtg.tech", "ธีรวุฒิ บกเขาแดง", "suriya rangwankham", "kitibhumi premdech", "sawitree.ton@kbtg.tech", "parinya.si@kbtg.tech", "29392", "29752", "suriya.r@kbtg.tech", "กิตติยากร หารแรง", "ภัทรภรณ์ น้อยสำแดง", "yasumin.t@kbtg.tech", "35905", "nusara poolsombat", "nithus.d@kbtg.tech", "ญาสุมินทร์ แท่นศิลา", "33580", "ชฎาพร สนองชัยกุล", "pattaraporn.n@kbtg.tech", "ปริญญา สิงห์ทองลา", "siriyakorn.y@kbtg.tech", "somkiat jarupruttipong", "คมกริช  ประดิษฐจา", "963524", "jutharat kalavong", "นายสุริยา รางวัลคำ", "นุชนาถ ปาวงศ์นา", "seksan.pa", "chadaporn sanongchaikul", "34591", "นิทัศน์ แดงพุก", "มัลลิกา ถมประเสริฐ", "กชกร การสมศาสตร์", "jutharat.ka@kbtg.tech", "32778"];
const validAgents = new Set(VALID_AGENTS_ARRAY.map(a => a.toLowerCase()));

// Global State
let currentActiveModule = 'chatSla'; // 'chatSla', 'taskSla', or 'callReport'
let processedData = [];          // Chat SLA data
let processedTaskData = [];      // Task SLA data
let processedCallData = [];      // Call Report data
let processedAbandonedData = []; // Abandoned Call Detail Activity Report data
let processedFcrData = [];       // %FCR (Target>90%) Incident data
let uploadLogs = [];             // Uploaded Excel File Logs in MongoDB
let selectedAgentNames = new Set();
let selectedTaskGroups = new Set();
let selectedCallAgents = new Set();
let taskFilterPriority = 'all';
let taskFilterOutcome = 'all';
let callFilterWeek = 'all'; // 'all' or weekKey (e.g. '2026-W40')
let callFilterRing = 'all'; // 'all', '12s', 'normal'
let callViewMode = 'comparison'; // 'comparison' or 'details'
let abandonedFilterWeek = 'all'; // 'all' or weekKey (for Abandoned Khelps_Expert tab)
let fcrFilterWeek = 'all';       // 'all' or weekKey
let fcrFilterChannelGroup = 'all'; // 'all', 'voice', 'line', 'other'
let fcrFilterStatus = 'all';     // 'all', 'fcr', 'non_fcr'
let chartInstances = {};

// Call & FCR Table Pagination State (for fast UI rendering)
let callTablePage = 1;
const CALL_PAGE_SIZE = 50;
let lastFilteredCallList = [];

let fcrTablePage = 1;
const FCR_PAGE_SIZE = 50;
let lastFilteredFcrList = [];

// Role State ('user' = View Only, 'admin' = Full Edit/Upload/Delete)
let userRole = 'user';
let adminPassword = '';

const storeChat = "sessions";
const storeTask = "task_sla";
const storeCall = "call_records";
const storeAbandoned = "abandoned_calls";
const storeFcr = "fcr_cases";

function filterValidTasks(raw) {
    const seen = new Set();
    return (raw || []).filter(d => {
        if (!d.Task) return false;
        const addServ = String(d.AdditionalServices || '').trim().toLowerCase();
        if (addServ !== '' && addServ !== 'nan' && addServ !== 'null' && addServ !== 'undefined' && addServ !== '(blanks)' && addServ !== 'blank') return false;
        if (String(d.AssignedTo || '').trim().toLowerCase() === 'kbank - business user kbank - business user') return false;
        if (seen.has(d.Task)) return false;
        seen.add(d.Task);
        return true;
    });
}

function updateDbStatusUI(isConnected, errorText = '') {
    const el = document.getElementById('navDbStatusBadge');
    if (!el) return;
    if (isConnected) {
        el.className = 'hidden sm:flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-200';
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>MongoDB Online</span>`;
        el.title = 'เชื่อมต่อฐานข้อมูลออนไลน์ MongoDB Atlas เรียบร้อยแล้ว';
    } else {
        el.className = 'hidden sm:flex items-center gap-1.5 text-[10px] font-semibold bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg border border-red-200';
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span><span>DB Error</span>`;
        el.title = errorText || 'ไม่สามารถเชื่อมต่อฐานข้อมูล MongoDB ได้';
    }
}

// ─── Role & Permission Management (Admin vs User) ─────────────
function updateRoleUI() {
    const isAdmin = userRole === 'admin';
    const roleBadge = document.getElementById('roleStatusBadge');
    const toggleBtn = document.getElementById('adminToggleBtn');
    const adminUploadSec = document.getElementById('adminUploadSection');
    const userNotice = document.getElementById('userViewOnlyNotice');
    const clearContainer = document.getElementById('clearDbDropdownContainer');
    const fileBtnLabel = document.getElementById('fileManagerBtnLabel');

    if (roleBadge) {
        if (isAdmin) {
            roleBadge.className = 'text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1';
            roleBadge.innerHTML = `<span>🛡️ Admin (แก้ไขได้ทั้งหมด)</span>`;
        } else {
            roleBadge.className = 'text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 flex items-center gap-1';
            roleBadge.innerHTML = `<span>👁️ User (ดูอย่างเดียว)</span>`;
        }
    }

    if (toggleBtn) {
        if (isAdmin) {
            toggleBtn.textContent = 'ออกจากระบบ Admin';
            toggleBtn.className = 'text-[11px] font-semibold text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg px-2.5 py-1.5 transition-colors bg-white';
        } else {
            toggleBtn.textContent = 'เข้าสู่ระบบ Admin';
            toggleBtn.className = 'text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors shadow-2xs';
        }
    }

    if (adminUploadSec) adminUploadSec.classList.toggle('hidden', !isAdmin);
    if (userNotice) userNotice.classList.toggle('hidden', isAdmin);
    if (clearContainer) clearContainer.classList.toggle('hidden', !isAdmin);
    if (fileBtnLabel) fileBtnLabel.textContent = isAdmin ? 'นำเข้าไฟล์ / Logs' : 'ประวัติไฟล์ (Logs)';

    renderUploadLogsTable();
    // Refresh current active module view so Remarks inputs toggle between editable & read-only
    if (currentActiveModule === 'chatSla') updateDashboardView();
    else if (currentActiveModule === 'taskSla') updateTaskDashboardView();
    else if (currentActiveModule === 'callReport') updateCallDashboardView();
    else if (currentActiveModule === 'abandonedCall') updateAbandonedDashboardView();
    else if (currentActiveModule === 'fcr') updateFcrDashboardView();
}

window.handleRoleToggleClick = function() {
    if (userRole === 'admin') {
        userRole = 'user';
        adminPassword = '';
        sessionStorage.removeItem('khelps_admin_pass');
        updateRoleUI();
    } else {
        openAdminLoginModal();
    }
};

window.openAdminLoginModal = function() {
    const modal = document.getElementById('adminLoginModal');
    const input = document.getElementById('adminPasswordInput');
    const err = document.getElementById('adminLoginError');
    if (err) err.classList.add('hidden');
    if (input) input.value = '';
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => input?.focus(), 50);
};

window.closeAdminLoginModal = function() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) modal.classList.add('hidden');
};

window.handleAdminLoginSubmit = async function(e) {
    e.preventDefault();
    const input = document.getElementById('adminPasswordInput');
    const err = document.getElementById('adminLoginError');
    const btn = document.getElementById('adminLoginSubmitBtn');
    const pwd = input ? input.value : '';
    if (!pwd) return;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'กำลังตรวจสอบ...';
    }
    if (err) err.classList.add('hidden');

    try {
        const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_admin', password: pwd })
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
            userRole = 'admin';
            adminPassword = pwd;
            sessionStorage.setItem('khelps_admin_pass', pwd);
            closeAdminLoginModal();
            updateRoleUI();
        } else {
            if (err) {
                err.textContent = json.error || 'รหัสผ่าน Admin ไม่ถูกต้อง';
                err.classList.remove('hidden');
            }
        }
    } catch (error) {
        if (err) {
            err.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            err.classList.remove('hidden');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'ยืนยันเข้าสู่ระบบ';
        }
    }
};

// ─── File Manager & Upload Logs Modal ─────────────────────────
window.openFileManagerModal = function() {
    renderUploadLogsTable();
    const modal = document.getElementById('fileManagerModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeFileManagerModal = function() {
    const modal = document.getElementById('fileManagerModal');
    if (modal) modal.classList.add('hidden');
};

function renderUploadLogsTable() {
    const tbody = document.getElementById('uploadLogsTableBody');
    const empty = document.getElementById('emptyUploadLogsState');
    const modalCount = document.getElementById('modalFileLogCount');
    const navCount = document.getElementById('fileLogCountBadge');

    if (modalCount) modalCount.textContent = `${uploadLogs.length} ไฟล์`;
    if (navCount) navCount.textContent = uploadLogs.length;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!uploadLogs || uploadLogs.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    uploadLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/80 transition-colors';

        let modBadge = '';
        if (log.moduleType === 'chat' || log.store === 'sessions') {
            modBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">💬 First Response ECE( ≥95 %)</span>`;
        } else if (log.moduleType === 'task' || log.store === 'task_sla') {
            modBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">🎫 % Within SLA of 16 Apps</span>`;
        } else if (log.moduleType === 'abandoned' || log.store === 'abandoned_calls') {
            modBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">📵 Call Back (ABN Call of Ex)</span>`;
        } else if (log.moduleType === 'fcr' || log.store === 'fcr_cases') {
            modBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">🎯 %FCR (Target&gt;90%)</span>`;
        } else {
            modBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">📞 Call Not Received (Within 12 Secs)</span>`;
        }

        const dtStr = log.uploadedAt ? moment(log.uploadedAt).format('DD/MM/YYYY HH:mm:ss') : '-';
        const actionHtml = userRole === 'admin'
            ? `<button type="button" onclick="handleDeleteUploadedFile('${log._id}')" class="text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1">
                   <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                   <span>ลบไฟล์และข้อมูล</span>
               </button>`
            : `<span class="text-[11px] text-gray-400">🔒 ดูอย่างเดียว</span>`;

        tr.innerHTML = `
            <td class="px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span class="truncate max-w-[240px]" title="${log.fileName || ''}">${log.fileName || 'Unknown File'}</span>
            </td>
            <td class="px-4 py-3">${modBadge}</td>
            <td class="px-4 py-3 text-center font-bold text-gray-700">${(log.recordCount || 0).toLocaleString()} รายการ</td>
            <td class="px-4 py-3 text-gray-500 font-mono text-[11px]">${dtStr}</td>
            <td class="px-4 py-3 text-center">${actionHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleDeleteUploadedFile = async function(fileId) {
    if (userRole !== 'admin') {
        alert('เฉพาะ Admin เท่านั้นที่สามารถลบไฟล์ได้');
        return;
    }
    const targetLog = uploadLogs.find(l => l._id === fileId);
    if (!targetLog) return;

    if (!confirm(`⚠️ ยืนยันการลบไฟล์ "${targetLog.fileName}" หรือไม่?\n\nข้อมูลจำนวน ${(targetLog.recordCount || 0).toLocaleString()} รายการที่มาจากไฟล์นี้จะถูกลบออกจากฐานข้อมูล MongoDB ทันที!`)) {
        return;
    }

    try {
        const res = await fetch(`/api/db?fileId=${encodeURIComponent(fileId)}&store=${encodeURIComponent(targetLog.store || '')}`, {
            method: 'DELETE',
            headers: { 'x-admin-password': adminPassword }
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
            throw new Error(json.error || `Delete failed (${res.status})`);
        }

        await loadDataFromDB();
        updateNavBadges();
        renderUploadLogsTable();
        setupDateFilters();
        setupTaskDateFilters();
        setupCallWeekFilters();
        setupAbandonedWeekFilters();
        setupFcrWeekFilters();
        switchModuleTab(currentActiveModule);

        alert(`✅ ลบไฟล์ "${targetLog.fileName}" และข้อมูลที่เกี่ยวข้องออกจาก MongoDB เรียบร้อยแล้ว`);
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบไฟล์: ' + err.message);
    }
};

// ─── Cloud MongoDB Helpers (Vercel Serverless API) ────────────
async function saveStoreToCloud(storeName, dataArray) {
    if (!dataArray || !dataArray.length) return;
    const BATCH_SIZE = 400; // Chunk records to stay well below Vercel 4.5MB limit
    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
        const chunk = dataArray.slice(i, i + BATCH_SIZE);
        const res = await fetch('/api/db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPassword
            },
            body: JSON.stringify({ store: storeName, records: chunk })
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `Cloud DB save failed (${res.status})`);
        }
    }
}

async function saveUploadLogToCloud(logDoc) {
    const res = await fetch('/api/db', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
        },
        body: JSON.stringify({ action: 'log_upload', log: logDoc })
    });
    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to save upload log (${res.status})`);
    }
}

async function clearStoreInCloud(storeName) {
    const res = await fetch(`/api/db?store=${encodeURIComponent(storeName)}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
    });
    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Cloud DB clear failed (${res.status})`);
    }
}

async function loadDataFromDB() {
    const res = await fetch('/api/db', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
        updateDbStatusUI(false, json.error || `HTTP ${res.status}`);
        throw new Error(json.error || `ไม่สามารถดึงข้อมูลจาก MongoDB ได้ (${res.status})`);
    }

    updateDbStatusUI(true);
    processedData = json.chatSla || [];
    processedTaskData = filterValidTasks(json.taskSla || []);
    processedCallData = (json.callReport || []).map(d => {
        const m = parseCallDateTime(d.callStartTime || d.callStartDate);
        if (m && m.isValid()) {
            const wInfo = computeMonthWeekInfo(m);
            d.weekKey = wInfo.weekKey;
            d.weekLabel = wInfo.weekLabel;
        }
        return d;
    });
    // เอาเฉพาะ Call Skills / CSQ ที่เป็น Khelps_Expert เท่านั้น
    processedAbandonedData = (json.abandonedCalls || []).filter(d => {
        const sk = String(d.callSkills || d.callRoutedCsq || '').toLowerCase();
        return sk.includes('khelps_expert');
    }).map(d => {
        const m = parseCallDateTime(d.callStartTime || d.callStartDate);
        if (m && m.isValid()) {
            const wInfo = computeMonthWeekInfo(m);
            d.weekKey = wInfo.weekKey;
            d.weekLabel = wInfo.weekLabel;
        }
        return d;
    });
    processedFcrData = (json.fcrCases || []).map(d => {
        const m = parseDateSmart(d.opened || d.openedDate);
        if (m && m.isValid()) {
            const wInfo = computeMonthWeekInfo(m);
            d.weekKey = wInfo.weekKey;
            d.weekLabel = wInfo.weekLabel;
        }
        d.isLeftBase = checkFcrLeftBase(d);
        d.isRightFcr = checkFcrRightTarget(d);
        return d;
    }).filter(d => d.isLeftBase);
    uploadLogs = json.uploadLogs || [];
    enrichAbandonedWithCuic();
}

window.syncFromCloudDB = async function() {
    const btn = document.getElementById('refreshCloudBtn');
    if (btn) btn.classList.add('opacity-50', 'pointer-events-none');
    try {
        await loadDataFromDB();
        updateNavBadges();
        renderUploadLogsTable();
        setupDateFilters();
        setupTaskDateFilters();
        setupCallWeekFilters();
        setupAbandonedWeekFilters();
        setupFcrWeekFilters();
        switchModuleTab(currentActiveModule);
    } catch (e) {
        alert('ไม่สามารถซิงค์ข้อมูลจาก MongoDB ได้: ' + e.message);
    } finally {
        if (btn) btn.classList.remove('opacity-50', 'pointer-events-none');
    }
};

async function clearChatStore() {
    await clearStoreInCloud(storeChat);
}

async function clearTaskStore() {
    await clearStoreInCloud(storeTask);
}

async function clearCallStore() {
    await clearStoreInCloud(storeCall);
}

async function clearAbandonedStore() {
    await clearStoreInCloud(storeAbandoned);
}

async function clearFcrStore() {
    await clearStoreInCloud(storeFcr);
}

async function saveChatDataToDB(dataArray) {
    if (!dataArray || !dataArray.length) return;
    await saveStoreToCloud(storeChat, dataArray);
}

async function saveTaskDataToDB(dataArray) {
    if (!dataArray || !dataArray.length) return;
    await saveStoreToCloud(storeTask, dataArray);
}

async function saveCallDataToDB(dataArray) {
    if (!dataArray || !dataArray.length) return;
    await saveStoreToCloud(storeCall, dataArray);
}

async function saveAbandonedDataToDB(dataArray) {
    if (!dataArray || !dataArray.length) return;
    await saveStoreToCloud(storeAbandoned, dataArray);
}

async function saveFcrDataToDB(dataArray) {
    if (!dataArray || !dataArray.length) return;
    await saveStoreToCloud(storeFcr, dataArray);
}

async function clearAllDB() {
    await clearStoreInCloud('all');
}

// ─── DOM Boot ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // File input name indicator in File Manager Modal
    const fileInput = document.getElementById('reportFiles');
    const fileDisplay = document.getElementById('fileNameDisplay');
    if (fileInput && fileDisplay) {
        fileInput.addEventListener('change', () => {
            const count = fileInput.files.length;
            if (count > 0) {
                const names = Array.from(fileInput.files).map(f => f.name).join(', ');
                fileDisplay.textContent = `เลือกแล้ว ${count} ไฟล์: ${names}`;
            } else {
                fileDisplay.textContent = '';
            }
        });
    }

    // Restore Admin session if previously logged in during this browser session
    const savedPass = sessionStorage.getItem('khelps_admin_pass');
    if (savedPass) {
        try {
            const vRes = await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_admin', password: savedPass })
            });
            if (vRes.ok) {
                userRole = 'admin';
                adminPassword = savedPass;
            } else {
                sessionStorage.removeItem('khelps_admin_pass');
            }
        } catch (e) {
            console.warn('Admin session check failed:', e);
        }
    }
    updateRoleUI();

    // Load online data from MongoDB
    try {
        await loadDataFromDB();
        showDashboard();
    } catch (e) {
        console.error("MongoDB load error:", e);
        showDashboard();
    }

    // Event Listeners for Upload & Controls
    const processBtn = document.getElementById('processBtn');
    if (processBtn) processBtn.addEventListener('click', handleDataProcessing);

    // Clear DB Dropdown & Handlers (Separated per module - Admin Only)
    const clearDropdownBtn = document.getElementById('clearDbDropdownBtn');
    const clearDropdownMenu = document.getElementById('clearDbDropdownMenu');
    if (clearDropdownBtn && clearDropdownMenu) {
        clearDropdownBtn.addEventListener('click', e => {
            e.stopPropagation();
            clearDropdownMenu.classList.toggle('hidden');
            updateNavBadges();
        });

        document.addEventListener('click', e => {
            const container = document.getElementById('clearDbDropdownContainer');
            if (container && !container.contains(e.target)) {
                clearDropdownMenu.classList.add('hidden');
            }
        });
    }

    const clearChatBtn = document.getElementById('clearOnlyChatBtn');
    if (clearChatBtn) clearChatBtn.addEventListener('click', () => {
        if (clearDropdownMenu) clearDropdownMenu.classList.add('hidden');
        handleClearChatData();
    });

    const clearTaskBtn = document.getElementById('clearOnlyTaskBtn');
    if (clearTaskBtn) clearTaskBtn.addEventListener('click', () => {
        if (clearDropdownMenu) clearDropdownMenu.classList.add('hidden');
        handleClearTaskData();
    });

    const clearCallBtn = document.getElementById('clearOnlyCallBtn');
    if (clearCallBtn) clearCallBtn.addEventListener('click', () => {
        if (clearDropdownMenu) clearDropdownMenu.classList.add('hidden');
        handleClearCallData();
    });

    const clearAbandonedBtn = document.getElementById('clearOnlyAbandonedBtn');
    if (clearAbandonedBtn) clearAbandonedBtn.addEventListener('click', () => {
        if (clearDropdownMenu) clearDropdownMenu.classList.add('hidden');
        handleClearAbandonedData();
    });

    const clearFcrBtn = document.getElementById('clearOnlyFcrBtn');
    if (clearFcrBtn) clearFcrBtn.addEventListener('click', () => {
        if (clearDropdownMenu) clearDropdownMenu.classList.add('hidden');
        handleClearFcrData();
    });

    const clearAllBtn = document.getElementById('clearAllDbDropdownBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', () => {
        if (clearDropdownMenu) clearDropdownMenu.classList.add('hidden');
        handleClearAllData();
    });

    const callSearch = document.getElementById('callSearchInput');
    if (callSearch) {
        callSearch.addEventListener('input', () => {
            callTablePage = 1;
            updateCallDashboardView();
        });
    }

    const abSearch = document.getElementById('abandonedSearchInput');
    if (abSearch) {
        abSearch.addEventListener('input', () => {
            updateAbandonedDashboardView();
        });
    }

    const fcrSearch = document.getElementById('fcrSearchInput');
    if (fcrSearch) {
        fcrSearch.addEventListener('input', () => {
            fcrTablePage = 1;
            updateFcrDashboardView();
        });
    }

    // Chat SLA Filter events
    document.getElementById('applyFilterBtn').addEventListener('click', updateDashboardView);
    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"].filter-checkbox-year, input[type="checkbox"].filter-checkbox-month, input[type="checkbox"].filter-checkbox-day').forEach(cb => cb.checked = false);
        selectedAgentNames.clear();
        updateDashboardView();
    });
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Task SLA Filter events
    document.getElementById('applyTaskFilterBtn').addEventListener('click', updateTaskDashboardView);
    document.getElementById('clearTaskFilterBtn').addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"].filter-task-year, input[type="checkbox"].filter-task-month, input[type="checkbox"].filter-task-day').forEach(cb => cb.checked = false);
        selectedTaskGroups.clear();
        taskFilterPriority = 'all';
        taskFilterOutcome = 'all';
        document.getElementById('taskSearchInput').value = '';
        updateTaskFilterPillsUI();
        updateTaskDashboardView();
    });
    document.getElementById('exportTaskCsvBtn').addEventListener('click', exportTaskToCSV);
    
    const taskSearch = document.getElementById('taskSearchInput');
    if (taskSearch) {
        taskSearch.addEventListener('input', () => updateTaskDashboardView());
    }
});

// ─── Module Tab Switching ────────────────────────────────────
function switchModuleTab(moduleName) {
    currentActiveModule = moduleName;

    const tabChat = document.getElementById('tabBtnChatSla');
    const tabTask = document.getElementById('tabBtnTaskSla');
    const tabCall = document.getElementById('tabBtnCallReport');
    const tabAbandoned = document.getElementById('tabBtnAbandoned');
    const tabFcr = document.getElementById('tabBtnFcr');
    const viewChat = document.getElementById('chatSlaModuleView');
    const viewTask = document.getElementById('taskSlaModuleView');
    const viewCall = document.getElementById('callReportModuleView');
    const viewAbandoned = document.getElementById('abandonedModuleView');
    const viewFcr = document.getElementById('fcrModuleView');
    const clearBtnText = document.getElementById('clearDbBtnText');

    [tabChat, tabTask, tabCall, tabAbandoned, tabFcr].forEach(t => t?.classList.remove('active'));
    [viewChat, viewTask, viewCall, viewAbandoned, viewFcr].forEach(v => v?.classList.add('hidden'));

    if (moduleName === 'chatSla') {
        tabChat?.classList.add('active');
        viewChat?.classList.remove('hidden');
        if (clearBtnText) clearBtnText.textContent = 'Clear Chat DB';
        setupDateFilters();
        updateDashboardView();
    } else if (moduleName === 'taskSla') {
        tabTask?.classList.add('active');
        viewTask?.classList.remove('hidden');
        if (clearBtnText) clearBtnText.textContent = 'Clear Task DB';
        setupTaskDateFilters();
        updateTaskDashboardView();
    } else if (moduleName === 'callReport') {
        tabCall?.classList.add('active');
        viewCall?.classList.remove('hidden');
        if (clearBtnText) clearBtnText.textContent = 'Clear Call DB';
        setupCallWeekFilters();
        updateCallDashboardView();
    } else if (moduleName === 'abandonedCall') {
        tabAbandoned?.classList.add('active');
        viewAbandoned?.classList.remove('hidden');
        if (clearBtnText) clearBtnText.textContent = 'Clear Abandoned DB';
        setupAbandonedWeekFilters();
        updateAbandonedDashboardView();
    } else if (moduleName === 'fcr') {
        tabFcr?.classList.add('active');
        viewFcr?.classList.remove('hidden');
        if (clearBtnText) clearBtnText.textContent = 'Clear FCR DB';
        setupFcrWeekFilters();
        updateFcrDashboardView();
    }
}

function updateNavBadges() {
    const chatBadge = document.getElementById('navBadgeChat');
    const taskBadge = document.getElementById('navBadgeTask');
    const callBadge = document.getElementById('navBadgeCall');
    const abBadge = document.getElementById('navBadgeAbandoned');
    const fcrBadge = document.getElementById('navBadgeFcr');
    if (chatBadge) {
        chatBadge.textContent = processedData.length;
        chatBadge.classList.toggle('hidden', processedData.length === 0);
    }
    if (taskBadge) {
        taskBadge.textContent = processedTaskData.length;
        taskBadge.classList.toggle('hidden', processedTaskData.length === 0);
    }
    if (callBadge) {
        callBadge.textContent = processedCallData.length;
        callBadge.classList.toggle('hidden', processedCallData.length === 0);
    }
    if (abBadge) {
        abBadge.textContent = processedAbandonedData.length;
        abBadge.classList.toggle('hidden', processedAbandonedData.length === 0);
    }
    if (fcrBadge) {
        fcrBadge.textContent = processedFcrData.length;
        fcrBadge.classList.toggle('hidden', processedFcrData.length === 0);
    }
    const dropChatBadge = document.getElementById('clearChatCountBadge');
    const dropTaskBadge = document.getElementById('clearTaskCountBadge');
    const dropCallBadge = document.getElementById('clearCallCountBadge');
    const dropAbandonedBadge = document.getElementById('clearAbandonedCountBadge');
    const dropFcrBadge = document.getElementById('clearFcrCountBadge');
    if (dropChatBadge) dropChatBadge.textContent = processedData.length;
    if (dropTaskBadge) dropTaskBadge.textContent = processedTaskData.length;
    if (dropCallBadge) dropCallBadge.textContent = processedCallData.length;
    if (dropAbandonedBadge) dropAbandonedBadge.textContent = processedAbandonedData.length;
    if (dropFcrBadge) dropFcrBadge.textContent = processedFcrData.length;

    const fileBadge = document.getElementById('fileLogCountBadge');
    if (fileBadge) fileBadge.textContent = uploadLogs.length;

    const ring12sCount = processedCallData.filter(c => c.isRing12).length;
    const pill12sCount = document.getElementById('pill12sCount');
    if (pill12sCount) pill12sCount.textContent = ring12sCount;
}

// ─── Separate Clear DB Handlers (Admin Only, Protects other tabs) ─
async function handleClearChatData() {
    if (userRole !== 'admin') return;
    if (!processedData.length) {
        alert('ไม่มีข้อมูล Chat SLA ในระบบ');
        return;
    }
    if (!confirm(`ยืนยันการลบข้อมูล Chat SLA ทั้งหมด (${processedData.length.toLocaleString()} รายการ) ออกจาก MongoDB หรือไม่?\n\n* ข้อมูล Task SLA และ Call Report จะไม่ได้รับผลกระทบ`)) return;

    await clearChatStore();
    await loadDataFromDB();
    selectedAgentNames.clear();
    updateNavBadges();
    renderUploadLogsTable();
    updateDashboardView();
}

async function handleClearTaskData() {
    if (userRole !== 'admin') return;
    if (!processedTaskData.length) {
        alert('ไม่มีข้อมูล Task SLA ในระบบ');
        return;
    }
    if (!confirm(`ยืนยันการลบข้อมูล Task SLA ทั้งหมด (${processedTaskData.length.toLocaleString()} รายการ) ออกจาก MongoDB หรือไม่?\n\n* ข้อมูล Chat SLA และ Call Report จะไม่ได้รับผลกระทบ`)) return;

    await clearTaskStore();
    await loadDataFromDB();
    selectedTaskGroups.clear();
    updateNavBadges();
    renderUploadLogsTable();
    updateTaskDashboardView();
}

async function handleClearCallData() {
    if (userRole !== 'admin') return;
    if (!processedCallData.length) {
        alert('ไม่มีข้อมูล Call Report ในระบบ');
        return;
    }
    if (!confirm(`ยืนยันการลบข้อมูล Call Report ทั้งหมด (${processedCallData.length.toLocaleString()} รายการ) ออกจาก MongoDB หรือไม่?\n\n* ข้อมูล Chat SLA และ Task SLA จะไม่ได้รับผลกระทบ`)) return;

    await clearCallStore();
    await loadDataFromDB();
    selectedCallAgents.clear();
    updateNavBadges();
    renderUploadLogsTable();
    updateCallDashboardView();
}

async function handleClearAbandonedData() {
    if (userRole !== 'admin') return;
    if (!processedAbandonedData.length) {
        alert('ไม่มีข้อมูล Call Back (ABN Call of Ex) ในระบบ');
        return;
    }
    if (!confirm(`ยืนยันการลบข้อมูล Call Back (ABN Call of Ex) ทั้งหมด (${processedAbandonedData.length.toLocaleString()} รายการ) ออกจาก MongoDB หรือไม่?\n\n* ข้อมูลส่วนอื่นจะไม่ได้รับผลกระทบ`)) return;

    await clearAbandonedStore();
    await loadDataFromDB();
    updateNavBadges();
    renderUploadLogsTable();
    setupAbandonedWeekFilters();
    updateAbandonedDashboardView();
}

async function handleClearFcrData() {
    if (userRole !== 'admin') return;
    if (!processedFcrData.length) {
        alert('ไม่มีข้อมูล %FCR (Target>90%) ในระบบ');
        return;
    }
    if (!confirm(`ยืนยันการลบข้อมูล %FCR (Target>90%) ทั้งหมด (${processedFcrData.length.toLocaleString()} รายการ) ออกจาก MongoDB หรือไม่?\n\n* ข้อมูลส่วนอื่นจะไม่ได้รับผลกระทบ`)) return;

    await clearFcrStore();
    await loadDataFromDB();
    updateNavBadges();
    renderUploadLogsTable();
    setupFcrWeekFilters();
    updateFcrDashboardView();
}

async function handleClearAllData() {
    if (userRole !== 'admin') return;
    const total = processedData.length + processedTaskData.length + processedCallData.length + processedAbandonedData.length + processedFcrData.length;
    if (total === 0 && uploadLogs.length === 0) {
        alert('ไม่มีข้อมูลในฐานข้อมูล');
        return;
    }
    if (!confirm(`⚠️ ยืนยันการลบข้อมูลทั้งหมดใน MongoDB?\n- First Response ECE: ${processedData.length.toLocaleString()} รายการ\n- % Within SLA of 16 Apps: ${processedTaskData.length.toLocaleString()} รายการ\n- Call Not Received: ${processedCallData.length.toLocaleString()} รายการ\n- Call Back (ABN Call of Ex): ${processedAbandonedData.length.toLocaleString()} รายการ\n- %FCR (Target>90%): ${processedFcrData.length.toLocaleString()} รายการ\n\nข้อมูลทุกแท็บและประวัติไฟล์ทั้งหมดจะถูกลบ!`)) return;

    await clearAllDB();
    await loadDataFromDB();
    selectedAgentNames.clear();
    selectedTaskGroups.clear();
    selectedCallAgents.clear();
    updateNavBadges();
    renderUploadLogsTable();
    switchModuleTab(currentActiveModule);
}

function showDashboard() {
    updateNavBadges();
    renderUploadLogsTable();

    // Auto-select tab with data
    if (processedCallData.length > 0 && processedData.length === 0 && processedTaskData.length === 0) {
        switchModuleTab('callReport');
    } else if (processedAbandonedData.length > 0 && processedData.length === 0 && processedTaskData.length === 0 && processedCallData.length === 0) {
        switchModuleTab('abandonedCall');
    } else if (processedFcrData.length > 0 && processedData.length === 0 && processedTaskData.length === 0 && processedCallData.length === 0) {
        switchModuleTab('fcr');
    } else if (processedTaskData.length > 0 && processedData.length === 0) {
        switchModuleTab('taskSla');
    } else {
        switchModuleTab('chatSla');
    }
}

// ─── Smart Data Processing (Auto-Detect Files & Log per File) ─
async function handleDataProcessing() {
    await handleDataProcessingFrom(document.getElementById('reportFiles'));
}

async function handleDataProcessingFrom(fileInput) {
    if (userRole !== 'admin') {
        alert('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถนำเข้าไฟล์ได้');
        return;
    }
    if (!fileInput || fileInput.files.length === 0) {
        alert("กรุณาเลือกไฟล์ Excel อย่างน้อย 1 ไฟล์");
        return;
    }
    showLoading(true);
    try {
        const existingChatRemarks = {};
        processedData.forEach(c => { if (c.session_id && c.remark) existingChatRemarks[c.session_id] = c.remark; });

        const existingTaskRemarks = {};
        processedTaskData.forEach(t => { if (t.Task && t.remark) existingTaskRemarks[t.Task] = t.remark; });

        const existingCallRemarks = {};
        processedCallData.forEach(c => { if (c._id && c.remark) existingCallRemarks[c._id] = c.remark; });

        const existingAbandonedRemarks = {};
        processedAbandonedData.forEach(a => { if (a._id && a.remark) existingAbandonedRemarks[a._id] = a.remark; });

        const existingFcrRemarks = {};
        processedFcrData.forEach(f => { if (f._id && f.remark) existingFcrRemarks[f._id] = f.remark; });

        let importedFilesSummary = [];
        let lastImportedModule = null;

        for (const file of fileInput.files) {
            const detected = await detectAndProcessFile(file);
            if (!detected || detected.type === 'unknown' || !detected.data || detected.data.length === 0) {
                continue;
            }

            const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            let storeName = '';
            let moduleLabel = '';

            if (detected.type === 'chat') {
                storeName = storeChat;
                moduleLabel = 'First Response ECE( ≥95 %)';
                lastImportedModule = 'chatSla';
                detected.data.forEach(rec => {
                    rec._fileId = fileId;
                    rec._fileName = file.name;
                    if (existingChatRemarks[rec.session_id] && !rec.remark) {
                        rec.remark = existingChatRemarks[rec.session_id];
                    }
                });
            } else if (detected.type === 'task') {
                storeName = storeTask;
                moduleLabel = '% Within SLA of 16 Apps';
                lastImportedModule = 'taskSla';
                detected.data.forEach(rec => {
                    rec._fileId = fileId;
                    rec._fileName = file.name;
                    if (existingTaskRemarks[rec.Task] && !rec.remark) {
                        rec.remark = existingTaskRemarks[rec.Task];
                    }
                });
            } else if (detected.type === 'call') {
                storeName = storeCall;
                moduleLabel = 'Call Not Received (Within 12 Secs)';
                lastImportedModule = 'callReport';
                detected.data.forEach(rec => {
                    rec._fileId = fileId;
                    rec._fileName = file.name;
                    if (existingCallRemarks[rec._id] && !rec.remark) {
                        rec.remark = existingCallRemarks[rec._id];
                    }
                });
            } else if (detected.type === 'abandoned') {
                storeName = storeAbandoned;
                moduleLabel = 'Call Back (ABN Call of Ex)';
                lastImportedModule = 'abandonedCall';
                detected.data.forEach(rec => {
                    rec._fileId = fileId;
                    rec._fileName = file.name;
                    if (existingAbandonedRemarks[rec._id] && !rec.remark) {
                        rec.remark = existingAbandonedRemarks[rec._id];
                    }
                });
            } else if (detected.type === 'fcr') {
                storeName = storeFcr;
                moduleLabel = '%FCR (Target>90%)';
                lastImportedModule = 'fcr';
                detected.data.forEach(rec => {
                    rec._fileId = fileId;
                    rec._fileName = file.name;
                    if (existingFcrRemarks[rec._id] && !rec.remark) {
                        rec.remark = existingFcrRemarks[rec._id];
                    }
                });
            }

            // 1. Save tagged records to MongoDB
            await saveStoreToCloud(storeName, detected.data);

            // 2. Save file import log entry to MongoDB
            await saveUploadLogToCloud({
                _id: fileId,
                fileName: file.name,
                moduleType: detected.type,
                moduleLabel: moduleLabel,
                store: storeName,
                recordCount: detected.data.length,
                uploadedAt: new Date().toISOString()
            });

            importedFilesSummary.push(`📄 ${file.name} (${moduleLabel}: ${detected.data.length.toLocaleString()} รายการ)`);
        }

        await loadDataFromDB();
        updateNavBadges();
        renderUploadLogsTable();

        // Reset file input
        fileInput.value = '';
        const fileDisplay = document.getElementById('fileNameDisplay');
        if (fileDisplay) fileDisplay.textContent = '';

        if (importedFilesSummary.length > 0) {
            if (lastImportedModule) {
                switchModuleTab(lastImportedModule);
            } else {
                switchModuleTab(currentActiveModule);
            }
            alert(`✅ อัปโหลดเข้าฐานข้อมูล MongoDB สำเร็จ!\n\n${importedFilesSummary.join('\n')}`);
        } else {
            alert("ไม่พบข้อมูลที่ตรงกับรูปแบบของ Chat SLA, Task SLA, Call Report หรือ Abandoned Call (Khelps_Expert) ในไฟล์ที่เลือก");
        }
    } catch(err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์: " + err.message);
    }
    showLoading(false);
}

function showLoading(on) {
    const loader = document.getElementById('loadingIndicator');
    const btn    = document.getElementById('processBtn');
    if (!loader || !btn) return;
    loader.classList.toggle('hidden', !on);
    btn.disabled = on;
    btn.classList.toggle('opacity-50', on);
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true }));
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function parseDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const t = String(timeStr).replace(/:(d{3})$/, '.$1');
    return moment(`${dateStr} ${t}`, 'YYYY-MM-DD HH:mm:ss.SSS');
}

// Robust date parser for ServiceNow & Excel (handles DD-MM-YYYY, DD/MM/YYYY, ISO, and JS Date objects)
function parseDateSmart(val) {
    if (!val) return null;
    if (val instanceof Date) {
        return moment(val);
    }
    const str = String(val).trim();
    const formats = [
        'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD',
        'DD-MM-YYYY HH:mm:ss', 'D-M-YYYY HH:mm:ss',
        'DD-MM-YYYY HH:mm',    'D-M-YYYY HH:mm',
        'DD-MM-YYYY',          'D-M-YYYY',
        'DD/MM/YYYY HH:mm:ss', 'D/M/YYYY HH:mm:ss',
        'DD/MM/YYYY HH:mm',    'D/M/YYYY HH:mm',
        'DD/MM/YYYY',          'D/M/YYYY'
    ];
    let m = moment(str, formats, true);
    if (!m.isValid()) {
        m = moment(str);
    }
    return m;
}

// Inspect headers and dispatch to corresponding parser
async function detectAndProcessFile(file) {
    const wb = await readExcelFile(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    let rawData = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss' });

    if (rawData && rawData.length > 0) {
        const firstKeys = Object.keys(rawData[0]);
        if (firstKeys.some(k => k.startsWith('__EMPTY'))) {
            rawData = XLSX.utils.sheet_to_json(ws, { range: 1, defval: "", raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss' });
        }
    }

    if (!rawData || rawData.length === 0) return { type: 'unknown', data: [] };

    const firstRow = rawData[0];
    const headers = Object.keys(firstRow);

    // Check if it's Abandoned Call Detail Activity Report
    const hasAbandonTime = headers.some(h => h.includes('Call Abandon Time') || h.includes('Time to Abandoned'));
    const hasCallSkills = headers.some(h => h.includes('Call Skills') || h.includes('Call Routed CSQ') || h.includes('Call ANI'));

    if (hasAbandonTime && hasCallSkills) {
        const abandonedData = parseAbandonedReportRows(rawData);
        return { type: 'abandoned', data: abandonedData };
    }

    // Check if it's Call Report (CUIC)
    const hasCallSession = headers.some(h => h.includes('Node ID') || h.includes('Session ID'));
    const hasRingTime = headers.some(h => h.includes('Ring Time') || h.includes('Ring'));
    const hasAgent = headers.some(h => h.includes('Agent Name') || h.includes('CSQ'));

    if (hasCallSession && (hasRingTime || hasAgent)) {
        const callData = parseCallReportRows(rawData);
        return { type: 'call', data: callData };
    }

    // Check if it's %FCR Incident file (Number, Channel, Service, Category, State)
    const hasIncNumber = headers.some(h => h.trim() === 'Number');
    const hasChannel = headers.some(h => h.trim() === 'Channel');
    const hasServiceAndCategory = headers.some(h => h.trim() === 'Service') && headers.some(h => h.trim() === 'Category');

    if (hasIncNumber && hasChannel && hasServiceAndCategory) {
        const fcrData = parseFcrRows(rawData);
        return { type: 'fcr', data: fcrData };
    }

    // Check if it's Task SLA ServiceNow file
    const hasTask = headers.some(h => h.trim() === 'Task');
    const hasElapsed = headers.some(h => h.includes('Business elapsed') || h.includes('Assignment group'));

    if (hasTask && hasElapsed) {
        const taskData = parseTaskSlaRows(rawData);
        return { type: 'task', data: taskData };
    }

    // Check if it's Chat SLA (LINE / K4W report)
    const hasSession = headers.some(h => h.trim() === 'session_id');
    const hasChatElements = headers.some(h => h.includes('agent') || h.includes('message') || h.includes('source'));

    if (hasSession && hasChatElements) {
        const chatData = parseChatSlaRows(rawData);
        return { type: 'chat', data: chatData };
    }

    return { type: 'unknown', data: [] };
}

// ─── Operating Hours Schedule (08:30 - 20:00) ───────────────
// Pauses counting after 20:00 and resumes at 08:30 next morning
function calculateBusinessMinutes(startMoment, endMoment) {
    if (!startMoment || !endMoment || endMoment.isSameOrBefore(startMoment)) {
        return 0;
    }

    let totalSeconds = 0;
    let cur = startMoment.clone();

    // Iterate through days
    while (cur.format('YYYY-MM-DD') < endMoment.format('YYYY-MM-DD')) {
        const dayStr = cur.format('YYYY-MM-DD');
        const wStart = moment(`${dayStr} 08:30:00`, 'YYYY-MM-DD HH:mm:ss');
        const wEnd   = moment(`${dayStr} 20:00:00`, 'YYYY-MM-DD HH:mm:ss');

        const effectiveStart = moment.max(cur, wStart);
        if (effectiveStart.isBefore(wEnd)) {
            totalSeconds += Math.max(0, wEnd.diff(effectiveStart, 'seconds'));
        }

        // Move to start of next day
        cur = moment(`${dayStr} 00:00:00`, 'YYYY-MM-DD HH:mm:ss').add(1, 'days');
    }

    // Final day (same day as endMoment)
    const finalDayStr = endMoment.format('YYYY-MM-DD');
    const wStart = moment(`${finalDayStr} 08:30:00`, 'YYYY-MM-DD HH:mm:ss');
    const wEnd   = moment(`${finalDayStr} 20:00:00`, 'YYYY-MM-DD HH:mm:ss');

    const effectiveStart = moment.max(cur, wStart);
    const effectiveEnd   = moment.min(endMoment, wEnd);

    if (effectiveStart.isBefore(effectiveEnd)) {
        totalSeconds += Math.max(0, effectiveEnd.diff(effectiveStart, 'seconds'));
    }

    return totalSeconds / 60.0;
}

// ─── MODULE 1: Chat SLA Parser ──────────────────────────────
function parseChatSlaRows(rawData) {
    const sessions = {};
    rawData.forEach(row => {
        const sid = row['session_id'];
        if (!sid) return;
        if (!sessions[sid]) sessions[sid] = [];
        sessions[sid].push(row);
    });

    const results = [];
    const targetMsg = "กรุณารอสักครู่ เจ้าหน้าที่ (K-Helps) จะมาดูแลนะคะ";

    Object.keys(sessions).forEach(sid => {
        const rows = sessions[sid].sort((a, b) => {
            const ta = parseDateTime(a.date, a.time);
            const tb = parseDateTime(b.date, b.time);
            return (!ta || !tb) ? 0 : ta.valueOf() - tb.valueOf();
        });

        let waitStart = null, waitRow = null;

        rows.forEach(row => {
            const msg     = String(row.message_text || "");
            const isBot   = String(row.source).toLowerCase() === 'bot';
            const isIT    = String(row.agent_skill).toUpperCase() === 'IT';
            const isAgent = String(row.source).toLowerCase() === 'agent' || !!row.agent_name;

            if (isBot && isIT && msg.includes(targetMsg)) {
                waitStart = parseDateTime(row.date, row.time);
                waitRow   = row;
            } else if (waitStart && isAgent) {
                const aName = (row.agent_name || "").toString().trim();
                if (aName && validAgents.has(aName.toLowerCase())) {
                    const agentTime = parseDateTime(row.date, row.time);
                    if (agentTime) {
                        // Apply business operating hours: pauses 20:00 - 08:30
                        const diffMins = calculateBusinessMinutes(waitStart, agentTime);
                        const lastRow   = rows[rows.length - 1];
                        const chatEnd   = parseDateTime(lastRow.date, lastRow.time);
                        results.push({
                            session_id: sid,
                            date: row.date,
                            startTimeStr: waitRow.time,
                            agentTimeStr: row.time,
                            agentName: aName,
                            responseTime: diffMins,
                            isBreach: diffMins > 8,
                            startMoment: waitStart.toISOString(),
                            endMoment: agentTime.toISOString(),
                            chatEndMoment: chatEnd ? chatEnd.toISOString() : agentTime.toISOString()
                        });
                        waitStart = null; waitRow = null;
                    }
                }
            }
        });
    });
    return results;
}

// ─── MODULE 2: Task SLA Parser ──────────────────────────────
function parseTaskSlaRows(rawData) {
    const results = [];
    const seenTasks = new Set();

    rawData.forEach((row, idx) => {
        const taskNum = String(row['Task'] || '').trim();
        if (!taskNum) return;

        // เงื่อนไข 2: Colum Additional Services เอาแค่ข้อมูล Blanks มาคิดถ้ามี Status อื่นตัดออก
        const addServices = String(row['Additional Services'] || '').trim().toLowerCase();
        if (addServices !== '' && addServices !== 'nan' && addServices !== 'null' && addServices !== 'undefined' && addServices !== '(blanks)' && addServices !== 'blank') {
            return;
        }

        // เงื่อนไข 3: Colum Assigned to ตัด KBANK - Business User KBANK - Business User ออก
        const assignedTo = String(row['Assigned to'] || '').trim();
        if (assignedTo === 'KBANK - Business User KBANK - Business User' || assignedTo.toLowerCase() === 'kbank - business user kbank - business user') {
            return;
        }

        // เงื่อนไข 1: ข้อมูลใน Colum Task ถ้าซ้ำกันตัดออกให้เหลือเลขเดียว
        if (seenTasks.has(taskNum)) return;
        seenTasks.add(taskNum);

        const uniqueId = taskNum;
        const priorityStr = String(row['Priority'] || '3 - Moderate').trim();
        let elapsedPct = parseFloat(row['Business elapsed percentage']) || 0;
        let elapsedSec = parseInt(row['Business elapsed time']) || 0;
        const timeRemaining = parseInt(row['Business time left']) || 0;

        // Fallback: If Business elapsed time is 0/missing, calculate from Start/Stop with 08:30 - 20:00 schedule
        if (elapsedSec === 0) {
            const startRaw = row['Start time'] || row['Opened'];
            const stopRaw = row['Stop time'];
            if (startRaw && stopRaw) {
                const mStart = parseDateSmart(startRaw);
                const mStop = parseDateSmart(stopRaw);
                if (mStart && mStart.isValid() && mStop && mStop.isValid()) {
                    elapsedSec = Math.round(calculateBusinessMinutes(mStart, mStop) * 60);
                }
            }
        }

        // SLA Target Calculation:
        // Priority 1: 2 hrs = 7,200s
        // Priority 2: 4 hrs = 14,400s
        // Priority 3: 8 hrs = 28,800s
        // Default / Others: 28,800s (8 hrs)
        let targetSec = 28800;
        let priorityCode = '3';
        if (priorityStr.startsWith('1') || priorityStr.toLowerCase().includes('critical')) {
            targetSec = 7200;
            priorityCode = '1';
        } else if (priorityStr.startsWith('2') || priorityStr.toLowerCase().includes('high')) {
            targetSec = 14400;
            priorityCode = '2';
        } else if (priorityStr.startsWith('3') || priorityStr.toLowerCase().includes('moderate')) {
            targetSec = 28800;
            priorityCode = '3';
        } else if (priorityStr.startsWith('4') || priorityStr.toLowerCase().includes('low')) {
            targetSec = 28800;
            priorityCode = '4';
        }

        // Breach Criterion: Percentage > 100% OR elapsed time > target seconds
        const isBreach = (elapsedPct > 100.0) || (elapsedSec > targetSec);

        // Parse Opened Date / Time
        let openedDate = '';
        let openedTime = '';
        const openedRaw = row['Opened'];
        if (openedRaw) {
            const mOpened = parseDateSmart(openedRaw);
            if (mOpened && mOpened.isValid()) {
                openedDate = mOpened.format('YYYY-MM-DD');
                openedTime = mOpened.format('HH:mm:ss');
            }
        }

        results.push({
            _id: uniqueId,
            Task: taskNum,
            AssignmentGroup: String(row['Assignment group'] || 'Unassigned').trim(),
            AssignedTo: String(row['Assigned to'] || 'Unassigned').trim(),
            Priority: priorityStr,
            PriorityCode: priorityCode,
            ApplicationID: String(row['Application ID'] || '').trim(),
            ApplicationAcronym: String(row['Application Acronym'] || '').trim(),
            Stage: String(row['Stage'] || 'Completed').trim(),
            ElapsedPercentage: elapsedPct,
            ElapsedTimeSec: elapsedSec,
            TimeLeftSec: timeRemaining,
            SlaTargetSec: targetSec,
            isBreach: isBreach,
            OpenedDate: openedDate,
            OpenedTime: openedTime,
            ShortDescription: String(row['Short description'] || '').trim(),
            Description: String(row['Description'] || '').trim(),
            AdditionalServices: String(row['Additional Services'] || '').trim()
        });
    });

    return results;
}

// ─── MODULE 3: Call Report (CUIC) Parser ────────────────────
function parseDurationToSeconds(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') {
        if (val > 0 && val < 1) {
            return Math.round(val * 86400);
        }
        return Math.round(val);
    }
    if (val instanceof Date) {
        return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds();
    }
    const str = String(val).trim();
    if (!str) return 0;
    const parts = str.split(':').map(p => parseFloat(p) || 0);
    if (parts.length === 3) {
        return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    } else if (parts.length === 2) {
        return Math.round(parts[0] * 60 + parts[1]);
    } else if (parts.length === 1 && !isNaN(parts[0])) {
        return Math.round(parts[0]);
    }
    return 0;
}

function formatSecondsToHMS(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return '0:00:00';
    const s = Math.max(0, Math.round(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remSec = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
}

function parseCallDateTime(val) {
    if (!val) return null;
    if (val instanceof Date) return moment(val);
    const str = String(val).trim();
    const formats = [
        'M/D/YY h:mm:ss A', 'M/D/YYYY h:mm:ss A',
        'M/D/YY h:mm A',    'M/D/YYYY h:mm A',
        'M/D/YY HH:mm:ss',  'M/D/YYYY HH:mm:ss',
        'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD',
        'DD/MM/YYYY HH:mm:ss', 'DD-MM-YYYY HH:mm:ss',
        'MM/DD/YYYY HH:mm:ss'
    ];
    let m = moment(str, formats, true);
    if (!m.isValid()) m = moment(str);
    return m.isValid() ? m : null;
}

// คำนวณสัปดาห์ของเดือน เช่น สัปดาห์ที่ 1 (1/10/26 - 04/10/26)
function computeMonthWeekInfo(startMoment) {
    const monthStart = startMoment.clone().startOf('month');
    const monthEnd   = startMoment.clone().endOf('month');
    const isoStart   = startMoment.clone().startOf('isoWeek');
    const isoEnd     = startMoment.clone().endOf('isoWeek');

    const clampedStart = moment.max(isoStart, monthStart);
    const clampedEnd   = moment.min(isoEnd, monthEnd);

    const weekOfMonth = Math.ceil((startMoment.date() + monthStart.isoWeekday() - 1) / 7);
    const weekKey = `${startMoment.format('YYYY-MM')}-W${weekOfMonth}`;

    const startStr = clampedStart.date() === 1
        ? clampedStart.format('D/MM/YY')
        : clampedStart.format('DD/MM/YY');
    const endStr = clampedEnd.format('DD/MM/YY');
    const weekLabel = `สัปดาห์ที่ ${weekOfMonth} (${startStr} - ${endStr})`;

    return { weekOfMonth, weekKey, weekLabel };
}

function parseCallReportRows(rawData) {
    const list = [];
    const keyOccurrences = {};
    rawData.forEach(r => {
        const sessionId = String(r['Node ID - Session ID - Sequence No'] || r['Session ID'] || '').trim();
        // Ignore header/footer/summary rows (CUIC records start with "1-")
        if (!sessionId || !sessionId.startsWith('1-')) {
            return;
        }

        const agentName = String(r['Agent Name'] || '').trim() || 'Unknown Agent';
        const startRaw = r['Call Start Time'];
        const endRaw = r['Call End Time'];
        const startMoment = parseCallDateTime(startRaw);
        const endMoment = parseCallDateTime(endRaw);

        if (!startMoment || !startMoment.isValid()) {
            return;
        }

        const ringRaw = r['Ring Time'];
        const ringSec = parseDurationToSeconds(ringRaw);
        const ringStr = String(ringRaw).trim();
        const isRing12 = (ringSec >= 12) || ringStr === '0:00:12' || ringStr === '00:00:12' || ringStr === '12';

        const queueSec = parseDurationToSeconds(r['Queue Time']);
        const talkSec  = parseDurationToSeconds(r['Talk Time']);
        const workSec  = parseDurationToSeconds(r['Work Time']);

        const { weekKey, weekLabel } = computeMonthWeekInfo(startMoment);

        // Unique ID per leg to prevent Cisco multi-leg calls (e.g. RNA -> Transfer) from overwriting each other
        const agentSlug = agentName.replace(/\s+/g, '_');
        const baseKey = `${sessionId}_${agentSlug}_${ringSec}_${talkSec}`;
        const occ = (keyOccurrences[baseKey] = (keyOccurrences[baseKey] || 0) + 1);
        const uniqueCallId = occ > 1 ? `${baseKey}_${occ}` : baseKey;

        list.push({
            _id: uniqueCallId,
            sessionId: sessionId,
            callStartTime: startMoment.format('YYYY-MM-DD HH:mm:ss'),
            callStartDate: startMoment.format('YYYY-MM-DD'),
            callStartTimeOnly: startMoment.format('HH:mm:ss'),
            callEndTime: endMoment ? endMoment.format('YYYY-MM-DD HH:mm:ss') : '',
            contactDisposition: String(r['Contact Disposition'] || '').trim(),
            callingNumber: String(r['Originator DN (Calling Number)'] || '').trim(),
            destinationDn: String(r['Destination DN'] || '').trim(),
            calledNumber: String(r['Called Number'] || '').trim(),
            applicationName: String(r['Application Name'] || '').trim(),
            csqNames: String(r['CSQ Names'] || '').trim(),
            agentName: agentName,
            ringTimeSec: ringSec,
            ringTimeFormatted: formatSecondsToHMS(ringSec),
            isRing12: isRing12,
            queueTimeSec: queueSec,
            queueTimeFormatted: formatSecondsToHMS(queueSec),
            talkTimeSec: talkSec,
            talkTimeFormatted: formatSecondsToHMS(talkSec),
            workTimeSec: workSec,
            workTimeFormatted: formatSecondsToHMS(workSec),
            weekKey: weekKey,
            weekLabel: weekLabel,
            year: startMoment.year(),
            month: startMoment.format('MM'),
            day: startMoment.format('DD')
        });
    });
    return list;
}

function parseAbandonedReportRows(rawData) {
    const list = [];
    const keyOccurrences = {};
    rawData.forEach(r => {
        const agentName = String(r['Agent Name'] || '').trim();
        // Skip summary or footer lines
        if (!agentName || agentName.startsWith('Generated on') || agentName.startsWith('Filter Interval')) {
            return;
        }

        const startRaw = r['Call Start Time'];
        const abandonRaw = r['Call Abandon Time'];
        const startMoment = parseCallDateTime(startRaw);
        const abandonMoment = parseCallDateTime(abandonRaw);

        if (!startMoment || !startMoment.isValid()) {
            return;
        }

        const callAni = String(r['Call ANI'] || '').trim();
        const callRoutedCsq = String(r['Call Routed CSQ'] || '').trim();
        const callSkills = String(r['Call Skills'] || callRoutedCsq || '').trim();

        // กรองเอาเฉพาะ Call Skills / CSQ ที่เป็น Khelps_Expert อย่างเดียว
        if (!callSkills.toLowerCase().includes('khelps_expert') && !callRoutedCsq.toLowerCase().includes('khelps_expert')) {
            return;
        }

        const calledNumber = String(r['Called Number'] || '').trim();
        const timeToAbandonSec = parseDurationToSeconds(r['Average Time to Abandoned']);
        const timeToAbandonFormatted = formatSecondsToHMS(timeToAbandonSec);

        const { weekKey, weekLabel } = computeMonthWeekInfo(startMoment);

        const skillSlug = callSkills.replace(/\s+/g, '_');
        const baseKey = `ab_${startMoment.format('YYYYMMDD_HHmmss')}_${callAni}_${skillSlug}`;
        const occ = (keyOccurrences[baseKey] = (keyOccurrences[baseKey] || 0) + 1);
        const uniqueId = occ > 1 ? `${baseKey}_${occ}` : baseKey;

        list.push({
            _id: uniqueId,
            agentName: agentName,
            timeToAbandonSec: timeToAbandonSec,
            timeToAbandonFormatted: timeToAbandonFormatted,
            callStartTime: startMoment.format('YYYY-MM-DD HH:mm:ss'),
            callStartDate: startMoment.format('YYYY-MM-DD'),
            callStartTimeOnly: startMoment.format('HH:mm:ss'),
            callAbandonTime: abandonMoment ? abandonMoment.format('YYYY-MM-DD HH:mm:ss') : '',
            callAbandonTimeOnly: abandonMoment ? abandonMoment.format('HH:mm:ss') : '',
            callAni: callAni,
            callRoutedCsq: callRoutedCsq,
            callSkills: callSkills,
            calledNumber: calledNumber,
            weekKey: weekKey,
            weekLabel: weekLabel,
            year: startMoment.year(),
            month: startMoment.format('MM'),
            day: startMoment.format('DD'),
            remark: ''
        });
    });
    return list;
}

function enrichAbandonedWithCuic() {
    processedCallData.forEach(c => {
        const dispStr = String(c.contactDisposition || '').trim();
        c.isCuicAbandoned = (dispStr === '1' || dispStr === '1.0');
        c.isMatchedAbandonedReport = false;
        c.abandonedCallSkills = '';
        c.timeToAbandonFormatted = '';
    });

    processedAbandonedData.forEach(ab => {
        // 1. Exact match by Call Start Time + Calling Number (ANI)
        let match = processedCallData.find(c =>
            c.callStartTime === ab.callStartTime && c.callingNumber === ab.callAni
        );
        // 2. Match by Call End Time == Call Abandon Time + Calling Number
        if (!match && ab.callAbandonTime) {
            match = processedCallData.find(c =>
                c.callEndTime === ab.callAbandonTime && c.callingNumber === ab.callAni
            );
        }
        // 3. Match by Call Start Time + Agent Name
        if (!match) {
            match = processedCallData.find(c =>
                c.callStartTime === ab.callStartTime &&
                (ab.agentName.toLowerCase().includes(c.agentName.toLowerCase()) ||
                 c.agentName.toLowerCase().includes(ab.agentName.toLowerCase()))
            );
        }
        // 4. Near-time match (within ±15 seconds) on same date & same ANI
        if (!match && ab.callAni) {
            const abStartM = moment(ab.callStartTime, 'YYYY-MM-DD HH:mm:ss');
            match = processedCallData.find(c => {
                if (c.callStartDate !== ab.callStartDate || c.callingNumber !== ab.callAni) return false;
                const cStartM = moment(c.callStartTime, 'YYYY-MM-DD HH:mm:ss');
                return Math.abs(cStartM.diff(abStartM, 'seconds')) <= 15;
            });
        }

        if (match) {
            ab.isMatchedCuic = true;
            ab.cuicSessionId = match.sessionId;
            ab.cuicRecordId = match._id;
            ab.cuicAgentName = match.agentName;
            ab.cuicCsqNames = match.csqNames;
            ab.cuicQueueTimeSec = match.queueTimeSec;
            ab.cuicQueueTimeFormatted = match.queueTimeFormatted;
            ab.cuicRingTimeSec = match.ringTimeSec;
            ab.cuicRingTimeFormatted = match.ringTimeFormatted;
            ab.cuicTalkTimeFormatted = match.talkTimeFormatted;
            ab.cuicDisposition = match.contactDisposition;

            match.isMatchedAbandonedReport = true;
            match.abandonedCallSkills = ab.callSkills;
            match.timeToAbandonFormatted = ab.timeToAbandonFormatted;
        } else {
            ab.isMatchedCuic = false;
            ab.cuicSessionId = '';
            ab.cuicRecordId = '';
            ab.cuicAgentName = '';
            ab.cuicCsqNames = '';
            ab.cuicQueueTimeSec = null;
            ab.cuicQueueTimeFormatted = '-';
            ab.cuicRingTimeSec = null;
            ab.cuicRingTimeFormatted = '-';
            ab.cuicTalkTimeFormatted = '-';
            ab.cuicDisposition = '';
        }
    });
}

// ─── MODULE 1: Chat SLA UI & Logic ──────────────────────────
function setupDateFilters() {
    if (!processedData.length) return;
    const years = new Set(), months = new Set(), days = new Set();
    processedData.forEach(d => {
        if (!d.date) return;
        const p = d.date.split('-');
        if (p.length === 3) { years.add(p[0]); months.add(p[1]); days.add(p[2]); }
    });
    const allMonths = Array.from({length:12}, (_,i) => String(i+1).padStart(2,'0'));
    const allDays   = Array.from({length:31}, (_,i) => String(i+1).padStart(2,'0'));
    populateCheckboxGroup('yearCheckboxes',  Array.from(years).sort(), 'year',  years);
    populateCheckboxGroup('monthCheckboxes', allMonths, 'month', months);
    populateCheckboxGroup('dayCheckboxes',   allDays,   'day',   days);
}

function populateCheckboxGroup(containerId, values, prefix, activeSet) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const existingChecked = Array.from(container.querySelectorAll('input:checked')).map(c => c.value);
    const hasExisting = container.querySelectorAll('input').length > 0;
    container.innerHTML = '';
    values.forEach(val => {
        const isChecked = hasExisting ? existingChecked.includes(val) : activeSet.has(val);
        const lbl = document.createElement('label');
        lbl.className = 'cursor-pointer select-none';
        lbl.innerHTML = `<input type="checkbox" value="${val}" class="filter-checkbox-${prefix} sr-only" ${isChecked ? 'checked' : ''}><span class="filter-label">${val}</span>`;
        lbl.querySelector('input').addEventListener('change', updateDashboardView);
        container.appendChild(lbl);
    });
}

function selectAllInGroup(prefix) {
    const cbs = document.querySelectorAll(`.filter-checkbox-${prefix}`);
    const allChecked = Array.from(cbs).every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
    updateDashboardView();
}

function updateDashboardView() {
    const getChecked = prefix => Array.from(document.querySelectorAll(`.filter-checkbox-${prefix}:checked`)).map(cb => cb.value);
    const selYears   = getChecked('year');
    const selMonths  = getChecked('month');
    const selDays    = getChecked('day');

    let filtered = processedData;
    if (selYears.length || selMonths.length || selDays.length) {
        filtered = filtered.filter(d => {
            if (!d.date) return false;
            const p = d.date.split('-');
            if (p.length !== 3) return false;
            return (!selYears.length  || selYears.includes(p[0]))
                && (!selMonths.length || selMonths.includes(p[1]))
                && (!selDays.length   || selDays.includes(p[2]));
        });
    }
    const dateFiltered = filtered;
    renderAgentSidebar(dateFiltered);

    if (selectedAgentNames.size > 0) {
        filtered = dateFiltered.filter(d => selectedAgentNames.has(d.agentName));
        const btn = document.getElementById('clearAgentFilterBtn');
        if (btn) btn.classList.remove('hidden');
    }

    // KPI
    const total    = filtered.length;
    const breaches = filtered.filter(d => d.isBreach);
    const inSla    = total - breaches.length;
    const slaRate  = total > 0 ? ((inSla / total) * 100) : 0;
    const avgTime  = total > 0 ? (filtered.reduce((s, d) => s + d.responseTime, 0) / total) : 0;

    animateNumber('totalChatsCard', total);
    animateNumber('inSlaCard',      inSla);
    animateNumber('outSlaCard',     breaches.length);
    document.getElementById('slaPercentCard').textContent = `${slaRate.toFixed(2)}%`;
    document.getElementById('avgTimeCard').textContent    = `${avgTime.toFixed(2)} m`;

    const setBar = (id, pct) => { const el = document.getElementById(id); if(el) el.style.width = pct + '%'; };
    setBar('slaMetBar',   total > 0 ? (inSla / total * 100) : 0);
    setBar('breachBar',   total > 0 ? (breaches.length / total * 100) : 0);
    setBar('slaRateBar',  slaRate);

    const bc = document.getElementById('breachCountBadge');
    if (bc) bc.textContent = breaches.length > 0 ? `${breaches.length} over SLA` : 'All within SLA ✓';

    renderBreachTable(breaches);
    renderDailyChart(filtered);
    renderHourlyChart(filtered);
}

function renderAgentSidebar(data) {
    const container = document.getElementById('agentSummaryTableBody');
    const empty     = document.getElementById('emptyAgentTableState');
    const badge     = document.getElementById('agentCountBadge');
    if (!container) return;
    container.innerHTML = '';

    const stats = {};
    data.forEach(d => {
        if (!stats[d.agentName]) stats[d.agentName] = { total: 0, breaches: 0 };
        stats[d.agentName].total++;
        if (d.isBreach) stats[d.agentName].breaches++;
    });

    const agents = Object.keys(stats).sort((a, b) => stats[b].breaches - stats[a].breaches);
    if (badge) badge.textContent = agents.length;

    if (agents.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    agents.forEach(name => {
        const s      = stats[name];
        const slaPct = s.total > 0 ? ((s.total - s.breaches) / s.total * 100).toFixed(0) : 0;
        const isSelected = selectedAgentNames.has(name);
        const badgeClass = slaPct >= 95 ? 'good' : slaPct >= 80 ? 'warn' : 'bad';

        const row = document.createElement('div');
        row.className = `agent-row ${isSelected ? 'selected' : ''}`;
        row.onclick = () => {
            if (selectedAgentNames.has(name)) { selectedAgentNames.delete(name); }
            else                              { selectedAgentNames.add(name); }
            const btn = document.getElementById('clearAgentFilterBtn');
            if (btn) btn.classList.toggle('hidden', selectedAgentNames.size === 0);
            updateDashboardView();
        };
        row.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-3.5 h-3.5 rounded-sm border ${isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'} shrink-0 flex items-center justify-center">
                        ${isSelected ? '<svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                    </div>
                    <span class="text-xs font-medium text-gray-700 truncate" title="${name}">${name}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[10px] text-gray-400">${s.total}</span>
                    <span class="sla-badge ${badgeClass}">${slaPct}%</span>
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

window.selectAllAgents = function() {
    const container = document.getElementById('agentSummaryTableBody');
    const rows = container.querySelectorAll('.agent-row');
    const names = Array.from(rows).map(r => r.querySelector('span.truncate')?.title || '').filter(Boolean);
    const allSelected = names.every(n => selectedAgentNames.has(n));
    if (allSelected) { selectedAgentNames.clear(); }
    else             { names.forEach(n => selectedAgentNames.add(n)); }
    const btn = document.getElementById('clearAgentFilterBtn');
    if (btn) btn.classList.toggle('hidden', selectedAgentNames.size === 0);
    updateDashboardView();
};

const BRAND_GREEN = '#00a950';
const BRAND_RED   = '#ef4444';
const BRAND_BLUE  = '#3b82f6';

function renderDailyChart(data) {
    const dateStats = {};
    data.forEach(d => {
        if (!dateStats[d.date]) dateStats[d.date] = { met: 0, breach: 0 };
        if (d.isBreach) dateStats[d.date].breach++;
        else            dateStats[d.date].met++;
    });
    const labels   = Object.keys(dateStats).sort();
    const metData  = labels.map(l => dateStats[l].met);
    const brData   = labels.map(l => dateStats[l].breach);

    const chartEl = document.getElementById('dailyTrendChart');
    if (!chartEl) return;
    if (chartInstances['daily']) { chartInstances['daily'].destroy(); }

    chartInstances['daily'] = new ApexCharts(chartEl, {
        series: [
            { name: 'Within SLA', data: metData },
            { name: 'Over SLA',   data: brData  }
        ],
        chart:  { type: 'line', height: 210, toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 500 } },
        colors: [BRAND_GREEN, BRAND_RED],
        stroke: { width: 2.5, curve: 'smooth' },
        markers: { size: 4, hover: { size: 6 } },
        xaxis:  { categories: labels, labels: { style: { fontSize: '10px', colors: '#9ca3af' }, rotate: -30 } },
        yaxis:  { labels: { style: { fontSize: '10px', colors: '#9ca3af' } }, min: 0 },
        grid:   { borderColor: '#f3f4f6', strokeDashArray: 4 },
        legend: { show: false },
        tooltip: { shared: true, intersect: false, style: { fontSize: '11px' } },
        dataLabels: { enabled: false }
    });
    chartInstances['daily'].render();
}

function renderHourlyChart(data) {
    const hours    = Array.from({length: 24}, (_, i) => String(i).padStart(2,'0') + ':00');
    const metArr   = Array(24).fill(0);
    const brArr    = Array(24).fill(0);
    data.forEach(d => {
        if (!d.startTimeStr) return;
        const h = parseInt(String(d.startTimeStr).split(':')[0], 10);
        if (isNaN(h) || h < 0 || h > 23) return;
        if (d.isBreach) brArr[h]++; else metArr[h]++;
    });

    const chartEl = document.getElementById('hourlyBreachChart');
    if (!chartEl) return;
    if (chartInstances['hourly']) { chartInstances['hourly'].destroy(); }

    chartInstances['hourly'] = new ApexCharts(chartEl, {
        series: [
            { name: 'Within SLA', data: metArr },
            { name: 'Over SLA',   data: brArr  }
        ],
        chart:  { type: 'bar', height: 210, toolbar: { show: false }, stacked: true, animations: { enabled: true, easing: 'easeinout', speed: 500 } },
        colors: [BRAND_GREEN, BRAND_RED],
        plotOptions: { bar: { columnWidth: '65%', borderRadius: 3 } },
        xaxis:  { categories: hours, labels: { style: { fontSize: '9px', colors: '#9ca3af' }, rotate: -45 } },
        yaxis:  { labels: { style: { fontSize: '10px', colors: '#9ca3af' } }, min: 0 },
        grid:   { borderColor: '#f3f4f6', strokeDashArray: 4 },
        legend: { show: false },
        tooltip: { shared: true, intersect: false, style: { fontSize: '11px' } },
        dataLabels: { enabled: false }
    });
    chartInstances['hourly'].render();
}

function formatTimeHMS(t) {
    if (!t) return '-';
    const parts = String(t).split(/[:.]/);
    return parts.length >= 3 ? `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}:${parts[2].padStart(2,'0')}` : t;
}

function renderBreachTable(breachData) {
    const tbody = document.getElementById('breachTableBody');
    const empty = document.getElementById('emptyTableState');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (breachData.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    const isAdmin = userRole === 'admin';

    breachData.sort((a, b) => b.responseTime - a.responseTime).forEach(d => {
        const badgeClass = d.responseTime > 20 ? 'high' : 'medium';
        const remarkCell = isAdmin
            ? `<input type="text" data-session="${d.session_id}" value="${d.remark || ''}" placeholder="ระบุเหตุผล..." class="remark-input">`
            : `<span class="text-xs text-gray-600">${d.remark || '-'}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2.5 text-gray-600">${d.date}</td>
            <td class="px-4 py-2.5 text-gray-500">${formatTimeHMS(d.startTimeStr)}</td>
            <td class="px-4 py-2.5 text-gray-500">${formatTimeHMS(d.agentTimeStr)}</td>
            <td class="px-4 py-2.5 font-medium text-gray-800">${d.agentName}</td>
            <td class="px-4 py-2.5 text-[10px] text-gray-400 font-mono">${d.session_id}</td>
            <td class="px-4 py-2.5"><span class="response-badge ${badgeClass}">${d.responseTime.toFixed(2)} m</span></td>
            <td class="px-4 py-2.5">${remarkCell}</td>
        `;
        tbody.appendChild(tr);
    });

    if (isAdmin) {
        document.querySelectorAll('#breachTableBody .remark-input').forEach(input => {
            input.addEventListener('change', async e => {
                const rec = processedData.find(r => r.session_id === e.target.dataset.session);
                if (rec) {
                    rec.remark = e.target.value;
                    await saveChatDataToDB([rec]);
                }
            });
        });
    }
}

function exportToCSV() {
    const getChecked = prefix => Array.from(document.querySelectorAll(`.filter-checkbox-${prefix}:checked`)).map(cb => cb.value);
    const sY = getChecked('year'), sM = getChecked('month'), sD = getChecked('day');
    let data = processedData;
    if (sY.length || sM.length || sD.length) {
        data = data.filter(d => {
            const p = (d.date || '').split('-');
            return p.length === 3 && (!sY.length || sY.includes(p[0])) && (!sM.length || sM.includes(p[1])) && (!sD.length || sD.includes(p[2]));
        });
    }
    const breaches = data.filter(d => d.isBreach).sort((a,b) => b.responseTime - a.responseTime);
    if (!breaches.length) { alert('No Chat SLA breach data to export.'); return; }

    let csv = "\uFEFFDate,Bot Assigned,Agent Responded,Agent Name,Session ID,Response (Mins),Remarks\n";
    breaches.forEach(d => {
        csv += [d.date, formatTimeHMS(d.startTimeStr), formatTimeHMS(d.agentTimeStr), `"${d.agentName}"`, d.session_id, d.responseTime.toFixed(2), `"${d.remark || ''}"`].join(',') + "\n";
    });
    const a = document.createElement('a');
    a.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    a.download = `Chat_SLA_Breach_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}


// ─── MODULE 2: Task SLA UI & Logic ───────────────────────────
function setupTaskDateFilters() {
    if (!processedTaskData.length) return;
    const years = new Set(), months = new Set(), days = new Set();
    processedTaskData.forEach(d => {
        if (!d.OpenedDate) return;
        const p = d.OpenedDate.split('-');
        if (p.length === 3) { years.add(p[0]); months.add(p[1]); days.add(p[2]); }
    });
    const allMonths = Array.from({length:12}, (_,i) => String(i+1).padStart(2,'0'));
    const allDays   = Array.from({length:31}, (_,i) => String(i+1).padStart(2,'0'));
    populateTaskCheckboxGroup('taskYearCheckboxes',  Array.from(years).sort(), 'year',  years);
    populateTaskCheckboxGroup('taskMonthCheckboxes', allMonths, 'month', months);
    populateTaskCheckboxGroup('taskDayCheckboxes',   allDays,   'day',   days);
}

function populateTaskCheckboxGroup(containerId, values, prefix, activeSet) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const existingChecked = Array.from(container.querySelectorAll('input:checked')).map(c => c.value);
    const hasExisting = container.querySelectorAll('input').length > 0;
    container.innerHTML = '';
    values.forEach(val => {
        const isChecked = hasExisting ? existingChecked.includes(val) : activeSet.has(val);
        const lbl = document.createElement('label');
        lbl.className = 'cursor-pointer select-none';
        lbl.innerHTML = `<input type="checkbox" value="${val}" class="filter-task-${prefix} sr-only" ${isChecked ? 'checked' : ''}><span class="filter-label">${val}</span>`;
        lbl.querySelector('input').addEventListener('change', updateTaskDashboardView);
        container.appendChild(lbl);
    });
}

function selectAllInTaskGroup(prefix) {
    const cbs = document.querySelectorAll(`.filter-task-${prefix}`);
    const allChecked = Array.from(cbs).every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
    updateTaskDashboardView();
}

function setTaskPriorityFilter(prio) {
    taskFilterPriority = prio;
    updateTaskFilterPillsUI();
    updateTaskDashboardView();
}

function setTaskOutcomeFilter(outcome) {
    taskFilterOutcome = outcome;
    updateTaskFilterPillsUI();
    updateTaskDashboardView();
}

function updateTaskFilterPillsUI() {
    document.querySelectorAll('#taskPriorityPills .quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.prio === taskFilterPriority);
    });
    document.querySelectorAll('#taskSlaOutcomePills .quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.outcome === taskFilterOutcome);
    });
}

function formatDurationSeconds(sec) {
    if (!sec || sec <= 0) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function updateTaskDashboardView() {
    const getChecked = prefix => Array.from(document.querySelectorAll(`.filter-task-${prefix}:checked`)).map(cb => cb.value);
    const selYears   = getChecked('year');
    const selMonths  = getChecked('month');
    const selDays    = getChecked('day');
    const searchQuery = (document.getElementById('taskSearchInput')?.value || '').trim().toLowerCase();

    let filtered = processedTaskData;

    // Date Filter (OpenedDate)
    if (selYears.length || selMonths.length || selDays.length) {
        filtered = filtered.filter(d => {
            if (!d.OpenedDate) return false;
            const p = d.OpenedDate.split('-');
            if (p.length !== 3) return false;
            return (!selYears.length  || selYears.includes(p[0]))
                && (!selMonths.length || selMonths.includes(p[1]))
                && (!selDays.length   || selDays.includes(p[2]));
        });
    }

    const dateFiltered = filtered;
    renderTaskGroupSidebar(dateFiltered);

    // Group Filter
    if (selectedTaskGroups.size > 0) {
        filtered = filtered.filter(d => selectedTaskGroups.has(d.AssignmentGroup));
        const btn = document.getElementById('clearTaskGroupFilterBtn');
        if (btn) btn.classList.remove('hidden');
    }

    // Priority Filter
    if (taskFilterPriority !== 'all') {
        filtered = filtered.filter(d => d.PriorityCode === taskFilterPriority);
    }

    // Outcome Filter (Met / Breached)
    if (taskFilterOutcome === 'met') {
        filtered = filtered.filter(d => !d.isBreach);
    } else if (taskFilterOutcome === 'breached') {
        filtered = filtered.filter(d => d.isBreach);
    }

    // Search Query (Task ID, Assigned To, Short Description, Application)
    if (searchQuery) {
        filtered = filtered.filter(d => 
            d.Task.toLowerCase().includes(searchQuery) ||
            d.AssignedTo.toLowerCase().includes(searchQuery) ||
            d.ShortDescription.toLowerCase().includes(searchQuery) ||
            d.ApplicationAcronym.toLowerCase().includes(searchQuery) ||
            d.AssignmentGroup.toLowerCase().includes(searchQuery)
        );
    }

    // KPI Metrics
    const total = filtered.length;
    const breached = filtered.filter(d => d.isBreach).length;
    const met = total - breached;
    const slaRate = total > 0 ? (met / total * 100) : 0;
    const avgSec = total > 0 ? (filtered.reduce((sum, d) => sum + d.ElapsedTimeSec, 0) / total) : 0;
    const avgHours = (avgSec / 3600).toFixed(1);

    animateNumber('taskTotalCard', total);
    animateNumber('taskMetCard', met);
    animateNumber('taskBreachedCard', breached);
    document.getElementById('taskSlaRateCard').textContent = `${slaRate.toFixed(1)}%`;
    document.getElementById('taskAvgTimeCard').textContent = `${avgHours}h`;

    const setBar = (id, pct) => { const el = document.getElementById(id); if(el) el.style.width = pct + '%'; };
    setBar('taskMetBar', total > 0 ? (met / total * 100) : 0);
    setBar('taskBreachBar', total > 0 ? (breached / total * 100) : 0);
    setBar('taskSlaRateBar', slaRate);

    const badge = document.getElementById('taskRecordCountBadge');
    if (badge) badge.textContent = `${total} records`;

    renderTaskTable(filtered);
    renderTaskDailyChart(filtered);
    renderTaskGroupChart(filtered);
}

function renderTaskGroupSidebar(data) {
    const container = document.getElementById('taskGroupListBody');
    const empty     = document.getElementById('emptyTaskGroupState');
    const badge     = document.getElementById('taskGroupCountBadge');
    if (!container) return;
    container.innerHTML = '';

    const stats = {};
    data.forEach(d => {
        const grp = d.AssignmentGroup || 'Unassigned';
        if (!stats[grp]) stats[grp] = { total: 0, breached: 0 };
        stats[grp].total++;
        if (d.isBreach) stats[grp].breached++;
    });

    const groups = Object.keys(stats).sort((a, b) => stats[b].breached - stats[a].breached || stats[b].total - stats[a].total);
    if (badge) badge.textContent = groups.length;

    if (groups.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    groups.forEach(groupName => {
        const s = stats[groupName];
        const slaPct = s.total > 0 ? (((s.total - s.breached) / s.total) * 100).toFixed(0) : 0;
        const isSelected = selectedTaskGroups.has(groupName);
        const badgeClass = slaPct >= 95 ? 'good' : slaPct >= 80 ? 'warn' : 'bad';

        const row = document.createElement('div');
        row.className = `group-row ${isSelected ? 'selected' : ''}`;
        row.onclick = () => {
            if (selectedTaskGroups.has(groupName)) { selectedTaskGroups.delete(groupName); }
            else                                  { selectedTaskGroups.add(groupName); }
            const btn = document.getElementById('clearTaskGroupFilterBtn');
            if (btn) btn.classList.toggle('hidden', selectedTaskGroups.size === 0);
            updateTaskDashboardView();
        };

        row.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-3.5 h-3.5 rounded-sm border ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'} shrink-0 flex items-center justify-center">
                        ${isSelected ? '<svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                    </div>
                    <span class="text-xs font-medium text-gray-700 truncate" title="${groupName}">${groupName}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[10px] text-gray-400 font-semibold">${s.total}</span>
                    <span class="sla-badge ${badgeClass}">${slaPct}%</span>
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

window.selectAllTaskGroups = function() {
    const container = document.getElementById('taskGroupListBody');
    const rows = container.querySelectorAll('.group-row');
    const names = Array.from(rows).map(r => r.querySelector('span.truncate')?.title || '').filter(Boolean);
    const allSelected = names.every(n => selectedTaskGroups.has(n));
    if (allSelected) { selectedTaskGroups.clear(); }
    else             { names.forEach(n => selectedTaskGroups.add(n)); }
    const btn = document.getElementById('clearTaskGroupFilterBtn');
    if (btn) btn.classList.toggle('hidden', selectedTaskGroups.size === 0);
    updateTaskDashboardView();
};

function renderTaskDailyChart(data) {
    const dateStats = {};
    data.forEach(d => {
        const dt = d.OpenedDate || 'Unknown';
        if (!dateStats[dt]) dateStats[dt] = { met: 0, breach: 0 };
        if (d.isBreach) dateStats[dt].breach++;
        else            dateStats[dt].met++;
    });
    const labels   = Object.keys(dateStats).sort();
    const metData  = labels.map(l => dateStats[l].met);
    const brData   = labels.map(l => dateStats[l].breach);

    const chartEl = document.getElementById('taskDailyTrendChart');
    if (!chartEl) return;
    if (chartInstances['taskDaily']) { chartInstances['taskDaily'].destroy(); }

    chartInstances['taskDaily'] = new ApexCharts(chartEl, {
        series: [
            { name: 'Within SLA', data: metData },
            { name: 'Over SLA',   data: brData  }
        ],
        chart:  { type: 'area', height: 210, toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 500 } },
        colors: [BRAND_BLUE, BRAND_RED],
        stroke: { width: 2.5, curve: 'smooth' },
        fill:   { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
        markers: { size: 3.5, hover: { size: 5.5 } },
        xaxis:  { categories: labels, labels: { style: { fontSize: '10px', colors: '#9ca3af' }, rotate: -30 } },
        yaxis:  { labels: { style: { fontSize: '10px', colors: '#9ca3af' } }, min: 0 },
        grid:   { borderColor: '#f3f4f6', strokeDashArray: 4 },
        legend: { show: false },
        tooltip: { shared: true, intersect: false, style: { fontSize: '11px' } },
        dataLabels: { enabled: false }
    });
    chartInstances['taskDaily'].render();
}

function renderTaskGroupChart(data) {
    const groupStats = {};
    data.forEach(d => {
        const g = d.AssignmentGroup || 'Unassigned';
        if (!groupStats[g]) groupStats[g] = { met: 0, breach: 0, total: 0 };
        groupStats[g].total++;
        if (d.isBreach) groupStats[g].breach++;
        else groupStats[g].met++;
    });

    // Top 8 groups by total tasks
    const sortedGroups = Object.keys(groupStats)
        .sort((a, b) => groupStats[b].total - groupStats[a].total)
        .slice(0, 8);

    const metArr = sortedGroups.map(g => groupStats[g].met);
    const brArr = sortedGroups.map(g => groupStats[g].breach);

    const chartEl = document.getElementById('taskGroupChart');
    if (!chartEl) return;
    if (chartInstances['taskGroup']) { chartInstances['taskGroup'].destroy(); }

    chartInstances['taskGroup'] = new ApexCharts(chartEl, {
        series: [
            { name: 'Within SLA', data: metArr },
            { name: 'Over SLA',   data: brArr }
        ],
        chart: { type: 'bar', height: 210, toolbar: { show: false }, stacked: true, animations: { enabled: true, easing: 'easeinout', speed: 500 } },
        colors: [BRAND_GREEN, BRAND_RED],
        plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 3 } },
        xaxis: { labels: { style: { fontSize: '10px', colors: '#9ca3af' } } },
        yaxis: { labels: { style: { fontSize: '9px', colors: '#475569' }, maxWidth: 130 } },
        grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
        legend: { show: false },
        tooltip: { shared: true, intersect: false, style: { fontSize: '11px' } },
        dataLabels: { enabled: false }
    });
    chartInstances['taskGroup'].render();
}

function renderTaskTable(taskList) {
    const tbody = document.getElementById('taskTableBody');
    const empty = document.getElementById('emptyTaskTableState');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (taskList.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    const isAdmin = userRole === 'admin';

    taskList.forEach(d => {
        const prioClass = `p${d.PriorityCode}`;
        const pctBadgeClass = d.ElapsedPercentage > 100 ? 'text-red-600 bg-red-50 font-bold' : 'text-emerald-700 bg-emerald-50 font-medium';
        const statusBadge = d.isBreach ? 
            `<span class="status-badge breached"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>Over SLA</span>` :
            `<span class="status-badge met"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Within SLA</span>`;

        const remarkCell = isAdmin
            ? `<input type="text" data-id="${d._id}" data-task="${d.Task}" value="${d.remark || ''}" placeholder="ระบุเหตุผล/หมายเหตุ..." class="remark-input">`
            : `<span class="text-xs text-gray-600">${d.remark || '-'}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2.5 font-bold text-gray-900 font-mono text-[11px]">${d.Task}</td>
            <td class="px-4 py-2.5"><span class="prio-badge ${prioClass}">${d.Priority}</span></td>
            <td class="px-4 py-2.5 text-gray-700 font-medium max-w-[150px] truncate" title="${d.AssignmentGroup}">${d.AssignmentGroup}</td>
            <td class="px-4 py-2.5 text-gray-600">${d.AssignedTo}</td>
            <td class="px-4 py-2.5 text-gray-500">${d.OpenedDate} <span class="text-[10px] text-gray-400">${d.OpenedTime}</span></td>
            <td class="px-4 py-2.5 font-semibold text-gray-700" title="${d.ElapsedTimeSec.toLocaleString()}s">${formatDurationSeconds(d.ElapsedTimeSec)}</td>
            <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded-md text-[10px] ${pctBadgeClass}">${d.ElapsedPercentage.toFixed(1)}%</span></td>
            <td class="px-4 py-2.5">${statusBadge}</td>
            <td class="px-4 py-2.5 text-gray-500 max-w-[200px] truncate" title="${d.ShortDescription}">${d.ShortDescription || '-'}</td>
            <td class="px-4 py-2.5">${remarkCell}</td>
        `;
        tbody.appendChild(tr);
    });

    if (isAdmin) {
        document.querySelectorAll('#taskTableBody .remark-input').forEach(input => {
            input.addEventListener('change', async e => {
                const rowId = e.target.dataset.id;
                const rec = processedTaskData.find(r => r._id === rowId);
                if (rec) {
                    rec.remark = e.target.value;
                    await saveTaskDataToDB([rec]);
                }
            });
        });
    }
}

function exportTaskToCSV() {
    if (!processedTaskData.length) {
        alert('No Task SLA data to export.');
        return;
    }
    let csv = "\uFEFFTask,Priority,Assignment Group,Assigned To,Opened Date,Opened Time,Elapsed Time (s),Elapsed Time (Human),Elapsed %,SLA Target (s),Status,Short Description,Remarks\n";
    processedTaskData.forEach(d => {
        csv += [
            d.Task,
            `"${d.Priority}"`,
            `"${d.AssignmentGroup}"`,
            `"${d.AssignedTo}"`,
            d.OpenedDate,
            d.OpenedTime,
            d.ElapsedTimeSec,
            `"${formatDurationSeconds(d.ElapsedTimeSec)}"`,
            d.ElapsedPercentage.toFixed(2) + '%',
            d.SlaTargetSec,
            d.isBreach ? "Over SLA" : "Within SLA",
            `"${(d.ShortDescription || '').replace(/"/g, '""')}"`,
            `"${(d.remark || '').replace(/"/g, '""')}"`
        ].join(',') + "\n";
    });
    const a = document.createElement('a');
    a.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    a.download = `Task_SLA_Report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ─── MODULE 3: Call Ring Time (CUIC) UI & Logic ─────────────
function setupCallWeekFilters() {
    const container = document.getElementById('callWeekPills');
    if (!container) return;

    const weekMap = new Map();
    processedCallData.forEach(d => {
        if (!weekMap.has(d.weekKey)) {
            weekMap.set(d.weekKey, {
                key: d.weekKey,
                label: d.weekLabel,
                total: 0,
                ring12: 0
            });
        }
        const w = weekMap.get(d.weekKey);
        w.total++;
        if (d.isRing12) w.ring12++;
    });

    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    let html = `<button class="quick-filter-btn ${callFilterWeek === 'all' ? 'active' : ''}" data-week="all" onclick="setCallWeekFilter('all')">All Weeks (ผลรวมทั้งหมด)</button>`;

    sortedWeeks.forEach(w => {
        const badge = w.ring12 > 0 ? ` <span class="text-red-600 font-bold">(${w.ring12} 🔴)</span>` : '';
        html += `<button class="quick-filter-btn ${callFilterWeek === w.key ? 'active' : ''}" data-week="${w.key}" onclick="setCallWeekFilter('${w.key}')">${w.label}${badge}</button>`;
    });

    container.innerHTML = html;
}

window.setCallWeekFilter = function(weekKey) {
    callTablePage = 1;
    callFilterWeek = weekKey;
    setupCallWeekFilters();
    updateCallDashboardView();
};

window.setCallRingFilter = function(status) {
    callTablePage = 1;
    callFilterRing = status;
    const buttons = document.querySelectorAll('#callRingStatusPills button');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    updateCallDashboardView();
};

window.setCallViewMode = function(mode) {
    callTablePage = 1;
    callViewMode = mode;
    const btnMatrix = document.getElementById('callViewBtnMatrix');
    const btnDetails = document.getElementById('callViewBtnDetails');
    const viewMatrix = document.getElementById('callMatrixViewContainer');
    const viewDetails = document.getElementById('callDetailsViewContainer');

    [btnMatrix, btnDetails].forEach(b => {
        b?.classList.remove('bg-white', 'text-purple-700', 'shadow-2xs', 'font-semibold');
        b?.classList.add('text-gray-600', 'font-medium');
    });
    [viewMatrix, viewDetails].forEach(v => v?.classList.add('hidden'));

    if (mode === 'comparison') {
        btnMatrix?.classList.add('bg-white', 'text-purple-700', 'shadow-2xs', 'font-semibold');
        btnMatrix?.classList.remove('text-gray-600', 'font-medium');
        viewMatrix?.classList.remove('hidden');
    } else {
        btnDetails?.classList.add('bg-white', 'text-purple-700', 'shadow-2xs', 'font-semibold');
        btnDetails?.classList.remove('text-gray-600', 'font-medium');
        viewDetails?.classList.remove('hidden');
    }
    updateCallDashboardView();
};

window.changeCallTablePage = function(delta) {
    const totalPages = Math.ceil(lastFilteredCallList.length / CALL_PAGE_SIZE) || 1;
    callTablePage = Math.min(Math.max(1, callTablePage + delta), totalPages);
    renderCallTable(lastFilteredCallList);
};

window.gotoCallTablePage = function(page) {
    const totalPages = Math.ceil(lastFilteredCallList.length / CALL_PAGE_SIZE) || 1;
    callTablePage = Math.min(Math.max(1, page), totalPages);
    renderCallTable(lastFilteredCallList);
};

function updateCallDashboardView() {
    enrichAbandonedWithCuic();

    if (!processedCallData.length) {
        animateNumber('callTotalCard', 0);
        animateNumber('call12sCard', 0);
        animateNumber('callNormalCard', 0);
        document.getElementById('call12sRateCard').textContent = '0%';
        document.getElementById('callAvgRingCard').textContent = '0s';
        renderCallAgentSidebar([]);
        renderWeeklyComparisonMatrix([]);
        renderCallTable([]);
        return;
    }

    const searchQuery = (document.getElementById('callSearchInput')?.value || '').trim().toLowerCase();

    // Base filter by week
    let weekFiltered = processedCallData;
    if (callFilterWeek !== 'all') {
        weekFiltered = weekFiltered.filter(d => d.weekKey === callFilterWeek);
    }

    // Sidebar renders based on weekFiltered
    renderCallAgentSidebar(weekFiltered);

    let filtered = weekFiltered;

    // Filter by selected agents
    if (selectedCallAgents.size > 0) {
        filtered = filtered.filter(d => selectedCallAgents.has(d.agentName));
        const btn = document.getElementById('clearCallAgentFilterBtn');
        if (btn) btn.classList.remove('hidden');
    } else {
        const btn = document.getElementById('clearCallAgentFilterBtn');
        if (btn) btn.classList.add('hidden');
    }

    // Filter by Ring status
    if (callFilterRing === '12s') {
        filtered = filtered.filter(d => d.isRing12);
    } else if (callFilterRing === 'normal') {
        filtered = filtered.filter(d => !d.isRing12);
    }

    // Search query filter
    if (searchQuery) {
        filtered = filtered.filter(d =>
            d.agentName.toLowerCase().includes(searchQuery) ||
            d.callingNumber.toLowerCase().includes(searchQuery) ||
            d.csqNames.toLowerCase().includes(searchQuery) ||
            d.sessionId.toLowerCase().includes(searchQuery)
        );
    }

    // KPI Metrics calculation
    const total = filtered.length;
    const ring12Count = filtered.filter(d => d.isRing12).length;
    const normalCount = total - ring12Count;
    const ring12Pct = total > 0 ? (ring12Count / total * 100) : 0;
    const totalRingSec = filtered.reduce((sum, d) => sum + d.ringTimeSec, 0);
    const avgRingSec = total > 0 ? (totalRingSec / total).toFixed(1) : 0;

    animateNumber('callTotalCard', total);
    animateNumber('call12sCard', ring12Count);
    animateNumber('callNormalCard', normalCount);
    document.getElementById('call12sRateCard').textContent = `${ring12Pct.toFixed(1)}%`;
    document.getElementById('callAvgRingCard').textContent = `${avgRingSec}s`;

    const setBar = (id, pct) => { const el = document.getElementById(id); if(el) el.style.width = pct + '%'; };
    setBar('call12sBar', ring12Pct);
    setBar('callNormalBar', total > 0 ? (normalCount / total * 100) : 0);
    setBar('callRateBar', ring12Pct);

    // Pill badges
    const totalRing12InWeek = weekFiltered.filter(d => d.isRing12).length;
    const pill12sCount = document.getElementById('pill12sCount');
    if (pill12sCount) pill12sCount.textContent = totalRing12InWeek;

    // Badges
    const matrixBadge = document.getElementById('callMatrixCountBadge');
    if (matrixBadge) matrixBadge.textContent = `${total} calls`;
    const recordBadge = document.getElementById('callRecordCountBadge');
    if (recordBadge) recordBadge.textContent = `${total} records`;

    // Render Views (Lazy rendering: only render the active view mode for instant UI performance)
    if (callViewMode === 'comparison') {
        renderWeeklyComparisonMatrix(filtered);
        renderWeeklyComparisonChart(filtered);
    } else {
        renderCallTable(filtered);
    }
}

function renderCallAgentSidebar(data) {
    const container = document.getElementById('callAgentListBody');
    const empty     = document.getElementById('emptyCallAgentState');
    const badge     = document.getElementById('callAgentCountBadge');
    if (!container) return;
    container.innerHTML = '';

    const stats = {};
    data.forEach(d => {
        const ag = d.agentName || 'Unknown Agent';
        if (!stats[ag]) stats[ag] = { total: 0, ring12: 0 };
        stats[ag].total++;
        if (d.isRing12) stats[ag].ring12++;
    });

    const agents = Object.keys(stats).sort((a, b) => stats[b].ring12 - stats[a].ring12 || stats[b].total - stats[a].total);
    if (badge) badge.textContent = agents.length;

    if (agents.length === 0) { empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');

    agents.forEach(agentName => {
        const s = stats[agentName];
        const isSelected = selectedCallAgents.has(agentName);
        const row = document.createElement('div');
        row.className = `group-row ${isSelected ? 'selected' : ''}`;
        row.onclick = () => {
            callTablePage = 1;
            if (selectedCallAgents.has(agentName)) {
                selectedCallAgents.delete(agentName);
            } else {
                selectedCallAgents.add(agentName);
            }
            const btn = document.getElementById('clearCallAgentFilterBtn');
            if (btn) btn.classList.toggle('hidden', selectedCallAgents.size === 0);
            updateCallDashboardView();
        };

        const alertBadge = s.ring12 > 0 ? 
            `<span class="ring-12-badge text-[10px] px-1.5 py-0.5 font-bold">🔴 ${s.ring12}</span>` : 
            `<span class="text-[10px] text-gray-400 font-semibold">${s.total}</span>`;

        row.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-3.5 h-3.5 rounded-sm border ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'} shrink-0 flex items-center justify-center">
                        ${isSelected ? '<svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                    </div>
                    <span class="text-xs font-medium text-gray-700 truncate" title="${agentName}">${agentName}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${alertBadge}
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

window.selectAllCallAgents = function() {
    callTablePage = 1;
    const container = document.getElementById('callAgentListBody');
    const rows = container?.querySelectorAll('.group-row') || [];
    const names = Array.from(rows).map(r => r.querySelector('span.truncate')?.title || '').filter(Boolean);
    const allSelected = names.length > 0 && names.every(n => selectedCallAgents.has(n));
    if (allSelected) { selectedCallAgents.clear(); }
    else             { names.forEach(n => selectedCallAgents.add(n)); }
    const btn = document.getElementById('clearCallAgentFilterBtn');
    if (btn) btn.classList.toggle('hidden', selectedCallAgents.size === 0);
    updateCallDashboardView();
};

function renderWeeklyComparisonMatrix(filteredData) {
    const theadRow = document.getElementById('callMatrixTheadRow');
    const tbody = document.getElementById('callMatrixTbody');
    if (!theadRow || !tbody) return;
    theadRow.innerHTML = '';
    tbody.innerHTML = '';

    // Collect all unique weeks in entire dataset sorted chronologically
    const weekMap = new Map();
    processedCallData.forEach(d => {
        if (!weekMap.has(d.weekKey)) {
            weekMap.set(d.weekKey, d.weekLabel);
        }
    });
    const allWeeks = Array.from(weekMap.keys()).sort();
    const displayWeeks = (callFilterWeek !== 'all') ? [callFilterWeek] : allWeeks;

    // Build the Header Row
    let headHtml = `
        <th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20">Agent Name</th>
    `;
    displayWeeks.forEach(wKey => {
        const label = weekMap.get(wKey) || wKey;
        headHtml += `<th class="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">${label}</th>`;
    });

    if (displayWeeks.length > 1) {
        headHtml += `
            <th class="text-center px-4 py-2.5 text-[10px] font-semibold text-purple-700 uppercase tracking-wider bg-purple-50/50">ผลรวม All (Total 12s)</th>
            <th class="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">สายทั้งหมด</th>
            <th class="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">แนวโน้ม (Trend W vs W-1)</th>
        `;
    } else {
        headHtml += `
            <th class="text-center px-4 py-2.5 text-[10px] font-semibold text-purple-700 uppercase tracking-wider bg-purple-50/50">Ring 12s</th>
            <th class="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">สายทั้งหมด</th>
        `;
    }
    theadRow.innerHTML = headHtml;

    // Group filteredData by Agent
    const agentMap = {};
    filteredData.forEach(d => {
        const ag = d.agentName || 'Unknown Agent';
        if (!agentMap[ag]) {
            agentMap[ag] = {
                name: ag,
                weeks: {},
                total12s: 0,
                totalCalls: 0
            };
        }
        if (!agentMap[ag].weeks[d.weekKey]) {
            agentMap[ag].weeks[d.weekKey] = { total: 0, ring12: 0 };
        }
        agentMap[ag].weeks[d.weekKey].total++;
        if (d.isRing12) {
            agentMap[ag].weeks[d.weekKey].ring12++;
            agentMap[ag].total12s++;
        }
        agentMap[ag].totalCalls++;
    });

    const agentList = Object.values(agentMap);
    if (agentList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${displayWeeks.length + 4}" class="p-8 text-center text-xs text-gray-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
        return;
    }

    // Sort agents: agents with 12s at top (sorted by 12s desc), then by totalCalls desc
    agentList.sort((a, b) => {
        if (b.total12s !== a.total12s) return b.total12s - a.total12s;
        return b.totalCalls - a.totalCalls;
    });

    // Grand totals calculation for footer row
    const weekTotals = {};
    displayWeeks.forEach(w => { weekTotals[w] = { total: 0, ring12: 0 }; });
    let grandTotal12s = 0;
    let grandTotalCalls = 0;

    let matrixHtml = '';

    agentList.forEach(ag => {
        const has12s = ag.total12s > 0;
        const rowClass = has12s ? 'bg-red-50/20 hover:bg-red-50/30 transition-colors' : 'hover:bg-gray-50/50 transition-colors';

        let rowHtml = `
            <td class="px-4 py-2.5 font-bold text-gray-900 sticky left-0 bg-inherit z-10 flex items-center gap-2">
                ${has12s ? '<span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>' : '<span class="w-2 h-2 rounded-full bg-gray-300 shrink-0"></span>'}
                <span>${ag.name}</span>
            </td>
        `;

        displayWeeks.forEach(wKey => {
            const wData = ag.weeks[wKey] || { total: 0, ring12: 0 };
            weekTotals[wKey].total += wData.total;
            weekTotals[wKey].ring12 += wData.ring12;

            if (wData.ring12 > 0) {
                rowHtml += `
                    <td class="px-4 py-2.5 text-center">
                        <span class="ring-12-badge text-xs px-2 py-0.5">🔴 ${wData.ring12}</span>
                        <span class="text-[10px] text-gray-400 ml-1">(${wData.total})</span>
                    </td>
                `;
            } else if (wData.total > 0) {
                rowHtml += `
                    <td class="px-4 py-2.5 text-center text-gray-500">
                        <span class="font-medium text-gray-400">0</span>
                        <span class="text-[10px] text-gray-300 ml-1">(${wData.total})</span>
                    </td>
                `;
            } else {
                rowHtml += `<td class="px-4 py-2.5 text-center text-gray-300">-</td>`;
            }
        });

        grandTotal12s += ag.total12s;
        grandTotalCalls += ag.totalCalls;

        if (displayWeeks.length > 1) {
            // Trend calculation between latest week and previous week
            const latestWeek = displayWeeks[displayWeeks.length - 1];
            const prevWeek = displayWeeks[displayWeeks.length - 2];
            const latest12 = ag.weeks[latestWeek]?.ring12 || 0;
            const prev12 = ag.weeks[prevWeek]?.ring12 || 0;
            const diff = latest12 - prev12;

            let trendBadge = '';
            if (diff > 0) {
                trendBadge = `<span class="trend-badge up font-bold">+${diff} 🔺 เพิ่มขึ้น</span>`;
            } else if (diff < 0) {
                trendBadge = `<span class="trend-badge down font-bold">${diff} 🔻 ลดลง</span>`;
            } else {
                trendBadge = `<span class="trend-badge same font-medium">0 ➖ คงที่</span>`;
            }

            const total12Badge = ag.total12s > 0 ? 
                `<span class="ring-12-badge text-xs px-2.5 py-0.5 font-bold">🔴 ${ag.total12s}</span>` : 
                `<span class="text-gray-400 font-semibold">0</span>`;

            rowHtml += `
                <td class="px-4 py-2.5 text-center bg-purple-50/30">${total12Badge}</td>
                <td class="px-4 py-2.5 text-center font-semibold text-gray-700">${ag.totalCalls.toLocaleString()}</td>
                <td class="px-4 py-2.5 text-center">${trendBadge}</td>
            `;
        } else {
            const total12Badge = ag.total12s > 0 ? 
                `<span class="ring-12-badge text-xs px-2.5 py-0.5 font-bold">🔴 ${ag.total12s}</span>` : 
                `<span class="text-gray-400 font-semibold">0</span>`;
            rowHtml += `
                <td class="px-4 py-2.5 text-center bg-purple-50/30">${total12Badge}</td>
                <td class="px-4 py-2.5 text-center font-semibold text-gray-700">${ag.totalCalls.toLocaleString()}</td>
            `;
        }

        matrixHtml += `<tr class="${rowClass}">${rowHtml}</tr>`;
    });

    // Grand Total Footer Row
    let footHtml = `
        <td class="px-4 py-3 sticky left-0 bg-gray-100 z-10 text-gray-900 font-extrabold uppercase">
            รวมทั้งหมด (Grand Total)
        </td>
    `;
    displayWeeks.forEach(wKey => {
        const wt = weekTotals[wKey];
        const badge = wt.ring12 > 0 ? 
            `<span class="ring-12-badge text-xs px-2 py-0.5">🔴 ${wt.ring12}</span> <span class="text-[10px] text-gray-500 font-normal">(${wt.total.toLocaleString()})</span>` :
            `<span class="text-gray-500 font-medium">0</span> <span class="text-[10px] text-gray-400 font-normal">(${wt.total.toLocaleString()})</span>`;
        footHtml += `<td class="px-4 py-3 text-center">${badge}</td>`;
    });

    if (displayWeeks.length > 1) {
        const latestWeek = displayWeeks[displayWeeks.length - 1];
        const prevWeek = displayWeeks[displayWeeks.length - 2];
        const overallDiff = weekTotals[latestWeek].ring12 - weekTotals[prevWeek].ring12;
        let overallTrendBadge = '';
        if (overallDiff > 0) overallTrendBadge = `<span class="trend-badge up font-bold">+${overallDiff} 🔺</span>`;
        else if (overallDiff < 0) overallTrendBadge = `<span class="trend-badge down font-bold">${overallDiff} 🔻</span>`;
        else overallTrendBadge = `<span class="trend-badge same font-medium">0 ➖</span>`;

        footHtml += `
            <td class="px-4 py-3 text-center bg-purple-100/60 text-purple-900 text-sm font-black">🔴 ${grandTotal12s}</td>
            <td class="px-4 py-3 text-center text-sm font-black text-gray-900">${grandTotalCalls.toLocaleString()}</td>
            <td class="px-4 py-3 text-center">${overallTrendBadge}</td>
        `;
    } else {
        footHtml += `
            <td class="px-4 py-3 text-center bg-purple-100/60 text-purple-900 text-sm font-black">🔴 ${grandTotal12s}</td>
            <td class="px-4 py-3 text-center text-sm font-black text-gray-900">${grandTotalCalls.toLocaleString()}</td>
        `;
    }

    matrixHtml += `<tr class="bg-gray-100/90 font-bold border-t-2 border-gray-300 text-gray-900">${footHtml}</tr>`;
    tbody.innerHTML = matrixHtml;
}

function renderWeeklyComparisonChart(filteredData) {
    const chartEl = document.getElementById('callWeeklyCompChart');
    if (!chartEl) return;

    if (chartInstances['callWeeklyComp']) {
        try { chartInstances['callWeeklyComp'].destroy(); } catch(e){}
    }

    // Collect all unique weeks in entire dataset sorted chronologically
    const weekMap = new Map();
    processedCallData.forEach(d => {
        if (!weekMap.has(d.weekKey)) {
            weekMap.set(d.weekKey, d.weekLabel);
        }
    });
    const allWeeks = Array.from(weekMap.keys()).sort();
    const displayWeeks = (callFilterWeek !== 'all') ? [callFilterWeek] : allWeeks;

    // Find agents who had Ring 12s in filteredData
    const agentStats = {};
    filteredData.forEach(d => {
        const ag = d.agentName || 'Unknown Agent';
        if (!agentStats[ag]) {
            agentStats[ag] = { name: ag, total12s: 0, weeks: {} };
            displayWeeks.forEach(w => { agentStats[ag].weeks[w] = 0; });
        }
        if (d.isRing12) {
            agentStats[ag].total12s++;
            agentStats[ag].weeks[d.weekKey] = (agentStats[ag].weeks[d.weekKey] || 0) + 1;
        }
    });

    let topAgents = Object.values(agentStats).filter(a => a.total12s > 0).sort((a, b) => b.total12s - a.total12s);

    if (topAgents.length === 0) {
        chartEl.innerHTML = '<div class="h-full flex items-center justify-center text-xs text-gray-400">ไม่พบสายที่มี Ring Time 0:00:12 ตามเงื่อนไขที่เลือก (ไม่มีข้อมูลแจ้งเตือน)</div>';
        return;
    }

    chartEl.innerHTML = '';
    const categories = topAgents.map(a => a.name);

    const series = displayWeeks.map(wKey => {
        const label = weekMap.get(wKey) || wKey;
        return {
            name: label,
            data: topAgents.map(a => a.weeks[wKey] || 0)
        };
    });

    const colors = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    chartInstances['callWeeklyComp'] = new ApexCharts(chartEl, {
        chart: {
            type: 'bar',
            height: 240,
            toolbar: { show: false },
            fontFamily: 'Inter, sans-serif'
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '45%',
                borderRadius: 4,
                dataLabels: { position: 'top' }
            }
        },
        dataLabels: {
            enabled: true,
            formatter: val => val > 0 ? val : '',
            offsetY: -18,
            style: { fontSize: '11px', fontWeight: 700, colors: ['#ef4444'] }
        },
        series: series,
        colors: colors.slice(0, series.length),
        xaxis: {
            categories: categories,
            labels: {
                rotate: -20,
                rotateAlways: categories.length > 3,
                style: { fontSize: '11px', fontWeight: 600 }
            }
        },
        yaxis: {
            title: { text: 'จำนวนสาย Ring ≥ 12s', style: { fontSize: '11px', fontWeight: 600 } },
            forceNiceScale: true,
            min: 0
        },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px' },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 3 }
    });
    chartInstances['callWeeklyComp'].render();
}

function renderCallTable(callList) {
    lastFilteredCallList = callList || [];
    const tbody = document.getElementById('callTableBody');
    const empty = document.getElementById('emptyCallTableState');
    const paginationBar = document.getElementById('callTablePaginationBar');
    const pageInfo = document.getElementById('callTablePageInfo');
    const paginationBtns = document.getElementById('callTablePaginationBtns');
    if (!tbody) return;

    if (!callList || callList.length === 0) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        if (paginationBar) paginationBar.classList.add('hidden');
        return;
    }
    empty?.classList.add('hidden');
    if (paginationBar) paginationBar.classList.remove('hidden');

    const totalPages = Math.ceil(callList.length / CALL_PAGE_SIZE) || 1;
    if (callTablePage > totalPages) callTablePage = totalPages;
    if (callTablePage < 1) callTablePage = 1;

    const startIdx = (callTablePage - 1) * CALL_PAGE_SIZE;
    const endIdx = Math.min(startIdx + CALL_PAGE_SIZE, callList.length);
    const pagedItems = callList.slice(startIdx, endIdx);

    const isAdmin = userRole === 'admin';

    let html = '';
    for (let i = 0; i < pagedItems.length; i++) {
        const d = pagedItems[i];
        const isAb = d.isMatchedAbandonedReport || d.isCuicAbandoned;
        let rowClass = 'hover:bg-gray-50/50 transition-colors';
        if (d.isRing12) {
            rowClass = 'bg-red-50/40 hover:bg-red-50/60 transition-colors font-medium';
        } else if (isAb) {
            rowClass = 'bg-amber-50/40 hover:bg-amber-50/60 transition-colors font-medium';
        }

        let ringBadge = d.isRing12 ?
            `<span class="ring-12-badge text-xs px-2.5 py-1">🔴 ${d.ringTimeFormatted}</span>` :
            `<span class="text-gray-700 font-mono">${d.ringTimeFormatted}</span>`;

        if (isAb) {
            ringBadge += ` <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="สายที่โทรเข้ามาแล้ววางสาย (Abandoned Call)">🟠 Abandoned</span>`;
        }

        const remarkCell = isAdmin
            ? `<input type="text" data-id="${d._id}" value="${d.remark || ''}" placeholder="ระบุหมายเหตุ..." class="call-remark-input remark-input">`
            : `<span class="text-xs text-gray-600">${d.remark || '-'}</span>`;

        html += `
            <tr class="${rowClass}">
                <td class="px-4 py-2.5 font-mono text-[11px] text-gray-700">${d.sessionId}</td>
                <td class="px-4 py-2.5 text-gray-700">${d.callStartDate} <span class="text-[10px] text-gray-400 font-mono">${d.callStartTimeOnly}</span></td>
                <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-semibold">${d.weekKey}</span></td>
                <td class="px-4 py-2.5 font-bold ${d.isRing12 ? 'text-red-700' : (isAb ? 'text-amber-800' : 'text-gray-900')}">${d.agentName}</td>
                <td class="px-4 py-2.5 text-gray-600 max-w-[130px] truncate" title="${d.csqNames}">${d.csqNames || '-'}</td>
                <td class="px-4 py-2.5 font-mono text-gray-700">${d.callingNumber || '-'}</td>
                <td class="px-4 py-2.5 text-center">${ringBadge}</td>
                <td class="px-4 py-2.5 font-mono text-gray-600">${d.talkTimeFormatted}</td>
                <td class="px-4 py-2.5 font-mono text-gray-600">${d.workTimeFormatted}</td>
                <td class="px-4 py-2.5">${remarkCell}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    // Update pagination controls
    if (pageInfo) {
        pageInfo.textContent = `กำลังแสดงรายการที่ ${(startIdx + 1).toLocaleString()} - ${endIdx.toLocaleString()} จากทั้งหมด ${callList.length.toLocaleString()} รายการ`;
    }

    if (paginationBtns) {
        paginationBtns.innerHTML = `
            <button onclick="gotoCallTablePage(1)" ${callTablePage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">« แรกสุด</button>
            <button onclick="changeCallTablePage(-1)" ${callTablePage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">‹ ก่อนหน้า</button>
            <span class="px-2.5 py-1 font-semibold text-purple-700 text-xs">${callTablePage} / ${totalPages}</span>
            <button onclick="changeCallTablePage(1)" ${callTablePage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">ถัดไป ›</button>
            <button onclick="gotoCallTablePage(${totalPages})" ${callTablePage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">ท้ายสุด »</button>
        `;
    }

    if (isAdmin) {
        tbody.querySelectorAll('.call-remark-input').forEach(input => {
            input.addEventListener('change', async e => {
                const rowId = e.target.dataset.id;
                const rec = processedCallData.find(r => r._id === rowId);
                if (rec) {
                    rec.remark = e.target.value;
                    await saveCallDataToDB([rec]);
                }
            });
        });
    }
}

// ─── MODULE 4: Abandoned Call (Khelps_Expert Only) UI & Logic ─
function isExpertSkillRecord(d) {
    const sk = String(d.callSkills || d.callRoutedCsq || '').toLowerCase();
    return sk.includes('khelps_expert');
}

function isCuicExpertRecord(c) {
    const app = String(c.applicationName || '').toLowerCase();
    const csq = String(c.csqNames || '').toLowerCase();
    const called = String(c.calledNumber || '').trim();
    return app.includes('khelps_expert') || csq.includes('khelps_expert') || called === '14903';
}

function setupAbandonedWeekFilters() {
    const container = document.getElementById('abandonedWeekPills');
    if (!container) return;

    const weekMap = new Map();
    // Collect weeks from Khelps_Expert Abandoned rows and Khelps_Expert CUIC rows
    processedAbandonedData.filter(isExpertSkillRecord).forEach(d => {
        if (!weekMap.has(d.weekKey)) {
            weekMap.set(d.weekKey, { key: d.weekKey, label: d.weekLabel || d.weekKey, abCount: 0 });
        }
        weekMap.get(d.weekKey).abCount++;
    });

    processedCallData.filter(isCuicExpertRecord).forEach(c => {
        if (!weekMap.has(c.weekKey)) {
            weekMap.set(c.weekKey, { key: c.weekKey, label: c.weekLabel || c.weekKey, abCount: 0 });
        }
    });

    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    let html = `<button class="quick-filter-btn ${abandonedFilterWeek === 'all' ? 'active' : ''}" data-week="all" onclick="setAbandonedWeekFilter('all')">All Weeks (ผลรวมทั้งหมด)</button>`;
    sortedWeeks.forEach(w => {
        const badge = w.abCount > 0 ? ` <span class="text-amber-700 font-bold">(${w.abCount} 📵)</span>` : '';
        html += `<button class="quick-filter-btn ${abandonedFilterWeek === w.key ? 'active' : ''}" data-week="${w.key}" onclick="setAbandonedWeekFilter('${w.key}')">${w.label}${badge}</button>`;
    });
    container.innerHTML = html;
}

window.setAbandonedWeekFilter = function(weekKey) {
    abandonedFilterWeek = weekKey;
    setupAbandonedWeekFilters();
    updateAbandonedDashboardView();
};

function updateAbandonedDashboardView() {
    enrichAbandonedWithCuic();

    const tbody = document.getElementById('abandonedTableBody');
    const empty = document.getElementById('emptyAbandonedTableState');
    const banner = document.getElementById('abandonedContextBanner');
    const summaryBadge = document.getElementById('abandonedMatchSummaryBadge');
    const refTableBody = document.getElementById('cuicExpertRefTableBody');
    const refTitle = document.getElementById('cuicRefTableTitle');
    const refCountBadge = document.getElementById('cuicExpertRefCountBadge');

    if (!tbody) return;
    tbody.innerHTML = '';

    const searchQuery = (document.getElementById('abandonedSearchInput')?.value || '').trim().toLowerCase();

    // 1. กรองเฉพาะ Call Skills / CSQ = Khelps_Expert เท่านั้น
    let expertAbList = processedAbandonedData.filter(isExpertSkillRecord);
    if (abandonedFilterWeek !== 'all') {
        expertAbList = expertAbList.filter(d => d.weekKey === abandonedFilterWeek);
    }

    // 2. กรองข้อมูล CUIC เฉพาะ CSQ / Application = Khelps_Expert เท่านั้น
    let cuicExpertList = processedCallData.filter(isCuicExpertRecord);
    if (abandonedFilterWeek !== 'all') {
        cuicExpertList = cuicExpertList.filter(c => c.weekKey === abandonedFilterWeek);
    }

    // Search filter
    if (searchQuery) {
        expertAbList = expertAbList.filter(d =>
            d.agentName.toLowerCase().includes(searchQuery) ||
            d.callAni.toLowerCase().includes(searchQuery) ||
            d.callSkills.toLowerCase().includes(searchQuery) ||
            (d.cuicSessionId && d.cuicSessionId.toLowerCase().includes(searchQuery))
        );
        cuicExpertList = cuicExpertList.filter(c =>
            c.agentName.toLowerCase().includes(searchQuery) ||
            c.callingNumber.toLowerCase().includes(searchQuery) ||
            c.sessionId.toLowerCase().includes(searchQuery) ||
            c.csqNames.toLowerCase().includes(searchQuery)
        );
    }

    // KPI Metrics (Khelps_Expert Only)
    const totalExpertAb = expertAbList.length;
    const matchedExpertAb = expertAbList.filter(d => d.isMatchedCuic).length;
    const queueAbandonCount = expertAbList.filter(d => !d.isMatchedCuic || (d.cuicRingTimeSec !== null && d.cuicRingTimeSec <= 12)).length;
    const avgWaitSec = totalExpertAb > 0
        ? Math.round(expertAbList.reduce((s, d) => s + (d.timeToAbandonSec || 0), 0) / totalExpertAb)
        : 0;

    animateNumber('abTotalExpertCard', totalExpertAb);
    animateNumber('abMatchedCuicCard', matchedExpertAb);
    animateNumber('abQueueAbandonCard', queueAbandonCount);
    const avgWaitEl = document.getElementById('abAvgWaitCard');
    if (avgWaitEl) avgWaitEl.textContent = formatSecondsToHMS(avgWaitSec);
    animateNumber('abCuicExpertTotalCard', cuicExpertList.length);

    if (summaryBadge) {
        summaryBadge.textContent = `Khelps_Expert Abandoned: ${totalExpertAb} สาย | งาน Khelps_Expert ใน CUIC: ${cuicExpertList.length} สาย`;
    }

    // Context Banner explanation for Khelps_Expert
    if (banner) {
        if (expertAbList.length > 0) {
            const first = expertAbList[0];
            banner.innerHTML = `
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <b>🎯 ข้อมูลเฉพาะ Call Skills / CSQ = <span class="text-indigo-700 underline">Khelps_Expert</span>:</b>
                        พบสาย Abandoned จำนวน <b>${totalExpertAb} รายการ</b>
                        — เบอร์โทร <b>${first.callAni}</b> (โทรเข้าเบอร์ <b>${first.calledNumber || '14903'}</b>) เวลา <b>${first.callStartDate} ${first.callStartTimeOnly} - ${first.callAbandonTimeOnly}</b>
                        | Agent: <b>${first.agentName}</b> | เวลารอก่อนวางสาย (Time to Abandon): <b>${first.timeToAbandonFormatted} (${first.timeToAbandonSec} วินาที)</b>
                        | <b>Ring Time: ${first.isMatchedCuic ? first.cuicRingTimeFormatted : '0:00:00 (วางสายก่อน 12 วินาที / ในคิว)'}</b>
                    </div>
                </div>
            `;
        } else {
            banner.innerHTML = `
                <div>
                    <b>🎯 ข้อมูลเฉพาะ Call Skills / CSQ = <span class="text-indigo-700 underline">Khelps_Expert</span>:</b>
                    แสดงเฉพาะข้อมูลของ Skill <b>Khelps_Expert</b> อย่างเดียวตามเงื่อนไขที่กำหนด
                </div>
            `;
        }
    }

    const isAdmin = userRole === 'admin';

    // Render Table 1: Abandoned Call (Khelps_Expert Only)
    if (expertAbList.length === 0) {
        empty?.classList.remove('hidden');
    } else {
        empty?.classList.add('hidden');
        let rowsHtml = '';
        expertAbList.forEach((d, idx) => {
            const rowClass = d.isMatchedCuic
                ? (d.cuicRingTimeSec >= 12 ? 'bg-red-50/30 hover:bg-red-50/50 transition-colors' : 'hover:bg-amber-50/30 transition-colors')
                : 'bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors';

            const sessionBadge = d.isMatchedCuic
                ? `<span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-[11px] inline-flex items-center gap-1">✅ ${d.cuicSessionId}</span>`
                : `<div class="flex flex-col"><span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px] inline-block w-fit">⚠️ วางสายในคิว (Queue Abandon)</span><span class="text-[10px] text-gray-400 mt-0.5">ไม่มีเลข Session เดี่ยวในไฟล์ CUIC</span></div>`;

            let ringTimeHtml = '';
            if (d.isMatchedCuic) {
                if (d.cuicRingTimeSec >= 12) {
                    ringTimeHtml = `<span class="ring-12-badge text-xs px-2.5 py-1 font-bold">🔴 ${d.cuicRingTimeFormatted} (ครบ 12 วิพอดี)</span>`;
                } else if (d.cuicRingTimeSec > 0) {
                    ringTimeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">🟠 ${d.cuicRingTimeFormatted} (วางก่อน 12 วิ)</span>`;
                } else {
                    ringTimeHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">⚪ 0:00:00 (วางก่อนสายดัง)</span>`;
                }
            } else {
                ringTimeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title="สายวางในคิวก่อนเข้าเครื่อง Agent หรือรอคิว ${d.timeToAbandonFormatted}">0:00:00 (วางสายก่อน 12 วิ / ในคิว)</span>`;
            }

            const remarkCell = isAdmin
                ? `<input type="text" data-id="${d._id}" value="${d.remark || ''}" placeholder="ระบุหมายเหตุ..." class="abandoned-remark-input remark-input">`
                : `<span class="text-xs text-gray-600">${d.remark || '-'}</span>`;

            rowsHtml += `
                <tr class="${rowClass}">
                    <td class="px-3 py-3 text-center font-bold text-gray-400">${idx + 1}</td>
                    <td class="px-4 py-3">${sessionBadge}</td>
                    <td class="px-4 py-3">
                        <div class="font-semibold text-gray-800">${d.callStartDate} <span class="font-mono text-gray-600">${d.callStartTimeOnly}</span></div>
                        <div class="text-[10px] text-red-500 font-mono">Abandon: ${d.callAbandonTimeOnly || '-'}</div>
                    </td>
                    <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-semibold">${d.weekKey}</span></td>
                    <td class="px-4 py-3">
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">${d.callSkills || 'Khelps_Expert'}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="font-mono font-bold text-gray-800">${d.callAni || '-'}</div>
                        <div class="text-[10px] text-gray-400 font-mono">Called: ${d.calledNumber || '14903'}</div>
                    </td>
                    <td class="px-4 py-3 font-semibold text-gray-800 max-w-[240px] truncate" title="${d.agentName}">${d.agentName}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="font-mono font-bold text-gray-800">${d.timeToAbandonFormatted}</span>
                        <span class="text-[10px] text-gray-400 block">(${d.timeToAbandonSec}s)</span>
                    </td>
                    <td class="px-4 py-3 text-center font-mono text-gray-600">${d.isMatchedCuic ? d.cuicQueueTimeFormatted : d.timeToAbandonFormatted}</td>
                    <td class="px-4 py-3 text-center bg-amber-50/30">${ringTimeHtml}</td>
                    <td class="px-4 py-3">${remarkCell}</td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;

        if (isAdmin) {
            tbody.querySelectorAll('.abandoned-remark-input').forEach(input => {
                input.addEventListener('change', async e => {
                    const rowId = e.target.dataset.id;
                    const rec = processedAbandonedData.find(r => r._id === rowId);
                    if (rec) {
                        rec.remark = e.target.value;
                        await saveAbandonedDataToDB([rec]);
                    }
                });
            });
        }
    }

    // Render Table 2: CUIC Khelps_Expert Reference Table (Strictly Khelps_Expert Only)
    if (refTableBody) {
        if (refTitle) {
            refTitle.textContent = `รายการงานในไฟล์ CUIC เฉพาะ CSQ / Application = "Khelps_Expert" (แสดง Ring Time)`;
        }
        if (refCountBadge) {
            refCountBadge.textContent = `${cuicExpertList.length} รายการ`;
        }

        if (cuicExpertList.length === 0) {
            refTableBody.innerHTML = `<tr><td colspan="11" class="p-6 text-center text-xs text-gray-400">ไม่พบรายการ Khelps_Expert ในไฟล์ CUIC</td></tr>`;
        } else {
            let refHtml = '';
            cuicExpertList.forEach(c => {
                const rowClass = c.isRing12 ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50/70';
                const dispBadge = (c.contactDisposition === '1' || c.contactDisposition === '1.0')
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">1 (Abandoned)</span>`
                    : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">2 (Handled)</span>`;
                const rBadge = c.ringTimeSec >= 12
                    ? `<span class="ring-12-badge text-xs px-2.5 py-0.5 font-bold">🔴 ${c.ringTimeFormatted} (≥ 12s)</span>`
                    : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">⏱️ ${c.ringTimeFormatted} (&lt; 12s)</span>`;

                refHtml += `
                    <tr class="${rowClass}">
                        <td class="px-4 py-2.5 font-mono font-bold text-gray-800">${c.sessionId}</td>
                        <td class="px-4 py-2.5 text-gray-700">${c.callStartDate} <span class="font-mono text-gray-500">${c.callStartTimeOnly}</span></td>
                        <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-semibold">${c.weekKey}</span></td>
                        <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">${c.csqNames || c.applicationName}</span></td>
                        <td class="px-4 py-2.5 font-mono font-semibold text-gray-800">${c.callingNumber || '-'}</td>
                        <td class="px-4 py-2.5 font-mono text-gray-600">${c.calledNumber || '14903'}</td>
                        <td class="px-4 py-2.5 font-bold text-gray-900">${c.agentName}</td>
                        <td class="px-4 py-2.5 text-center">${dispBadge}</td>
                        <td class="px-4 py-2.5 text-center font-mono text-gray-600">${c.queueTimeFormatted}</td>
                        <td class="px-4 py-2.5 text-center bg-purple-50/30">${rBadge}</td>
                        <td class="px-4 py-2.5 text-center font-mono text-gray-600">${c.talkTimeFormatted}</td>
                    </tr>
                `;
            });
            refTableBody.innerHTML = refHtml;
        }
    }
}

window.exportAbandonedToCSV = function() {
    const expertAbList = processedAbandonedData.filter(isExpertSkillRecord);
    if (!expertAbList.length) {
        alert('ไม่มีข้อมูล Abandoned Call (Khelps_Expert) ให้ Export');
        return;
    }
    let csv = "\uFEFFCUIC Session ID,Call Start Time,Call Abandon Time,Week,Call Skills,Call Routed CSQ,Call ANI,Called Number,Agent Name,Time to Abandon,Time to Abandon (s),CUIC Ring Time,Remarks\n";
    expertAbList.forEach(d => {
        csv += [
            `"${d.isMatchedCuic ? d.cuicSessionId : 'Queue Abandon'}"`,
            `"${d.callStartTime}"`,
            `"${d.callAbandonTime}"`,
            `"${d.weekKey}"`,
            `"${d.callSkills}"`,
            `"${d.callRoutedCsq}"`,
            `"${d.callAni}"`,
            `"${d.calledNumber}"`,
            `"${d.agentName}"`,
            `"${d.timeToAbandonFormatted}"`,
            d.timeToAbandonSec,
            `"${d.isMatchedCuic ? d.cuicRingTimeFormatted : '0:00:00'}"`,
            `"${(d.remark || '').replace(/"/g, '""')}"`
        ].join(',') + "\n";
    });
    const a = document.createElement('a');
    a.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    a.download = `Abandoned_Khelps_Expert_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

function exportCallToCSV() {
    if (!processedCallData.length) {
        alert('ไม่มีข้อมูล Call Report ให้ Export');
        return;
    }
    let csv = "\uFEFFSession ID,Call Start Time,Call End Time,Week,Agent Name,CSQ Names,Calling Number,Ring Time,Ring Time (s),Is Ring 12s,Talk Time,Work Time,Remarks\n";
    processedCallData.forEach(d => {
        csv += [
            `"${d.sessionId}"`,
            `"${d.callStartTime}"`,
            `"${d.callEndTime}"`,
            `"${d.weekKey}"`,
            `"${d.agentName}"`,
            `"${d.csqNames}"`,
            `"${d.callingNumber}"`,
            `"${d.ringTimeFormatted}"`,
            d.ringTimeSec,
            d.isRing12 ? "ALERT_12S" : "NORMAL",
            `"${d.talkTimeFormatted}"`,
            `"${d.workTimeFormatted}"`,
            `"${(d.remark || '').replace(/"/g, '""')}"`
        ].join(',') + "\n";
    });
    const a = document.createElement('a');
    a.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    a.download = `CUIC_Call_Ring_Report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 500;
    const start    = parseInt(el.textContent) || 0;
    const diff     = target - start;
    if (diff === 0) { el.textContent = target; return; }
    const startTime = performance.now();
    const step = now => {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + diff * eased);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// ============================================================
// MODULE 5: %FCR (Target>90%) Parser, Pivot & UI Logic
// ============================================================

// เงื่อนไขตารางซ้าย (ตัวหาร):
// 1. Service: ตัด Tracking ออก
// 2. Category: เลือกเฉพาะ Email, Inquiry/Help (Inquiry / Help), Software
function checkFcrLeftBase(rec) {
    const srv = String(rec.service || '').trim().toLowerCase();
    if (srv.includes('tracking')) return false;

    const cat = String(rec.category || '').trim().toLowerCase().replace(/\s+/g, '');
    return cat === 'email' || cat === 'inquiry/help' || cat === 'software';
}

// เงื่อนไขตารางขวา (ตัวตั้ง FCR):
// 1. ผ่านเงื่อนไขตารางซ้าย (Category = Email, Inquiry/Help, Software)
// 2. Service: เลือกเฉพาะ RFI (RFI & Advisory Service) อย่างเดียว
// 3. State: เลือกเฉพาะ Resolved, Closed
function checkFcrRightTarget(rec) {
    if (!checkFcrLeftBase(rec)) return false;

    const srv = String(rec.service || '').trim().toLowerCase();
    if (!srv.includes('rfi')) return false;

    const st = String(rec.state || '').trim().toLowerCase();
    return st === 'resolved' || st === 'closed';
}

function getFcrChannelGroup(channelStr) {
    const ch = String(channelStr || '').trim().toLowerCase();
    if (ch === 'phone') return 'voice';
    if (ch === 'line') return 'line';
    return 'other';
}

function parseFcrRows(rawData) {
    const list = [];
    const seen = new Set();

    rawData.forEach(r => {
        const num = String(r['Number'] || '').trim();
        if (!num || seen.has(num)) return;

        const state = String(r['State'] || '').trim();
        const priority = String(r['Priority'] || '').trim();
        const caller = String(r['Caller'] || '').trim();
        const shortDesc = String(r['Short description'] || '').trim().slice(0, 180);
        const appAcronym = String(r['Application Acronym'] || '').trim();
        const channel = String(r['Channel'] || '').trim() || '(blank)';
        const assignmentGroup = String(r['Assignment group'] || '').trim();
        const assignee = String(r['Assignee'] || '').trim();
        const category = String(r['Category'] || '').trim();
        const subcategory = String(r['Subcategory'] || '').trim();
        const service = String(r['Service'] || '').trim();

        const openedRaw = r['Opened'];
        const openedM = parseDateSmart(openedRaw);
        const openedStr = (openedM && openedM.isValid()) ? openedM.format('YYYY-MM-DD HH:mm:ss') : String(openedRaw || '').trim();
        const openedDate = (openedM && openedM.isValid()) ? openedM.format('YYYY-MM-DD') : '';

        let weekKey = 'Unknown';
        let weekLabel = 'ไม่ระบุวันที่';
        if (openedM && openedM.isValid()) {
            const wInfo = computeMonthWeekInfo(openedM);
            weekKey = wInfo.weekKey;
            weekLabel = wInfo.weekLabel;
        }

        const rec = {
            _id: num,
            number: num,
            priority,
            state,
            caller,
            shortDescription: shortDesc,
            applicationAcronym: appAcronym,
            channel,
            opened: openedStr,
            openedDate,
            weekKey,
            weekLabel,
            assignmentGroup,
            assignee,
            category,
            subcategory,
            service,
            remark: ''
        };

        rec.isLeftBase = checkFcrLeftBase(rec);
        rec.isRightFcr = checkFcrRightTarget(rec);

        // เก็บเฉพาะรายการที่เข้าเงื่อนไขตารางซ้าย (ตัวหาร) เพื่อให้ยอดตรงกับ Grand Total ใน Pivot Table
        if (rec.isLeftBase) {
            seen.add(num);
            list.push(rec);
        }
    });

    return list;
}

function setupFcrWeekFilters() {
    const container = document.getElementById('fcrWeekPills');
    if (!container) return;

    const weekMap = new Map();
    processedFcrData.forEach(d => {
        if (!weekMap.has(d.weekKey)) {
            weekMap.set(d.weekKey, { key: d.weekKey, label: d.weekLabel || d.weekKey, total: 0, fcr: 0 });
        }
        const w = weekMap.get(d.weekKey);
        w.total++;
        if (d.isRightFcr) w.fcr++;
    });

    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    let html = `<button class="quick-filter-btn ${fcrFilterWeek === 'all' ? 'active' : ''}" data-week="all" onclick="setFcrWeekFilter('all')">All Weeks (ผลรวมทั้งหมด)</button>`;
    sortedWeeks.forEach(w => {
        const pct = w.total > 0 ? Math.round((w.fcr / w.total) * 100) : 0;
        const badgeColor = pct > 90 ? 'text-teal-700' : 'text-red-600';
        html += `<button class="quick-filter-btn ${fcrFilterWeek === w.key ? 'active' : ''}" data-week="${w.key}" onclick="setFcrWeekFilter('${w.key}')">${w.label} <span class="${badgeColor} font-bold">(${pct}%)</span></button>`;
    });

    container.innerHTML = html;
}

window.setFcrWeekFilter = function(weekKey) {
    fcrTablePage = 1;
    fcrFilterWeek = weekKey;
    setupFcrWeekFilters();
    updateFcrDashboardView();
};

window.setFcrChannelGroupFilter = function(chGroup) {
    fcrTablePage = 1;
    fcrFilterChannelGroup = chGroup;
    document.querySelectorAll('#fcrChannelGroupPills .quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.chgroup === chGroup);
    });
    updateFcrDashboardView();
};

window.setFcrStatusFilter = function(status) {
    fcrTablePage = 1;
    fcrFilterStatus = status;
    document.querySelectorAll('#fcrStatusPills .quick-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.fcrstatus === status);
    });
    updateFcrDashboardView();
};

window.changeFcrTablePage = function(delta) {
    const totalPages = Math.ceil(lastFilteredFcrList.length / FCR_PAGE_SIZE) || 1;
    fcrTablePage = Math.min(Math.max(1, fcrTablePage + delta), totalPages);
    renderFcrTable(lastFilteredFcrList);
};

window.gotoFcrTablePage = function(page) {
    const totalPages = Math.ceil(lastFilteredFcrList.length / FCR_PAGE_SIZE) || 1;
    fcrTablePage = Math.min(Math.max(1, page), totalPages);
    renderFcrTable(lastFilteredFcrList);
};

function updateFcrDashboardView() {
    // 1. Base filter by selected Week
    let weekFiltered = processedFcrData.filter(d => d.isLeftBase);
    if (fcrFilterWeek !== 'all') {
        weekFiltered = weekFiltered.filter(d => d.weekKey === fcrFilterWeek);
    }

    // 2. Compute Pivot Tables & Summary Metrics on weekFiltered
    const channelStatsMap = new Map();
    let totalLeftAll = 0;
    let totalRightAll = 0;

    let leftVoice = 0, rightVoice = 0;
    let leftLine = 0, rightLine = 0;
    let leftOther = 0, rightOther = 0;

    weekFiltered.forEach(d => {
        const ch = d.channel || '(blank)';
        if (!channelStatsMap.has(ch)) {
            channelStatsMap.set(ch, { channel: ch, leftCount: 0, rightCount: 0 });
        }
        const st = channelStatsMap.get(ch);
        st.leftCount++;
        totalLeftAll++;

        if (d.isRightFcr) {
            st.rightCount++;
            totalRightAll++;
        }

        const grp = getFcrChannelGroup(ch);
        if (grp === 'voice') {
            leftVoice++;
            if (d.isRightFcr) rightVoice++;
        } else if (grp === 'line') {
            leftLine++;
            if (d.isRightFcr) rightLine++;
        } else {
            leftOther++;
            if (d.isRightFcr) rightOther++;
        }
    });

    // Sort channels alphabetically just like Excel Pivot Table (Email, LINE, MS Team, MS Team_Athena, Phone, Self-service)
    const sortedChannels = Array.from(channelStatsMap.values()).sort((a, b) => a.channel.localeCompare(b.channel));

    // Calculate percentages (Excel rounds to nearest integer, e.g. 91.58% -> 92%)
    const calcPct = (right, left) => left > 0 ? (right / left) * 100 : 0;

    const allPctExact = calcPct(totalRightAll, totalLeftAll);
    const voicePctExact = calcPct(rightVoice, leftVoice);
    const linePctExact = calcPct(rightLine, leftLine);
    const otherPctExact = calcPct(rightOther, leftOther);

    const allPctRound = Math.round(allPctExact);
    const voicePctRound = Math.round(voicePctExact);
    const linePctRound = Math.round(linePctExact);
    const otherPctRound = Math.round(otherPctExact);

    // Update 5 KPI Cards
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setWidth = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${Math.min(100, Math.max(0, pct))}%`; };

    setText('fcrAllPctCard', `${allPctRound}%`);
    setText('fcrAllExactPctCard', `(${allPctExact.toFixed(2)}%)`);
    setText('fcrAllRatioSub', `${totalRightAll.toLocaleString()} / ${totalLeftAll.toLocaleString()} เคส`);
    setWidth('fcrAllBar', allPctExact);

    const targetBadge = document.getElementById('fcrAllTargetBadge');
    const overallPassBadge = document.getElementById('fcrOverallPassBadge');
    const isPassTarget = allPctExact > 90;
    if (targetBadge) {
        targetBadge.textContent = isPassTarget ? '✅ PASS (>90%)' : '⚠️ BELOW 90%';
        targetBadge.className = isPassTarget
            ? 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700'
            : 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700';
    }
    if (overallPassBadge) {
        overallPassBadge.textContent = isPassTarget ? `✅ PASS (${allPctRound}% > 90%)` : `❌ BELOW TARGET (${allPctRound}%)`;
        overallPassBadge.className = isPassTarget
            ? 'text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500 text-white'
            : 'text-[10px] font-bold px-2.5 py-0.5 rounded bg-red-500 text-white';
    }

    setText('fcrVoicePctCard', `${voicePctRound}%`);
    setText('fcrVoiceExactPctCard', `(${voicePctExact.toFixed(2)}%)`);
    setText('fcrVoiceRatioSub', `${rightVoice.toLocaleString()} / ${leftVoice.toLocaleString()} เคส`);
    setWidth('fcrVoiceBar', voicePctExact);

    setText('fcrLinePctCard', `${linePctRound}%`);
    setText('fcrLineExactPctCard', `(${linePctExact.toFixed(2)}%)`);
    setText('fcrLineRatioSub', `${rightLine.toLocaleString()} / ${leftLine.toLocaleString()} เคส`);
    setWidth('fcrLineBar', linePctExact);

    setText('fcrOtherPctCard', `${otherPctRound}%`);
    setText('fcrOtherExactPctCard', `(${otherPctExact.toFixed(2)}%)`);
    setText('fcrOtherRatioSub', `${rightOther.toLocaleString()} / ${leftOther.toLocaleString()} เคส`);
    setWidth('fcrOtherBar', otherPctExact);

    const nonFcrCount = totalLeftAll - totalRightAll;
    setText('fcrGrandCountsCard', `${totalRightAll.toLocaleString()} / ${totalLeftAll.toLocaleString()}`);
    setText('fcrNonFcrDiffSub', `ส่วนต่าง Non-FCR: ${nonFcrCount.toLocaleString()} เคส`);

    // 3. Render Left Pivot Table (Total Base / ตัวหาร)
    const leftBody = document.getElementById('fcrLeftPivotBody');
    const leftFoot = document.getElementById('fcrLeftPivotFoot');
    if (leftBody && leftFoot) {
        if (sortedChannels.length === 0) {
            leftBody.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-400">ไม่มีข้อมูล</td></tr>`;
            leftFoot.innerHTML = `<tr><td class="px-4 py-2.5">Grand Total</td><td class="px-4 py-2.5 text-right">0</td></tr>`;
        } else {
            leftBody.innerHTML = sortedChannels.map(item => `
                <tr class="hover:bg-orange-50/40 transition-colors">
                    <td class="px-4 py-2 font-medium text-gray-800">${item.channel}</td>
                    <td class="px-4 py-2 text-right font-mono font-semibold text-gray-800">${item.leftCount.toLocaleString()}</td>
                </tr>
            `).join('');
            leftFoot.innerHTML = `
                <tr>
                    <td class="px-4 py-2.5 font-extrabold">Grand Total</td>
                    <td class="px-4 py-2.5 text-right font-mono text-sm font-black">${totalLeftAll.toLocaleString()}</td>
                </tr>
            `;
        }
    }

    // 4. Render Right Pivot Table (FCR Numerator / ตัวตั้ง)
    const rightBody = document.getElementById('fcrRightPivotBody');
    const rightFoot = document.getElementById('fcrRightPivotFoot');
    if (rightBody && rightFoot) {
        if (sortedChannels.length === 0) {
            rightBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400">ไม่มีข้อมูล</td></tr>`;
            rightFoot.innerHTML = `<tr><td class="px-4 py-2.5">Grand Total</td><td class="px-4 py-2.5 text-right">0</td><td class="px-4 py-2.5 text-right">0%</td></tr>`;
        } else {
            rightBody.innerHTML = sortedChannels.map(item => {
                const chPct = item.leftCount > 0 ? Math.round((item.rightCount / item.leftCount) * 100) : 0;
                const pctColor = chPct >= 90 ? 'text-teal-700 font-bold' : 'text-amber-700 font-semibold';
                return `
                    <tr class="hover:bg-orange-50/40 transition-colors">
                        <td class="px-4 py-2 font-medium text-gray-800">${item.channel}</td>
                        <td class="px-4 py-2 text-right font-mono font-semibold text-gray-800">${item.rightCount.toLocaleString()}</td>
                        <td class="px-4 py-2 text-right font-mono ${pctColor}">${chPct}%</td>
                    </tr>
                `;
            }).join('');
            rightFoot.innerHTML = `
                <tr>
                    <td class="px-4 py-2.5 font-extrabold">Grand Total</td>
                    <td class="px-4 py-2.5 text-right font-mono text-sm font-black">${totalRightAll.toLocaleString()}</td>
                    <td class="px-4 py-2.5 text-right font-mono text-sm font-black text-teal-800">${allPctRound}%</td>
                </tr>
            `;
        }
    }

    // 5. Render Summary Box (%FCR All Channel Table + Bar Chart)
    setText('fcrSummaryHeaderPct', `${allPctRound}%`);
    const summaryTbody = document.getElementById('fcrSummaryGroupTableBody');
    if (summaryTbody) {
        summaryTbody.innerHTML = `
            <tr class="hover:bg-gray-50">
                <td class="px-3.5 py-2 font-semibold text-gray-800">-Voice (Phone)</td>
                <td class="px-3.5 py-2 text-right font-mono text-gray-500 text-[11px]">${rightVoice.toLocaleString()} / ${leftVoice.toLocaleString()}</td>
                <td class="px-3.5 py-2 text-right font-mono font-bold ${voicePctRound >= 90 ? 'text-emerald-700' : 'text-amber-700'}">${voicePctRound}% <span class="text-[10px] font-normal text-gray-400">(${voicePctExact.toFixed(1)}%)</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
                <td class="px-3.5 py-2 font-semibold text-gray-800">-Non Voice (Line)</td>
                <td class="px-3.5 py-2 text-right font-mono text-gray-500 text-[11px]">${rightLine.toLocaleString()} / ${leftLine.toLocaleString()}</td>
                <td class="px-3.5 py-2 text-right font-mono font-bold ${linePctRound >= 90 ? 'text-emerald-700' : 'text-amber-700'}">${linePctRound}% <span class="text-[10px] font-normal text-gray-400">(${linePctExact.toFixed(1)}%)</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
                <td class="px-3.5 py-2 font-semibold text-gray-800">-Email + Other</td>
                <td class="px-3.5 py-2 text-right font-mono text-gray-500 text-[11px]">${rightOther.toLocaleString()} / ${leftOther.toLocaleString()}</td>
                <td class="px-3.5 py-2 text-right font-mono font-bold ${otherPctRound >= 90 ? 'text-emerald-700' : 'text-amber-700'}">${otherPctRound}% <span class="text-[10px] font-normal text-gray-400">(${otherPctExact.toFixed(1)}%)</span></td>
            </tr>
        `;
    }

    renderFcrChannelGroupChart(allPctRound, voicePctRound, linePctRound, otherPctRound);

    // 6. Filter Details Table by Channel Group, FCR Status, and Search Query
    let tableList = weekFiltered;

    if (fcrFilterChannelGroup !== 'all') {
        tableList = tableList.filter(d => getFcrChannelGroup(d.channel) === fcrFilterChannelGroup);
    }

    if (fcrFilterStatus === 'fcr') {
        tableList = tableList.filter(d => d.isRightFcr);
    } else if (fcrFilterStatus === 'non_fcr') {
        tableList = tableList.filter(d => !d.isRightFcr);
    }

    const q = (document.getElementById('fcrSearchInput')?.value || '').trim().toLowerCase();
    if (q) {
        tableList = tableList.filter(d =>
            d.number.toLowerCase().includes(q) ||
            d.channel.toLowerCase().includes(q) ||
            d.service.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q) ||
            d.state.toLowerCase().includes(q) ||
            d.assignee.toLowerCase().includes(q) ||
            d.applicationAcronym.toLowerCase().includes(q) ||
            d.shortDescription.toLowerCase().includes(q)
        );
    }

    renderFcrTable(tableList);
}

function renderFcrChannelGroupChart(allPct, voicePct, linePct, otherPct) {
    const chartEl = document.getElementById('fcrChannelGroupChart');
    if (!chartEl) return;

    if (chartInstances['fcrChannelGroup']) {
        try { chartInstances['fcrChannelGroup'].destroy(); } catch (e) {}
    }

    chartEl.innerHTML = '';
    const vals = [allPct, voicePct, linePct, otherPct];

    chartInstances['fcrChannelGroup'] = new ApexCharts(chartEl, {
        chart: {
            type: 'bar',
            height: 185,
            toolbar: { show: false },
            fontFamily: 'Inter, sans-serif'
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '52%',
                borderRadius: 6,
                distributed: true,
                dataLabels: { position: 'top' }
            }
        },
        colors: ['#0d9488', '#4f46e5', '#10b981', '#f59e0b'],
        dataLabels: {
            enabled: true,
            formatter: val => `${val}%`,
            offsetY: -18,
            style: { fontSize: '11px', fontWeight: 800, colors: ['#1e293b'] }
        },
        series: [{ name: '%FCR', data: vals }],
        xaxis: {
            categories: ['All Channel', 'Voice (Phone)', 'Non Voice (Line)', 'Email + Other'],
            labels: { style: { fontSize: '10px', fontWeight: 600 } }
        },
        yaxis: {
            min: 0,
            max: 105,
            tickAmount: 4,
            labels: { formatter: v => `${Math.round(v)}%`, style: { fontSize: '10px' } }
        },
        annotations: {
            yaxis: [{
                y: 90,
                borderColor: '#ef4444',
                strokeDashArray: 4,
                label: {
                    borderColor: '#ef4444',
                    style: { color: '#fff', background: '#ef4444', fontSize: '9px', fontWeight: 700 },
                    text: 'Target > 90%'
                }
            }]
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 3 }
    });
    chartInstances['fcrChannelGroup'].render();
}

function renderFcrTable(list) {
    lastFilteredFcrList = list || [];
    const tbody = document.getElementById('fcrTableBody');
    const empty = document.getElementById('emptyFcrTableState');
    const countBadge = document.getElementById('fcrTableCountBadge');
    const paginationBar = document.getElementById('fcrTablePaginationBar');
    const pageInfo = document.getElementById('fcrTablePageInfo');
    const paginationBtns = document.getElementById('fcrTablePaginationBtns');

    if (countBadge) countBadge.textContent = `${lastFilteredFcrList.length.toLocaleString()} รายการ`;
    if (!tbody) return;

    if (!lastFilteredFcrList.length) {
        tbody.innerHTML = '';
        empty?.classList.remove('hidden');
        if (paginationBar) paginationBar.classList.add('hidden');
        return;
    }

    empty?.classList.add('hidden');
    if (paginationBar) paginationBar.classList.remove('hidden');

    const totalPages = Math.ceil(lastFilteredFcrList.length / FCR_PAGE_SIZE) || 1;
    if (fcrTablePage > totalPages) fcrTablePage = totalPages;
    if (fcrTablePage < 1) fcrTablePage = 1;

    const startIdx = (fcrTablePage - 1) * FCR_PAGE_SIZE;
    const endIdx = Math.min(startIdx + FCR_PAGE_SIZE, lastFilteredFcrList.length);
    const paged = lastFilteredFcrList.slice(startIdx, endIdx);

    const isAdmin = userRole === 'admin';
    let html = '';

    paged.forEach((d, idx) => {
        const rowNum = startIdx + idx + 1;
        const fcrBadge = d.isRightFcr
            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">✅ FCR (ตัวตั้ง)</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">⚠️ Non-FCR (เฉพาะตัวหาร)</span>`;

        const stateLower = String(d.state || '').toLowerCase();
        const stateBadge = (stateLower === 'resolved' || stateLower === 'closed')
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">${d.state}</span>`
            : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">${d.state || '-'}</span>`;

        const remarkCell = isAdmin
            ? `<input type="text" data-id="${d._id}" value="${d.remark || ''}" placeholder="ระบุหมายเหตุ..." class="fcr-remark-input remark-input">`
            : `<span class="text-xs text-gray-600">${d.remark || '-'}</span>`;

        html += `
            <tr class="${d.isRightFcr ? 'hover:bg-teal-50/20' : 'bg-amber-50/20 hover:bg-amber-50/40'} transition-colors">
                <td class="px-3 py-2.5 text-center text-gray-400 font-bold">${rowNum}</td>
                <td class="px-4 py-2.5 font-mono font-bold text-gray-800">${d.number}</td>
                <td class="px-4 py-2.5 font-mono text-[11px] text-gray-600">${d.opened}</td>
                <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 font-semibold">${d.weekKey}</span></td>
                <td class="px-4 py-2.5 font-semibold text-gray-800">${d.channel}</td>
                <td class="px-4 py-2.5 text-gray-700">${d.service}</td>
                <td class="px-4 py-2.5 text-gray-700">${d.category}</td>
                <td class="px-4 py-2.5 text-center">${stateBadge}</td>
                <td class="px-4 py-2.5 text-center bg-teal-50/20">${fcrBadge}</td>
                <td class="px-4 py-2.5 text-gray-600">${d.applicationAcronym || '-'}</td>
                <td class="px-4 py-2.5 text-gray-700 max-w-[160px] truncate" title="${d.assignee}">${d.assignee || '-'}</td>
                <td class="px-4 py-2.5 text-gray-600 max-w-[220px] truncate" title="${d.shortDescription}">${d.shortDescription || '-'}</td>
                <td class="px-4 py-2.5">${remarkCell}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    if (pageInfo) {
        pageInfo.textContent = `แสดง ${(startIdx + 1).toLocaleString()} - ${endIdx.toLocaleString()} จาก ${lastFilteredFcrList.length.toLocaleString()} รายการ`;
    }

    if (paginationBtns) {
        paginationBtns.innerHTML = `
            <button onclick="gotoFcrTablePage(1)" ${fcrTablePage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">« แรกสุด</button>
            <button onclick="changeFcrTablePage(-1)" ${fcrTablePage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">‹ ก่อนหน้า</button>
            <span class="px-2.5 py-1 font-semibold text-teal-700 text-xs">${fcrTablePage} / ${totalPages}</span>
            <button onclick="changeFcrTablePage(1)" ${fcrTablePage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">ถัดไป ›</button>
            <button onclick="gotoFcrTablePage(${totalPages})" ${fcrTablePage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">ท้ายสุด »</button>
        `;
    }

    if (isAdmin) {
        tbody.querySelectorAll('.fcr-remark-input').forEach(input => {
            input.addEventListener('change', async e => {
                const rowId = e.target.dataset.id;
                const rec = processedFcrData.find(r => r._id === rowId);
                if (rec) {
                    rec.remark = e.target.value;
                    await saveFcrDataToDB([rec]);
                }
            });
        });
    }
}

window.exportFcrToCSV = function() {
    if (!lastFilteredFcrList.length) {
        alert('ไม่มีข้อมูล %FCR ให้ Export');
        return;
    }
    let csv = "\uFEFFNumber,Opened,Week,Channel,Service,Category,State,FCR Status,Application Acronym,Assignee,Short Description,Remarks\n";
    lastFilteredFcrList.forEach(d => {
        csv += [
            `"${d.number}"`,
            `"${d.opened}"`,
            `"${d.weekKey}"`,
            `"${d.channel}"`,
            `"${d.service}"`,
            `"${d.category}"`,
            `"${d.state}"`,
            `"${d.isRightFcr ? 'FCR (Counted)' : 'Non-FCR (Base Only)'}"`,
            `"${d.applicationAcronym || ''}"`,
            `"${d.assignee || ''}"`,
            `"${(d.shortDescription || '').replace(/"/g, '""')}"`,
            `"${(d.remark || '').replace(/"/g, '""')}"`
        ].join(',') + "\n";
    });
    const a = document.createElement('a');
    a.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    a.download = `FCR_Report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
};
