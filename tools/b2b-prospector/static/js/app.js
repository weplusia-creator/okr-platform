// B2B Prospector - Frontend App
const API = '/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentView = 'dashboard';

// ---- API Helper ----
async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: { ...headers, ...opts.headers },
    });

    if (res.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
    }
    if (res.status === 204) return null;
    return res.json();
}

async function apiUpload(path, formData) {
    const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error);
    }
    return res.json();
}

// ---- Toast ----
function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ---- Auth ----
function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    render();
}

function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-page">
            <div class="login-box">
                <h1>B2B Prospector</h1>
                <p>Sales prospecting tool</p>
                <div id="auth-tabs" class="tabs" style="justify-content:center;border:none;margin-bottom:16px">
                    <div class="tab active" onclick="showAuthTab('login')">Login</div>
                    <div class="tab" onclick="showAuthTab('register')">Register</div>
                </div>
                <form id="auth-form" onsubmit="handleAuth(event)">
                    <div id="name-field" class="form-group" style="display:none">
                        <label>Name</label>
                        <input name="name" placeholder="Your name">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input name="email" type="email" placeholder="email@company.com" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input name="password" type="password" placeholder="Min 8 characters" required>
                    </div>
                    <button class="btn btn-primary" style="width:100%">Login</button>
                </form>
            </div>
        </div>`;
}

window.showAuthTab = function(tab) {
    document.querySelectorAll('#auth-tabs .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    const nameField = document.getElementById('name-field');
    const btn = document.querySelector('#auth-form button');
    if (tab === 'register') {
        nameField.style.display = 'block';
        btn.textContent = 'Register';
    } else {
        nameField.style.display = 'none';
        btn.textContent = 'Login';
    }
    document.getElementById('auth-form').dataset.mode = tab;
};

window.handleAuth = async function(e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.dataset.mode || 'login';
    const body = {
        email: form.email.value,
        password: form.password.value,
    };
    if (mode === 'register') body.name = form.name.value;

    try {
        const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) });
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        toast('Welcome, ' + currentUser.name, 'success');
        render();
    } catch (err) {
        toast(err.message, 'error');
    }
};

// ---- Main Layout ----
function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="app">
            <aside class="sidebar">
                <h1>B2B Prospector</h1>
                <nav>
                    <a href="#" data-view="dashboard" class="${currentView === 'dashboard' ? 'active' : ''}">Dashboard</a>
                    <a href="#" data-view="prospects" class="${currentView === 'prospects' ? 'active' : ''}">Prospects</a>
                    <a href="#" data-view="pipeline" class="${currentView === 'pipeline' ? 'active' : ''}">Pipeline</a>
                    <a href="#" data-view="interactions" class="${currentView === 'interactions' ? 'active' : ''}">Interactions</a>
                    <a href="#" data-view="reminders" class="${currentView === 'reminders' ? 'active' : ''}">Reminders</a>
                    <a href="#" data-view="templates" class="${currentView === 'templates' ? 'active' : ''}">AI Templates</a>
                    <a href="#" data-view="scoring" class="${currentView === 'scoring' ? 'active' : ''}">Scoring</a>
                </nav>
                <div style="position:absolute;bottom:20px;left:0;right:0;padding:0 20px">
                    <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">${currentUser.name}</div>
                    <button class="btn btn-outline btn-sm" onclick="logout()" style="width:100%">Logout</button>
                </div>
            </aside>
            <main class="main" id="content"></main>
        </div>`;

    // Nav click handlers
    document.querySelectorAll('.sidebar nav a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            currentView = a.dataset.view;
            renderApp();
        });
    });

    loadView();
}

async function loadView() {
    const content = document.getElementById('content');
    try {
        switch (currentView) {
            case 'dashboard': await renderDashboard(content); break;
            case 'prospects': await renderProspects(content); break;
            case 'pipeline': await renderPipeline(content); break;
            case 'interactions': await renderInteractions(content); break;
            case 'reminders': await renderReminders(content); break;
            case 'templates': await renderTemplates(content); break;
            case 'scoring': await renderScoring(content); break;
        }
    } catch (err) {
        content.innerHTML = `<div class="card"><p>Error: ${err.message}</p></div>`;
    }
}

// ---- Dashboard ----
async function renderDashboard(el) {
    const data = await api('/dashboard');
    const pv = parseFloat(data.pipeline_value) || 0;
    const wv = parseFloat(data.won_value) || 0;
    const totalProspects = data.prospects_by_status.reduce((s, r) => s + r.count, 0);
    const weeklyTotal = data.weekly_activity.reduce((s, r) => s + r.count, 0);

    el.innerHTML = `
        <div class="header"><h2>Dashboard</h2></div>
        <div class="card-grid">
            <div class="stat-card"><div class="label">Total Prospects</div><div class="value">${totalProspects}</div></div>
            <div class="stat-card"><div class="label">Pipeline Value</div><div class="value">$${pv.toLocaleString()}</div></div>
            <div class="stat-card"><div class="label">Won Value</div><div class="value" style="color:var(--success)">$${wv.toLocaleString()}</div></div>
            <div class="stat-card"><div class="label">Activity This Week</div><div class="value">${weeklyTotal}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="card">
                <h3 style="margin-bottom:12px">By Status</h3>
                ${data.prospects_by_status.map(r => `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
                        <span>${r.status}</span><span style="font-weight:600">${r.count}</span>
                    </div>`).join('')}
            </div>
            <div class="card">
                <h3 style="margin-bottom:12px">By Score</h3>
                ${data.prospects_by_score.map(r => `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
                        <span class="badge badge-${r.score_label === 'ready_to_close' ? 'ready' : r.score_label}">${r.score_label}</span>
                        <span style="font-weight:600">${r.count}</span>
                    </div>`).join('')}
            </div>
        </div>
        <div class="card" style="margin-top:16px">
            <h3 style="margin-bottom:12px">Top Prospects</h3>
            <div class="table-wrapper"><table>
                <thead><tr><th>Company</th><th>Contact</th><th>Score</th><th>Value</th></tr></thead>
                <tbody>
                    ${data.top_prospects.map(p => `<tr>
                        <td>${p.company_name}</td><td>${p.contact_name}</td>
                        <td><span class="badge badge-${p.score_label === 'ready_to_close' ? 'ready' : p.score_label}">${p.score}</span></td>
                        <td>$${parseFloat(p.estimated_value || 0).toLocaleString()}</td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>
        ${data.stale_prospects.length > 0 ? `
        <div class="card" style="margin-top:16px">
            <h3 style="margin-bottom:12px;color:var(--warning)">Stale Prospects (14+ days no contact)</h3>
            <div class="table-wrapper"><table>
                <thead><tr><th>Company</th><th>Contact</th><th>Days</th><th>Score</th></tr></thead>
                <tbody>
                    ${data.stale_prospects.map(p => `<tr>
                        <td>${p.company_name}</td><td>${p.contact_name}</td>
                        <td style="color:var(--warning)">${p.days_since_contact}d</td>
                        <td>${p.score}</td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>` : ''}`;
}

// ---- Prospects ----
let prospectPage = 1;
async function renderProspects(el) {
    el.innerHTML = `
        <div class="header">
            <h2>Prospects</h2>
            <div style="display:flex;gap:8px">
                <button class="btn btn-outline btn-sm" onclick="exportCsv()">Export CSV</button>
                <button class="btn btn-outline btn-sm" onclick="showImportModal()">Import CSV</button>
                <button class="btn btn-primary" onclick="showProspectModal()">+ New Prospect</button>
            </div>
        </div>
        <div class="search-bar">
            <input id="p-search" placeholder="Search company or contact..." onkeyup="debounceProspects()">
            <select id="p-industry" onchange="loadProspectList()"><option value="">All Industries</option></select>
            <select id="p-score" onchange="loadProspectList()">
                <option value="">All Scores</option>
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="ready_to_close">Ready to Close</option>
            </select>
        </div>
        <div id="prospect-list"></div>`;

    await loadProspectList();
}

let debounceTimer;
window.debounceProspects = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadProspectList, 300); };

async function loadProspectList() {
    const search = document.getElementById('p-search')?.value || '';
    const industry = document.getElementById('p-industry')?.value || '';
    const score_label = document.getElementById('p-score')?.value || '';
    const params = new URLSearchParams({ page: prospectPage, per_page: 20 });
    if (search) params.set('search', search);
    if (industry) params.set('industry', industry);
    if (score_label) params.set('score_label', score_label);

    const data = await api(`/prospects?${params}`);
    const list = document.getElementById('prospect-list');
    if (!list) return;

    list.innerHTML = `
        <div class="table-wrapper"><table>
            <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Industry</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
                ${data.data.map(p => `<tr>
                    <td><a href="#" onclick="viewProspect('${p.id}')" style="color:var(--primary)">${p.company_name}</a></td>
                    <td>${p.contact_name}</td>
                    <td>${p.email || '-'}</td>
                    <td>${p.industry || '-'}</td>
                    <td><span class="badge badge-${p.score_label === 'ready_to_close' ? 'ready' : p.score_label}">${p.score}</span></td>
                    <td>${p.status}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="showProspectModal('${p.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProspect('${p.id}')">Del</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table></div>
        <div class="pagination">
            <button ${data.page <= 1 ? 'disabled' : ''} onclick="prospectPage=${data.page - 1};loadProspectList()">Prev</button>
            <span style="padding:6px 12px;color:var(--text-muted)">${data.page} / ${data.total_pages}</span>
            <button ${data.page >= data.total_pages ? 'disabled' : ''} onclick="prospectPage=${data.page + 1};loadProspectList()">Next</button>
        </div>`;
}

window.viewProspect = async function(id) {
    const data = await api(`/prospects/${id}`);
    const timeline = await api(`/prospects/${id}/timeline`);

    const modal = createModal('Prospect Detail');
    modal.querySelector('.modal-body').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div>
                <h3 style="font-size:20px">${data.company_name}</h3>
                <p style="color:var(--text-muted)">${data.contact_name} - ${data.contact_title || 'N/A'}</p>
                <div style="margin-top:12px;font-size:13px">
                    <p>Email: ${data.email || '-'}</p>
                    <p>Phone: ${data.phone || '-'}</p>
                    <p>Industry: ${data.industry || '-'}</p>
                    <p>Size: ${data.company_size || '-'}</p>
                    <p>Location: ${data.city || ''} ${data.country || '-'}</p>
                </div>
            </div>
            <div style="text-align:right">
                <span class="badge badge-${data.score_label === 'ready_to_close' ? 'ready' : data.score_label}" style="font-size:16px;padding:4px 12px">
                    Score: ${data.score}
                </span>
                <p style="margin-top:8px;color:var(--text-muted)">Status: ${data.status}</p>
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                    <button class="btn btn-sm btn-primary" onclick="showAiModal('${id}')">Generate AI Message</button>
                    <button class="btn btn-sm btn-outline" onclick="showAddInteraction('${id}')">+ Interaction</button>
                </div>
            </div>
        </div>
        ${data.tags && data.tags.length > 0 ? `<div style="margin-bottom:16px">${data.tags.map(t => `<span style="display:inline-block;padding:2px 8px;margin-right:4px;border-radius:4px;background:${t.color};font-size:11px">${t.name}</span>`).join('')}</div>` : ''}
        <h4 style="margin-bottom:12px">Timeline</h4>
        <div class="timeline">
            ${timeline.map(t => `
                <div class="timeline-item">
                    <div class="time">${new Date(t.timestamp).toLocaleString()} - ${t.user_name}</div>
                    <strong>${t.type}: ${t.title || ''}</strong>
                    ${t.detail ? `<p style="font-size:13px;color:var(--text-muted);margin-top:4px">${t.detail}</p>` : ''}
                    ${t.outcome ? `<p style="font-size:12px;color:var(--success)">Outcome: ${t.outcome}</p>` : ''}
                </div>`).join('')}
            ${timeline.length === 0 ? '<p style="color:var(--text-muted)">No activity yet</p>' : ''}
        </div>`;
};

window.showProspectModal = async function(id) {
    const modal = createModal(id ? 'Edit Prospect' : 'New Prospect');
    let data = {};
    if (id) {
        data = await api(`/prospects/${id}`);
    }

    modal.querySelector('.modal-body').innerHTML = `
        <form id="prospect-form" onsubmit="saveProspect(event, '${id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Company Name *</label><input name="company_name" value="${data.company_name || ''}" required></div>
                <div class="form-group"><label>Contact Name *</label><input name="contact_name" value="${data.contact_name || ''}" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Contact Title</label><input name="contact_title" value="${data.contact_title || ''}"></div>
                <div class="form-group"><label>Email</label><input name="email" type="email" value="${data.email || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input name="phone" value="${data.phone || ''}"></div>
                <div class="form-group"><label>LinkedIn URL</label><input name="linkedin_url" value="${data.linkedin_url || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Website</label><input name="website" value="${data.website || ''}"></div>
                <div class="form-group"><label>Industry</label><input name="industry" value="${data.industry || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Company Size</label>
                    <select name="company_size">
                        <option value="">Select...</option>
                        ${['1-9','10-99','100-999','1000+'].map(s => `<option value="${s}" ${data.company_size === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Country</label><input name="country" value="${data.country || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>City</label><input name="city" value="${data.city || ''}"></div>
                <div class="form-group"><label>Estimated Value ($)</label><input name="estimated_value" type="number" step="0.01" value="${data.estimated_value || ''}"></div>
            </div>
            <div class="form-group"><label>Notes</label><textarea name="notes">${data.notes || ''}</textarea></div>
            <button class="btn btn-primary" style="width:100%">${id ? 'Update' : 'Create'} Prospect</button>
        </form>`;
};

window.saveProspect = async function(e, id) {
    e.preventDefault();
    const form = e.target;
    const body = {};
    new FormData(form).forEach((v, k) => { if (v) body[k] = v; });
    if (body.estimated_value) body.estimated_value = parseFloat(body.estimated_value);

    try {
        if (id) {
            await api(`/prospects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
            toast('Prospect updated', 'success');
        } else {
            await api('/prospects', { method: 'POST', body: JSON.stringify(body) });
            toast('Prospect created', 'success');
        }
        closeModal();
        loadProspectList();
    } catch (err) { toast(err.message, 'error'); }
};

window.deleteProspect = async function(id) {
    if (!confirm('Delete this prospect?')) return;
    try {
        await api(`/prospects/${id}`, { method: 'DELETE' });
        toast('Deleted', 'success');
        loadProspectList();
    } catch (err) { toast(err.message, 'error'); }
};

window.exportCsv = () => {
    window.open(`${API}/prospects/export/csv`, '_blank');
};

window.showImportModal = function() {
    const modal = createModal('Import CSV');
    modal.querySelector('.modal-body').innerHTML = `
        <p style="margin-bottom:16px;color:var(--text-muted)">CSV columns: company_name, contact_name, contact_title, email, phone, linkedin_url, website, industry, company_size, country, city, estimated_value, notes</p>
        <form id="import-form" onsubmit="handleImport(event)">
            <div class="form-group">
                <input type="file" name="file" accept=".csv" required style="padding:8px">
            </div>
            <button class="btn btn-primary" style="width:100%">Import</button>
        </form>`;
};

window.handleImport = async function(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    try {
        const result = await apiUpload('/prospects/import', fd);
        toast(`Imported ${result.imported} prospects. ${result.errors.length} errors.`, result.errors.length > 0 ? 'warning' : 'success');
        closeModal();
        loadProspectList();
    } catch (err) { toast(err.message, 'error'); }
};

// ---- Pipeline ----
async function renderPipeline(el) {
    const data = await api('/pipeline');

    el.innerHTML = `
        <div class="header">
            <h2>Sales Pipeline</h2>
            <button class="btn btn-outline btn-sm" onclick="loadPipelineMetrics()">View Metrics</button>
        </div>
        <div class="pipeline-board">
            ${data.map(s => `
                <div class="pipeline-column" data-stage="${s.stage.id}">
                    <div class="pipeline-column-header" style="border-top:3px solid ${s.stage.color}">
                        <h3>${s.stage.name}</h3>
                        <span class="count">${s.count} | $${s.total_value.toLocaleString()}</span>
                    </div>
                    <div class="pipeline-cards">
                        ${s.prospects.map(p => `
                            <div class="pipeline-card" onclick="viewProspect('${p.id}')">
                                <div class="company">${p.company_name}</div>
                                <div class="contact">${p.contact_name}</div>
                                <div class="meta">
                                    <span class="badge badge-${p.score_label === 'ready_to_close' ? 'ready' : p.score_label}">${p.score}</span>
                                    <span>$${parseFloat(p.estimated_value || 0).toLocaleString()}</span>
                                </div>
                                <div style="margin-top:8px">
                                    <select onchange="moveProspect('${p.id}', this.value)" onclick="event.stopPropagation()" style="width:100%;padding:4px;font-size:11px">
                                        <option value="">Move to...</option>
                                        ${data.filter(st => st.stage.id !== s.stage.id).map(st => `<option value="${st.stage.id}">${st.stage.name}</option>`).join('')}
                                    </select>
                                </div>
                            </div>`).join('')}
                        ${s.prospects.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px;font-size:13px">No prospects</p>' : ''}
                    </div>
                </div>`).join('')}
        </div>
        <div id="pipeline-metrics"></div>`;
}

window.moveProspect = async function(prospectId, stageId) {
    if (!stageId) return;
    try {
        await api('/pipeline/move', { method: 'POST', body: JSON.stringify({ prospect_id: prospectId, to_stage_id: stageId }) });
        toast('Prospect moved', 'success');
        renderPipeline(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

window.loadPipelineMetrics = async function() {
    const data = await api('/pipeline/metrics');
    const div = document.getElementById('pipeline-metrics');
    div.innerHTML = `
        <div class="card" style="margin-top:16px">
            <h3 style="margin-bottom:12px">Pipeline Metrics</h3>
            <div class="card-grid">
                <div class="stat-card"><div class="label">Total in Pipeline</div><div class="value">${data.total_prospects}</div></div>
                <div class="stat-card"><div class="label">Total Value</div><div class="value">$${data.total_value.toLocaleString()}</div></div>
            </div>
            <div class="table-wrapper"><table>
                <thead><tr><th>Stage</th><th>Count</th><th>Value</th><th>Conversion</th></tr></thead>
                <tbody>
                    ${data.stages.map(s => `<tr>
                        <td>${s.stage_name}</td>
                        <td>${s.count}</td>
                        <td>$${s.total_value.toLocaleString()}</td>
                        <td>${s.conversion_rate.toFixed(1)}%</td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>`;
};

// ---- Interactions ----
async function renderInteractions(el) {
    el.innerHTML = `
        <div class="header">
            <h2>Interactions</h2>
        </div>
        <div id="interaction-list"></div>`;
    await loadInteractionList();
}

async function loadInteractionList() {
    const data = await api('/interactions?per_page=50');
    const list = document.getElementById('interaction-list');
    if (!list) return;

    list.innerHTML = `
        <div class="table-wrapper"><table>
            <thead><tr><th>Date</th><th>Type</th><th>Subject</th><th>By</th><th>Outcome</th></tr></thead>
            <tbody>
                ${data.data.map(i => `<tr>
                    <td>${new Date(i.created_at).toLocaleDateString()}</td>
                    <td><span class="badge" style="background:var(--bg-input)">${i.interaction_type}</span></td>
                    <td>${i.subject || '-'}</td>
                    <td>${i.user_name}</td>
                    <td>${i.outcome || '-'}</td>
                </tr>`).join('')}
            </tbody>
        </table></div>`;
}

window.showAddInteraction = function(prospectId) {
    const modal = createModal('New Interaction');
    modal.querySelector('.modal-body').innerHTML = `
        <form onsubmit="saveInteraction(event, '${prospectId}')">
            <div class="form-group"><label>Type</label>
                <select name="interaction_type" required>
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="linkedin_message">LinkedIn Message</option>
                    <option value="note">Note</option>
                </select>
            </div>
            <div class="form-group"><label>Subject</label><input name="subject"></div>
            <div class="form-group"><label>Details</label><textarea name="body"></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Outcome</label><input name="outcome"></div>
                <div class="form-group"><label>Duration (min)</label><input name="duration_minutes" type="number"></div>
            </div>
            <button class="btn btn-primary" style="width:100%">Save Interaction</button>
        </form>`;
};

window.saveInteraction = async function(e, prospectId) {
    e.preventDefault();
    const form = e.target;
    const body = { prospect_id: prospectId };
    new FormData(form).forEach((v, k) => { if (v) body[k] = v; });
    if (body.duration_minutes) body.duration_minutes = parseInt(body.duration_minutes);
    try {
        await api('/interactions', { method: 'POST', body: JSON.stringify(body) });
        toast('Interaction saved', 'success');
        closeModal();
    } catch (err) { toast(err.message, 'error'); }
};

// ---- AI ----
window.showAiModal = function(prospectId) {
    const modal = createModal('Generate AI Message');
    modal.querySelector('.modal-body').innerHTML = `
        <form onsubmit="generateAi(event, '${prospectId}')">
            <div class="form-row">
                <div class="form-group"><label>Message Type</label>
                    <select name="message_type">
                        <option value="first_contact">First Contact</option>
                        <option value="follow_up">Follow Up</option>
                        <option value="proposal">Proposal</option>
                        <option value="closing">Closing</option>
                    </select>
                </div>
                <div class="form-group"><label>Tone</label>
                    <select name="tone">
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="consultive">Consultive</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Additional Context</label><textarea name="additional_context" placeholder="Any extra info for the AI..."></textarea></div>
            <button class="btn btn-primary" style="width:100%">Generate</button>
        </form>
        <div id="ai-result" style="margin-top:16px;display:none">
            <h4>Generated Message</h4>
            <div class="card" style="margin-top:8px">
                <p style="font-weight:600" id="ai-subject"></p>
                <pre style="white-space:pre-wrap;margin-top:8px;font-family:inherit;font-size:13px;color:var(--text-muted)" id="ai-body"></pre>
            </div>
        </div>`;
};

window.generateAi = async function(e, prospectId) {
    e.preventDefault();
    const form = e.target;
    const body = { prospect_id: prospectId };
    new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

    const btn = form.querySelector('button');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    try {
        const result = await api('/ai/generate', { method: 'POST', body: JSON.stringify(body) });
        document.getElementById('ai-result').style.display = 'block';
        document.getElementById('ai-subject').textContent = `Subject: ${result.subject}`;
        document.getElementById('ai-body').textContent = result.body;
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.textContent = 'Generate';
        btn.disabled = false;
    }
};

// ---- Reminders ----
async function renderReminders(el) {
    const reminders = await api('/reminders');
    const due = await api('/reminders/due');

    el.innerHTML = `
        <div class="header"><h2>Reminders</h2></div>
        ${due.length > 0 ? `
        <div class="card" style="border-color:var(--warning);margin-bottom:16px">
            <h3 style="color:var(--warning);margin-bottom:12px">Due Now (${due.length})</h3>
            ${due.map(r => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
                    <div>
                        <strong>${r.company_name}</strong> - ${r.prospect_name}<br>
                        <span style="font-size:13px;color:var(--text-muted)">${r.message}</span>
                    </div>
                    <button class="btn btn-sm btn-success" onclick="completeReminder('${r.id}')">Done</button>
                </div>`).join('')}
        </div>` : ''}
        <div class="card">
            <h3 style="margin-bottom:12px">All Reminders</h3>
            <div class="table-wrapper"><table>
                <thead><tr><th>Due</th><th>Company</th><th>Contact</th><th>Message</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    ${reminders.map(r => `<tr style="${r.is_completed ? 'opacity:0.5' : ''}">
                        <td>${new Date(r.remind_at).toLocaleDateString()}</td>
                        <td>${r.company_name}</td>
                        <td>${r.prospect_name}</td>
                        <td>${r.message}</td>
                        <td>${r.is_completed ? 'Done' : 'Pending'}</td>
                        <td>
                            ${!r.is_completed ? `<button class="btn btn-sm btn-success" onclick="completeReminder('${r.id}')">Done</button>` : ''}
                            <button class="btn btn-sm btn-danger" onclick="deleteReminder('${r.id}')">Del</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table></div>
        </div>`;
}

window.completeReminder = async function(id) {
    try {
        await api(`/reminders/${id}/complete`, { method: 'POST' });
        toast('Reminder completed', 'success');
        renderReminders(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

window.deleteReminder = async function(id) {
    try {
        await api(`/reminders/${id}`, { method: 'DELETE' });
        toast('Reminder deleted', 'success');
        renderReminders(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

// ---- Templates ----
async function renderTemplates(el) {
    const templates = await api('/templates');

    el.innerHTML = `
        <div class="header">
            <h2>AI Templates</h2>
            <button class="btn btn-primary" onclick="showTemplateModal()">+ New Template</button>
        </div>
        <div class="table-wrapper"><table>
            <thead><tr><th>Name</th><th>Type</th><th>Tone</th><th>Actions</th></tr></thead>
            <tbody>
                ${templates.map(t => `<tr>
                    <td>${t.name}</td>
                    <td>${t.template_type}</td>
                    <td>${t.tone}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="showTemplateModal('${t.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.id}')">Del</button>
                    </td>
                </tr>`).join('')}
                ${templates.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No templates yet</td></tr>' : ''}
            </tbody>
        </table></div>`;
}

window.showTemplateModal = async function(id) {
    const modal = createModal(id ? 'Edit Template' : 'New Template');
    let data = {};
    if (id) {
        const templates = await api('/templates');
        data = templates.find(t => t.id === id) || {};
    }

    modal.querySelector('.modal-body').innerHTML = `
        <form onsubmit="saveTemplate(event, '${id || ''}')">
            <div class="form-group"><label>Name</label><input name="name" value="${data.name || ''}" required></div>
            <div class="form-row">
                <div class="form-group"><label>Type</label>
                    <select name="template_type">
                        ${['first_contact','follow_up','proposal','closing'].map(t => `<option value="${t}" ${data.template_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Tone</label>
                    <select name="tone">
                        ${['formal','casual','consultive'].map(t => `<option value="${t}" ${data.tone === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Subject Template</label><input name="subject_template" value="${data.subject_template || ''}"></div>
            <div class="form-group"><label>Body Template</label><textarea name="body_template" style="min-height:150px">${data.body_template || ''}</textarea></div>
            <button class="btn btn-primary" style="width:100%">Save</button>
        </form>`;
};

window.saveTemplate = async function(e, id) {
    e.preventDefault();
    const form = e.target;
    const body = {};
    new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

    try {
        if (id) {
            await api(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await api('/templates', { method: 'POST', body: JSON.stringify(body) });
        }
        toast('Template saved', 'success');
        closeModal();
        renderTemplates(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

window.deleteTemplate = async function(id) {
    if (!confirm('Delete template?')) return;
    try {
        await api(`/templates/${id}`, { method: 'DELETE' });
        toast('Deleted', 'success');
        renderTemplates(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

// ---- Scoring ----
async function renderScoring(el) {
    const criteria = await api('/scoring/criteria');

    el.innerHTML = `
        <div class="header">
            <h2>Lead Scoring Configuration</h2>
            <div style="display:flex;gap:8px">
                <button class="btn btn-outline" onclick="recalculateAll()">Recalculate All</button>
                <button class="btn btn-primary" onclick="showCriteriaModal()">+ Add Criteria</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:16px">
            <h4 style="margin-bottom:8px">Score Ranges</h4>
            <p style="font-size:13px;color:var(--text-muted)">
                <span class="badge badge-cold">0-25: Cold</span>
                <span class="badge badge-warm" style="margin-left:8px">26-50: Warm</span>
                <span class="badge badge-hot" style="margin-left:8px">51-75: Hot</span>
                <span class="badge badge-ready" style="margin-left:8px">76-100: Ready to Close</span>
            </p>
        </div>
        <div class="table-wrapper"><table>
            <thead><tr><th>Name</th><th>Field</th><th>Value</th><th>Points</th><th>Weight</th><th>Active</th><th></th></tr></thead>
            <tbody>
                ${criteria.map(c => `<tr>
                    <td>${c.name}</td>
                    <td>${c.field_name}</td>
                    <td>${c.field_value || '-'}</td>
                    <td style="font-weight:600;color:${c.points >= 0 ? 'var(--success)' : 'var(--danger)'}">${c.points > 0 ? '+' : ''}${c.points}</td>
                    <td>${c.weight}</td>
                    <td>${c.is_active ? 'Yes' : 'No'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteCriteria('${c.id}')">Del</button></td>
                </tr>`).join('')}
            </tbody>
        </table></div>`;
}

window.recalculateAll = async function() {
    try {
        const result = await api('/scoring/recalculate-all', { method: 'POST' });
        toast(`Recalculated ${result.recalculated} prospects`, 'success');
    } catch (err) { toast(err.message, 'error'); }
};

window.showCriteriaModal = function() {
    const modal = createModal('Add Scoring Criteria');
    modal.querySelector('.modal-body').innerHTML = `
        <form onsubmit="saveCriteria(event)">
            <div class="form-group"><label>Name</label><input name="name" required></div>
            <div class="form-row">
                <div class="form-group"><label>Field</label>
                    <select name="field_name">
                        <option value="company_size">Company Size</option>
                        <option value="industry">Industry</option>
                        <option value="contact_title">Contact Title</option>
                        <option value="email">Has Email</option>
                        <option value="phone">Has Phone</option>
                        <option value="linkedin_url">Has LinkedIn</option>
                        <option value="last_interaction">Last Interaction</option>
                    </select>
                </div>
                <div class="form-group"><label>Value</label><input name="field_value" placeholder="e.g., Technology, 1000+, C-Level"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Points</label><input name="points" type="number" required></div>
                <div class="form-group"><label>Weight (0-2)</label><input name="weight" type="number" step="0.1" value="1.0"></div>
            </div>
            <button class="btn btn-primary" style="width:100%">Add Criteria</button>
        </form>`;
};

window.saveCriteria = async function(e) {
    e.preventDefault();
    const body = {};
    new FormData(e.target).forEach((v, k) => { if (v) body[k] = v; });
    body.points = parseInt(body.points);
    if (body.weight) body.weight = parseFloat(body.weight);

    try {
        await api('/scoring/criteria', { method: 'POST', body: JSON.stringify(body) });
        toast('Criteria added', 'success');
        closeModal();
        renderScoring(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

window.deleteCriteria = async function(id) {
    if (!confirm('Delete criteria?')) return;
    try {
        await api(`/scoring/criteria/${id}`, { method: 'DELETE' });
        toast('Deleted', 'success');
        renderScoring(document.getElementById('content'));
    } catch (err) { toast(err.message, 'error'); }
};

// ---- Modal Helpers ----
function createModal(title) {
    let overlay = document.querySelector('.modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body"></div>
        </div>`;
    overlay.classList.add('active');
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    return overlay.querySelector('.modal');
}

window.closeModal = function() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.classList.remove('active');
};

// ---- Init ----
function render() {
    if (!token || !currentUser) {
        renderLogin();
    } else {
        renderApp();
    }
}

render();
