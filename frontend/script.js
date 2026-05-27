const BACKEND_ENDPOINT = 'http://localhost:5000/api/items';
const AUTH_ENDPOINT = 'http://localhost:5000/api/auth/login';

let memoryRegistry = [];
let queryFilters = { search: '', category: 'All', condition: 'All' };

let chartObjCat = null;
let chartObjCond = null;
let chartObjTime = null;

const interfaceRoutes = {
    '#/dashboard': 'view-dashboard',
    '#/inventory': 'view-inventory',
    '#/rooms': 'view-rooms',
    '#/add-asset': 'view-add-asset'
};

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener('hashchange', applicationRouter);
    document.getElementById("loginForm").addEventListener("submit", processWorkspaceLogin);
    document.getElementById("assetWriteForm").addEventListener("submit", processFormPostRequest);
    
    // Evaluate if token exists before configuring views
    evaluateAuthenticationState();
});

// Helper: Generates authorization headers containing active session token
function getSecurityHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('matrix_token')}`
    };
}

// Session Validator Controller
function evaluateAuthenticationState() {
    const token = localStorage.getItem('matrix_token');
    const shell = document.getElementById("applicationContentShell");
    const loginScreen = document.getElementById("view-login");

    if (token) {
        shell.classList.remove("hidden");
        loginScreen.style.display = "none";
        
        if (!window.location.hash || window.location.hash === '#/login' || !interfaceRoutes[window.location.hash]) {
            window.location.hash = '#/dashboard';
        } else {
            applicationRouter();
        }
        fetchDatabaseClusterRecords();
    } else {
        shell.classList.add("hidden");
        loginScreen.style.display = "flex";
        window.location.hash = '#/login';
    }
}

// Process Login Form Pipeline Verification
async function processWorkspaceLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById("loginUsername").value;
    const passwordInput = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(AUTH_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login Exception generated.');

        localStorage.setItem('matrix_token', data.token);
        localStorage.setItem('matrix_user', data.username);
        showToast(`Clearance Granted. Welcome ${data.username}`, 'success');
        
        document.getElementById("loginForm").reset();
        evaluateAuthenticationState();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Verification rejected.', 'error');
    }
}

// Terminal Session Destroyer
function terminateSessionLogout() {
    localStorage.removeItem('matrix_token');
    localStorage.removeItem('matrix_user');
    showToast('Secure terminal connection killed.', 'success');
    evaluateAuthenticationState();
}

// Single Page Redirection Application Route Interceptor 
function applicationRouter() {
    if (!localStorage.getItem('matrix_token')) {
        evaluateAuthenticationState();
        return;
    }

    const activeHash = window.location.hash;
    const targets = Object.values(interfaceRoutes);
    const renderTargetId = interfaceRoutes[activeHash];

    targets.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = (id === renderTargetId) ? 'block' : 'none';
    });

    Object.keys(interfaceRoutes).forEach(hash => {
        const linkElement = document.getElementById(`link-${interfaceRoutes[hash].replace('view-', '')}`);
        if (linkElement) {
            if (hash === activeHash) {
                linkElement.className = "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200/60 scale-[1.02]";
            } else {
                linkElement.className = "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50";
            }
        }
    });
}

// Global Core Data Collector Pipeline
async function fetchDatabaseClusterRecords() {
    try {
        const response = await fetch(BACKEND_ENDPOINT, { headers: getSecurityHeaders() });
        if (response.status === 401 || response.status === 403) {
            terminateSessionLogout();
            return;
        }
        if (!response.ok) throw new Error('Data collection exception generated.');
        memoryRegistry = await response.json();
        evaluateAndSyncInterfaceViews();
    } catch (err) {
        console.error(err);
        showToast('Database server offline or uncommunicative.', 'error');
    }
}

// Global Data Orchestrator Model Processor
function evaluateAndSyncInterfaceViews() {
    let processStream = [...memoryRegistry];

    if (queryFilters.search.trim() !== '') {
        const token = queryFilters.search.toLowerCase();
        processStream = processStream.filter(i => 
            i.brand.toLowerCase().includes(token) || 
            i.model.toLowerCase().includes(token) ||
            (i.room && i.room.toLowerCase().includes(token))
        );
    }

    if (queryFilters.category !== 'All') {
        processStream = processStream.filter(i => i.category === queryFilters.category);
    }

    if (queryFilters.condition !== 'All') {
        processStream = processStream.filter(i => i.condition === queryFilters.condition);
    }

    renderStandardInventoryGrid(processStream);
    generateDashboardAggregates(memoryRegistry); 
    generateAdvancedRoomAllocationMap(memoryRegistry);
}

function generateDashboardAggregates(items) {
    let unitsLogged = 0;
    let workingUnits = 0;
    let faultyUnits = 0;

    const mappingCategories = { Keyboard: 0, Mouse: 0, Monitor: 0, CPU: 0 };
    const mappingConditions = { Working: 0, Faulty: 0, Repair: 0 };
    const chronologicalTimeline = {};

    items.forEach(i => {
        const itemQuantity = Number(i.quantity) || 0;
        unitsLogged += itemQuantity;

        if (i.condition === 'Working') workingUnits += itemQuantity;
        if (i.condition === 'Faulty') faultyUnits += itemQuantity;

        mappingConditions[i.condition] = (mappingConditions[i.condition] || 0) + itemQuantity;
        mappingCategories[i.category] = (mappingCategories[i.category] || 0) + itemQuantity;

        if (i.purchaseDate) {
            const dateObj = new Date(i.purchaseDate);
            const timeKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            chronologicalTimeline[timeKey] = (chronologicalTimeline[timeKey] || 0) + itemQuantity;
        }
    });

    document.getElementById("dash-total").innerText = unitsLogged;
    document.getElementById("dash-working").innerText = workingUnits;
    document.getElementById("dash-faulty").innerText = faultyUnits;

    renderChartVisualizations(mappingConditions, mappingCategories, chronologicalTimeline);
}

function renderChartVisualizations(conds, cats, historyTimeline) {
    if (chartObjCat) chartObjCat.destroy();
    chartObjCat = new Chart(document.getElementById("chartCategories").getContext("2d"), {
        type: 'bar',
        data: {
            labels: Object.keys(cats),
            datasets: [{ label: 'Units Allocated', data: Object.values(cats), backgroundColor: '#2563eb', borderRadius: 6, maxBarThickness: 32 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
    });

    if (chartObjCond) chartObjCond.destroy();
    chartObjCond = new Chart(document.getElementById("chartCondition").getContext("2d"), {
        type: 'doughnut',
        data: {
            labels: Object.keys(conds),
            datasets: [{ data: Object.values(conds), backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'], borderWidth: 2, borderColor: '#ffffff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { weight: 'bold' } } } }, cutout: '70%' }
    });

    if (chartObjTime) chartObjTime.destroy();
    const sortedTimelineKeys = Object.keys(historyTimeline).sort();
    const sortedTimelineValues = sortedTimelineKeys.map(k => historyTimeline[k]);

    chartObjTime = new Chart(document.getElementById("chartTimeline").getContext("2d"), {
        type: 'line',
        data: {
            labels: sortedTimelineKeys,
            datasets: [{ label: 'Procurements', data: sortedTimelineValues, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.05)', fill: true, tension: 0.35, borderWidth: 3, pointBackgroundColor: '#6366f1' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { color: '#f1f5f9' } } } }
    });
}

function renderStandardInventoryGrid(items) {
    const wrapper = document.getElementById("cardsGridContainer");
    wrapper.innerHTML = "";
    document.getElementById("inv-count-string").innerText = `Total Distinct Tracked Records: ${items.length}`;

    if (items.length === 0) {
        wrapper.innerHTML = `
            <div class="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                <span class="material-symbols-outlined text-slate-300 text-4xl mb-2">inventory</span>
                <p class="text-slate-400 font-medium text-xs">No inventory elements matched criteria metrics filters.</p>
            </div>`;
        return;
    }

    items.forEach(i => {
        const card = document.createElement("div");
        card.className = "bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 flex flex-col justify-between group border-l-4";
        let customLeftBorder = "border-l-slate-300";
        let contextualStateColors = "bg-slate-50 text-slate-700 border-slate-200";
        
        if (i.condition === 'Working') { contextualStateColors = "bg-emerald-50 text-emerald-700 border-emerald-200/60"; customLeftBorder = "border-l-emerald-500"; }
        if (i.condition === 'Faulty') { contextualStateColors = "bg-rose-50 text-rose-700 border-rose-200/60"; customLeftBorder = "border-l-rose-500"; }
        if (i.condition === 'Repair') { contextualStateColors = "bg-amber-50 text-amber-700 border-amber-200/60"; customLeftBorder = "border-l-amber-500"; }
        card.className += ` ${customLeftBorder}`;

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span class="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/40">${i.category}</span>
                        <h4 class="text-base font-bold text-slate-800 mt-1.5 group-hover:text-blue-600 transition-colors">${i.brand} <span class="font-medium text-slate-500">${i.model}</span></h4>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg border ${contextualStateColors}">${i.condition}</span>
                </div>
                <div class="space-y-1.5 text-xs text-slate-500 my-4 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    <p class="truncate"><strong class="text-slate-700 font-medium">Specs:</strong> ${i.specs || 'None defined'}</p>
                    <p class="flex items-center gap-1"><strong class="text-slate-700 font-medium">Location:</strong> <span class="inline-flex items-center text-slate-600 font-semibold"><span class="material-symbols-outlined text-xs text-slate-400 mr-0.5">location_on</span>${i.room || 'Unassigned'}</span></p>
                </div>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-100">
                <span class="text-xs text-slate-400 font-medium">Stock Capacity: <strong class="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-md ml-1">${i.quantity}</strong></span>
                <div class="flex gap-1">
                    <button onclick="triggerUpdatePipeline('${i._id}')" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><span class="material-symbols-outlined text-lg">edit</span></button>
                    <button onclick="triggerDeletePipeline('${i._id}')" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><span class="material-symbols-outlined text-lg">delete</span></button>
                </div>
            </div>`;
        wrapper.appendChild(card);
    });
}

function generateAdvancedRoomAllocationMap(items) {
    const wrapper = document.getElementById("roomsViewContainer");
    wrapper.innerHTML = "";
    const roomBins = {};
    items.forEach(i => {
        const allocationName = (i.room && i.room.trim() !== '') ? i.room.trim() : 'Unassigned Facilities Container';
        if (!roomBins[allocationName]) roomBins[allocationName] = [];
        roomBins[allocationName].push(i);
    });

    Object.keys(roomBins).forEach(roomName => {
        const facilityBlock = document.createElement("div");
        facilityBlock.className = "bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] space-y-4 relative overflow-hidden";
        let innerGridRows = '';
        let cumulativeQty = 0;

        roomBins[roomName].forEach(asset => {
            cumulativeQty += asset.quantity;
            innerGridRows += `
                <div class="flex justify-between items-center text-xs py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/40 px-1 rounded transition">
                    <span class="font-medium text-slate-700">${asset.brand} ${asset.model} <span class="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded ml-1">${asset.category}</span></span>
                    <div class="flex items-center gap-2">
                        <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold ${asset.condition === 'Working' ? 'bg-emerald-50 text-emerald-700' : asset.condition === 'Faulty' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}">${asset.condition}</span>
                        <span class="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">x${asset.quantity}</span>
                    </div>
                </div>`;
        });

        facilityBlock.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 class="font-bold text-slate-800 flex items-center gap-2"><span class="material-symbols-outlined text-slate-400 text-xl">meeting_room</span> ${roomName}</h3>
                <span class="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-bold">Units Connected: ${cumulativeQty}</span>
            </div>
            <div class="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1 scrollbar-thin">${innerGridRows}</div>`;
        wrapper.appendChild(facilityBlock);
    });
}

function applyFilters() {
    queryFilters.category = document.getElementById("filterCategory").value;
    queryFilters.condition = document.getElementById("filterCondition").value;
    evaluateAndSyncInterfaceViews();
}

function triggerSearchQuery(val) {
    queryFilters.search = val;
    evaluateAndSyncInterfaceViews();
}

async function processFormPostRequest(e) {
    e.preventDefault();
    const currentId = document.getElementById("formAssetId").value;
    const bodyObjectPayload = {
        category: document.getElementById("assetCategory").value,
        brand: document.getElementById("assetBrand").value,
        model: document.getElementById("assetModel").value,
        room: document.getElementById("assetRoom").value || 'Unassigned',
        quantity: Number(document.getElementById("assetQuantity").value),
        purchaseDate: document.getElementById("assetDate").value || undefined,
        condition: document.getElementById("assetCondition").value,
        specs: document.getElementById("assetSpecs").value
    };

    const targetUrl = currentId ? `${BACKEND_ENDPOINT}/${currentId}` : BACKEND_ENDPOINT;
    const httpVerb = currentId ? 'PUT' : 'POST';

    try {
        const response = await fetch(targetUrl, {
            method: httpVerb,
            headers: getSecurityHeaders(),
            body: JSON.stringify(bodyObjectPayload)
        });

        if (!response.ok) throw new Error('CRUD validation pipeline error.');
        showToast(currentId ? 'Asset deployment updated.' : 'New hardware asset deployed.', 'success');
        resetFormToDefaults();
        await fetchDatabaseClusterRecords();
        window.location.hash = '#/inventory';
    } catch (err) {
        console.error(err);
        showToast('Failed to deploy record variables.', 'error');
    }
}

function triggerUpdatePipeline(id) {
    const selectedAsset = memoryRegistry.find(x => x._id === id);
    if (!selectedAsset) return;

    document.getElementById("formAssetId").value = selectedAsset._id;
    document.getElementById("assetCategory").value = selectedAsset.category;
    document.getElementById("assetBrand").value = selectedAsset.brand;
    document.getElementById("assetModel").value = selectedAsset.model;
    document.getElementById("assetRoom").value = selectedAsset.room || '';
    document.getElementById("assetQuantity").value = selectedAsset.quantity;
    document.getElementById("assetDate").value = selectedAsset.purchaseDate ? selectedAsset.purchaseDate.split('T')[0] : '';
    document.getElementById("assetCondition").value = selectedAsset.condition;
    document.getElementById("assetSpecs").value = selectedAsset.specs || '';

    document.getElementById("formHeader").innerText = "Modify Operational Entity Data";
    document.getElementById("formSubmitBtn").innerText = "Apply Delta Updates";
    document.getElementById("formCancelBtn").classList.remove("hidden");
    window.location.hash = '#/add-asset';
}

function resetFormToDefaults() {
    document.getElementById("formAssetId").value = "";
    document.getElementById("assetWriteForm").reset();
    document.getElementById("formHeader").innerText = "Add System Hardware";
    document.getElementById("formSubmitBtn").innerText = "Commit Record";
    document.getElementById("formCancelBtn").classList.add("hidden");
}

async function triggerDeletePipeline(id) {
    if (!confirm("Are you sure you want to permanently delete this asset record?")) return;
    try {
        const response = await fetch(`${BACKEND_ENDPOINT}/${id}`, { method: 'DELETE', headers: getSecurityHeaders() });
        if (!response.ok) throw new Error('Deletion execution failure.');
        showToast('Asset stripped from cluster logs.', 'success');
        await fetchDatabaseClusterRecords();
    } catch (err) {
        console.error(err);
        showToast('Could not clear entity record.', 'error');
    }
}

function exportToCSV() {
    if (memoryRegistry.length === 0) {
        showToast('No logged asset logs available to compile data exports.', 'error');
        return;
    }
    let compiledCsvBuffer = "ID,Category,Brand,Model,Room,Quantity,PurchaseDate,Condition,Specifications\n";
    memoryRegistry.forEach(i => {
        compiledCsvBuffer += `"${i._id}","${i.category}","${i.brand}","${i.model}","${i.room || 'Unassigned'}","${i.quantity}","${i.purchaseDate || ''}","${i.condition}","${(i.specs || '').replace(/"/g, '""')}"\n`;
    });
    const fileBlobElement = new Blob([compiledCsvBuffer], { type: 'text/csv;charset=utf-8;' });
    const virtualLinkElement = document.createElement("a");
    virtualLinkElement.href = URL.createObjectURL(fileBlobElement);
    virtualLinkElement.setAttribute("download", `AssetMatrix_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(virtualLinkElement);
    virtualLinkElement.click();
    document.body.removeChild(virtualLinkElement);
    showToast('CSV compilation complete.', 'success');
}

function showToast(text, designType = 'success') {
    const parentContainer = document.getElementById("toastContainer");
    const toastNode = document.createElement("div");
    toastNode.className = `p-4 rounded-xl text-xs font-bold text-white shadow-xl flex items-center gap-2.5 transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto backdrop-blur-md ${designType === 'success' ? 'bg-slate-900/95 border border-slate-800' : 'bg-rose-600/95 border border-rose-500'}`;
    toastNode.innerHTML = `<span class="material-symbols-outlined text-base ${designType === 'success' ? 'text-emerald-400' : 'text-white'}">${designType === 'success' ? 'check_circle' : 'error'}</span> ${text}`;
    parentContainer.appendChild(toastNode);
    setTimeout(() => { toastNode.classList.remove("translate-y-2", "opacity-0"); }, 10);
    setTimeout(() => {
        toastNode.classList.add("opacity-0", "translate-y-1");
        setTimeout(() => { toastNode.remove(); }, 300);
    }, 3500);
}