// State Management
let currentUser = null;
let usageChart = null;
const API_BASE = 'http://localhost:5000/api';

// Initialize Lucide Icons
lucide.createIcons();

// --- Auth Functions ---
function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (type === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
}

async function handleAuth(event, type) {
    event.preventDefault();
    const msgEl = document.getElementById('auth-msg');
    msgEl.textContent = 'Processing...';

    const url = type === 'login' ? `${API_BASE}/login` : `${API_BASE}/register`;
    const body = type === 'login' ? {
        username: document.getElementById('login-user').value,
        password: document.getElementById('login-pass').value
    } : {
        username: document.getElementById('reg-user').value,
        password: document.getElementById('reg-pass').value,
        role: document.getElementById('reg-role').value
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (response.ok) {
            if (type === 'login') {
                currentUser = data;
                localStorage.setItem('aqua_user', JSON.stringify(data));
                startDashboard();
            } else {
                msgEl.style.color = '#10b981';
                msgEl.textContent = 'Registration successful! Please login.';
                switchTab('login');
            }
        } else {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = data.error || 'Authentication failed';
        }
    } catch (err) {
        msgEl.textContent = 'Server connection error';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('aqua_user');
    window.location.reload();
}

// --- Dashboard Functions ---
function startDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display').textContent = `Welcome, ${currentUser.username}`;
    
    if (currentUser.role === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
    }

    initChart();
    updateStats();
    showView('overview');
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`${viewId}-view`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeItem = Array.from(document.querySelectorAll('.nav-item')).find(item => item.textContent.toLowerCase().includes(viewId));
    if (activeItem) activeItem.classList.add('active');

    if (viewId === 'blockchain') fetchBlockchain();
    if (viewId === 'admin') fetchAdminStats();
}

async function updateStats() {
    try {
        const res = await fetch(`${API_BASE}/history/${currentUser.id}`);
        const history = await res.json();
        
        const total = history.reduce((acc, curr) => acc + curr.usage, 0);
        document.getElementById('total-usage').textContent = `${total.toFixed(1)} L`;
        document.getElementById('limit-val').textContent = `${currentUser.daily_limit} L`;
        
        const percent = Math.min((total / currentUser.daily_limit) * 100, 100);
        document.getElementById('limit-progress').style.width = `${percent}%`;
        if (percent > 90) document.getElementById('limit-progress').style.backgroundColor = '#ef4444';

        // Update Chart
        const labels = history.slice(0, 7).reverse().map(h => h.timestamp.split(' ')[0]);
        const values = history.slice(0, 7).reverse().map(h => h.usage);
        
        usageChart.data.labels = labels;
        usageChart.data.datasets[0].data = values;
        usageChart.update();

        // Update block count
        const chainRes = await fetch(`${API_BASE}/blockchain`);
        const chainData = await chainRes.json();
        document.getElementById('block-count').textContent = chainData.length;
    } catch (err) { console.error(err); }
}

async function submitUsage(event) {
    event.preventDefault();
    const usage = document.getElementById('usage-input').value;
    const msgEl = document.getElementById('usage-msg');
    
    try {
        const res = await fetch(`${API_BASE}/submit_usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, usage })
        });
        
        if (res.ok) {
            msgEl.style.color = '#10b981';
            msgEl.textContent = 'Block mined and added to chain!';
            document.getElementById('usage-input').value = '';
            updateStats();
        }
    } catch (err) { msgEl.textContent = 'Submission failed'; }
}

async function fetchBlockchain() {
    const listEl = document.getElementById('blockchain-list');
    listEl.innerHTML = '<p>Loading ledger...</p>';
    
    try {
        const res = await fetch(`${API_BASE}/blockchain`);
        const data = await res.json();
        
        listEl.innerHTML = '';
        data.chain.forEach((block, index) => {
            const card = document.createElement('div');
            card.className = 'block-card';
            card.innerHTML = `
                <div class="block-header">
                    <span>BLOCK #${block.index}</span>
                    <span>${new Date(block.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <p><strong>User ID:</strong> ${block.user_id}</p>
                        <p><strong>Water Usage:</strong> ${block.usage_liters} L</p>
                        <p><strong>Nonce:</strong> ${block.nonce}</p>
                    </div>
                    <div style="text-align: right">
                        <p style="font-size: 0.7rem; color: var(--text-dim)">PREVIOUS HASH</p>
                        <p class="hash-val" style="color: var(--text-dim)">${block.previous_hash.substring(0, 32)}...</p>
                        <p style="font-size: 0.7rem; color: var(--text-dim); margin-top:5px">BLOCK HASH</p>
                        <p class="hash-val">${block.hash}</p>
                    </div>
                </div>
            `;
            listEl.prepend(card);
        });
        
        document.getElementById('chain-status').textContent = data.is_valid ? 'Verified' : 'Corrupted';
        document.getElementById('chain-status').style.background = data.is_valid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    } catch (err) { console.error(err); }
}

async function fetchAdminStats() {
    const body = document.querySelector('#admin-table tbody');
    body.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/admin/stats`);
        const users = await res.json();
        
        body.innerHTML = '';
        users.forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${u.username}</td>
                <td>${u.total_usage.toFixed(1)} L</td>
                <td>${u.record_count}</td>
                <td><span class="status-badge" style="background: ${u.total_usage > 500 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${u.total_usage > 500 ? 'var(--danger)' : 'var(--accent)'}">${u.total_usage > 500 ? 'Warning' : 'Normal'}</span></td>
            `;
            body.appendChild(row);
        });
    } catch (err) { console.error(err); }
}

function initChart() {
    const ctx = document.getElementById('usageChart').getContext('2d');
    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Water Consumption (Liters)',
                data: [],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Check for existing session
window.onload = () => {
    const saved = localStorage.getItem('aqua_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        startDashboard();
    }
}
