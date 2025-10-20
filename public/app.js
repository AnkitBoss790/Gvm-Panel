// Global state
let currentUser = null;
let currentTheme = 'light';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeEventListeners();
    loadTheme();
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            currentUser = await response.json();
            showDashboard();
            loadUserData();
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

// Show/Hide pages
function showLogin() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.remove('active');
}

function showRegister() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.add('active');
    document.getElementById('dashboardPage').classList.remove('active');
}

function showDashboard() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
}

// Initialize event listeners
function initializeEventListeners() {
    // Auth forms
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });

    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateTo(page);
        });
    });

    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // VPS actions
    document.getElementById('createVpsBtn')?.addEventListener('click', () => openModal('createVpsModal'));
    document.getElementById('createVpsForm')?.addEventListener('submit', handleCreateVps);

    // Admin actions
    document.getElementById('createUserBtn')?.addEventListener('click', () => showCreateUserModal());
    document.getElementById('createNodeBtn')?.addEventListener('click', () => showCreateNodeModal());
    document.getElementById('createApiKeyBtn')?.addEventListener('click', () => showCreateApiKeyModal());
    document.getElementById('createRedeemCodeBtn')?.addEventListener('click', () => showCreateRedeemCodeModal());

    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });

    // Profile forms
    document.getElementById('profileForm')?.addEventListener('submit', handleUpdateProfile);
    document.getElementById('passwordForm')?.addEventListener('submit', handleChangePassword);
    document.getElementById('themeForm')?.addEventListener('submit', handleUploadTheme);
    document.getElementById('redeemForm')?.addEventListener('submit', handleRedeemCode);

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            showDashboard();
            loadUserData();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Login failed: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const redeemCode = document.getElementById('regRedeemCode').value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, redeemCode })
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('Registration successful! Please login.', 'success');
            showLogin();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showNotification('Registration failed: ' + error.message, 'error');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showLogin();
        showNotification('Logged out successfully', 'info');
    } catch (error) {
        showNotification('Logout failed', 'error');
    }
}

// Load user data
async function loadUserData() {
    if (!currentUser) return;

    // Update UI with user info
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userCredits').textContent = currentUser.credits || 0;

    // Show/hide admin elements
    if (currentUser.role === 'admin') {
        document.body.classList.add('admin-mode');
    } else {
        document.body.classList.remove('admin-mode');
    }

    // Load dashboard stats
    loadDashboardStats();
    loadVpsList();
    loadUserTheme();
}

// Dashboard stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const stats = await response.json();

        document.getElementById('activeVpsCount').textContent = stats.activeVps || 0;
        document.getElementById('totalVpsCount').textContent = stats.totalVps || 0;
        document.getElementById('systemUptime').textContent = stats.uptime || 'N/A';
        
        if (stats.totalUsers !== undefined) {
            document.getElementById('totalUsersCount').textContent = stats.totalUsers;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// VPS Management
async function loadVpsList() {
    try {
        const response = await fetch('/api/vps');
        const vpsList = await response.json();

        renderVpsList(vpsList, 'dashboardVpsList');
        renderVpsList(vpsList, 'vpsList');

        if (currentUser.role === 'admin') {
            renderVpsTable(vpsList, 'adminVpsList');
        }
    } catch (error) {
        console.error('Failed to load VPS list:', error);
    }
}

function renderVpsList(vpsList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (vpsList.length === 0) {
        container.innerHTML = `
            <div class="no-vps-message">
                <i class="fas fa-server"></i>
                <h3>No VPS Instances</h3>
                <p>You don't have any VPS instances yet. Create one to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = vpsList.map(vps => `
        <div class="vps-card">
            <div class="vps-header">
                <div class="vps-name">${vps.name}</div>
                <span class="vps-status ${vps.status}">${vps.status.toUpperCase()}</span>
            </div>
            <div class="vps-specs">
                <div class="vps-spec">
                    <i class="fas fa-memory"></i>
                    <div class="value">${vps.ram}GB</div>
                    <div class="label">RAM</div>
                </div>
                <div class="vps-spec">
                    <i class="fas fa-microchip"></i>
                    <div class="value">${vps.cpu}</div>
                    <div class="label">CPU</div>
                </div>
                <div class="vps-spec">
                    <i class="fas fa-hdd"></i>
                    <div class="value">${vps.disk}GB</div>
                    <div class="label">Disk</div>
                </div>
            </div>
            <div class="vps-info">
                <div><strong>OS:</strong> <span>${vps.os}</span></div>
                <div><strong>SSH Port:</strong> <span>${vps.ssh_port}</span></div>
            </div>
            <div class="vps-actions">
                ${vps.status === 'stopped' ? 
                    `<button class="btn btn-success" onclick="startVps('${vps.id}')">
                        <i class="fas fa-play"></i> Start
                    </button>` :
                    `<button class="btn btn-warning" onclick="stopVps('${vps.id}')">
                        <i class="fas fa-stop"></i> Stop
                    </button>`
                }
                <button class="btn btn-info" onclick="restartVps('${vps.id}')">
                    <i class="fas fa-sync"></i> Restart
                </button>
                <button class="btn btn-info" onclick="manageVps('${vps.id}')">
                    <i class="fas fa-cog"></i> Manage
                </button>
            </div>
        </div>
    `).join('');
}

function renderVpsTable(vpsList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>RAM</th>
                    <th>CPU</th>
                    <th>Disk</th>
                    <th>OS</th>
                    <th>Status</th>
                    <th>SSH Port</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${vpsList.map(vps => `
                    <tr>
                        <td>${vps.name}</td>
                        <td>${vps.ram}GB</td>
                        <td>${vps.cpu}</td>
                        <td>${vps.disk}GB</td>
                        <td>${vps.os}</td>
                        <td><span class="vps-status ${vps.status}">${vps.status}</span></td>
                        <td>${vps.ssh_port}</td>
                        <td>
                            <button class="btn btn-info" onclick="manageVps('${vps.id}')">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="btn btn-danger" onclick="deleteVps('${vps.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function handleCreateVps(e) {
    e.preventDefault();

    const vpsData = {
        ram: document.getElementById('vpsRam').value,
        cpu: document.getElementById('vpsCpu').value,
        disk: document.getElementById('vpsDisk').value,
        os: document.getElementById('vpsOs').value,
        username: document.getElementById('vpsUsername').value,
        password: document.getElementById('vpsPassword').value,
        expiryDate: document.getElementById('vpsExpiry')?.value,
        tag: document.getElementById('vpsTag').value,
        selectedUser: document.getElementById('vpsUserSelect')?.value
    };

    try {
        const response = await fetch('/api/vps/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vpsData)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            closeModal('createVpsModal');
            loadUserData();
            e.target.reset();
        } else {
            showNotification(data.error || 'Failed to create VPS', 'error');
        }
    } catch (error) {
        showNotification('Failed to create VPS: ' + error.message, 'error');
    }
}

async function startVps(id) {
    try {
        const response = await fetch(`/api/vps/${id}/start`, { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            loadVpsList();
            loadDashboardStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to start VPS', 'error');
    }
}

async function stopVps(id) {
    try {
        const response = await fetch(`/api/vps/${id}/stop`, { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            loadVpsList();
            loadDashboardStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to stop VPS', 'error');
    }
}

async function restartVps(id) {
    try {
        const response = await fetch(`/api/vps/${id}/restart`, { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            loadVpsList();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to restart VPS', 'error');
    }
}

async function deleteVps(id) {
    if (!confirm('Are you sure you want to delete this VPS? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/vps/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            loadVpsList();
            loadDashboardStats();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to delete VPS', 'error');
    }
}

async function manageVps(id) {
    try {
        const response = await fetch('/api/vps');
        const vpsList = await response.json();
        const vps = vpsList.find(v => v.id === id);

        if (!vps) {
            showNotification('VPS not found', 'error');
            return;
        }

        const sshCommand = `ssh -p ${vps.ssh_port} ${vps.username}@localhost`;
        const tmateSetup = `apt install tmate -y && tmate -F`;

        document.getElementById('manageVpsTitle').textContent = `Manage: ${vps.name}`;
        document.getElementById('manageVpsContent').innerHTML = `
            <div style="padding: 30px;">
                <h3>VPS Details</h3>
                <div class="vps-info">
                    <div><strong>Name:</strong> ${vps.name}</div>
                    <div><strong>RAM:</strong> ${vps.ram}GB</div>
                    <div><strong>CPU:</strong> ${vps.cpu} Cores</div>
                    <div><strong>Disk:</strong> ${vps.disk}GB</div>
                    <div><strong>OS:</strong> ${vps.os}</div>
                    <div><strong>Status:</strong> <span class="vps-status ${vps.status}">${vps.status}</span></div>
                    <div><strong>Username:</strong> ${vps.username}</div>
                    <div><strong>Password:</strong> ${vps.password}</div>
                    <div><strong>SSH Port:</strong> ${vps.ssh_port}</div>
                    ${vps.tag ? `<div><strong>Tag:</strong> ${vps.tag}</div>` : ''}
                </div>

                <h3 style="margin-top: 30px;">SSH Access</h3>
                <div class="form-group">
                    <label>SSH Command</label>
                    <input type="text" value="${sshCommand}" readonly onclick="this.select()">
                </div>

                <h3 style="margin-top: 30px;">Tmate Setup</h3>
                <div class="form-group">
                    <label>Install & Start Tmate</label>
                    <input type="text" value="${tmateSetup}" readonly onclick="this.select()">
                </div>

                <div style="margin-top: 30px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${vps.status === 'stopped' ? 
                        `<button class="btn btn-success" onclick="startVps('${vps.id}'); closeModal('manageVpsModal');">
                            <i class="fas fa-play"></i> Start
                        </button>` :
                        `<button class="btn btn-warning" onclick="stopVps('${vps.id}'); closeModal('manageVpsModal');">
                            <i class="fas fa-stop"></i> Stop
                        </button>`
                    }
                    <button class="btn btn-info" onclick="restartVps('${vps.id}'); closeModal('manageVpsModal');">
                        <i class="fas fa-sync"></i> Restart
                    </button>
                    <button class="btn btn-info" onclick="openTerminal('${vps.id}')">
                        <i class="fas fa-terminal"></i> Web Terminal
                    </button>
                    <button class="btn btn-danger" onclick="deleteVps('${vps.id}'); closeModal('manageVpsModal');">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;

        openModal('manageVpsModal');
    } catch (error) {
        showNotification('Failed to load VPS details', 'error');
    }
}

function openTerminal(vpsId) {
    closeModal('manageVpsModal');
    openModal('terminalModal');
    document.getElementById('terminalOutput').innerHTML = 
        '<div style="color: #0f0;">Web Terminal - Connected to VPS\n' +
        'Note: This is a simulated terminal for demonstration.\n' +
        'In production, this would connect to the actual VPS via WebSocket.\n\n' +
        'Type commands and press Enter...\n\n</div>';

    const terminalInput = document.getElementById('terminalInput');
    terminalInput.focus();

    terminalInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            const command = this.value;
            document.getElementById('terminalOutput').innerHTML += `$ ${command}\n`;
            document.getElementById('terminalOutput').innerHTML += `Command executed: ${command}\n\n`;
            this.value = '';
        }
    };
}

// Admin functions
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();

        const container = document.getElementById('usersList');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Credits</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>${user.credits}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-danger" onclick="deleteUser(${user.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Load user select for VPS creation
        const userSelect = document.getElementById('vpsUserSelect');
        if (userSelect) {
            userSelect.innerHTML = '<option value="">Current User</option>' +
                users.map(user => `<option value="${user.id}">${user.username}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function showCreateUserModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New User</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="createUserForm" style="padding: 30px;">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="newUserUsername" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="newUserEmail" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="newUserPassword" required>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="newUserRole" required>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Create User</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('createUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const userData = {
            username: document.getElementById('newUserUsername').value,
            email: document.getElementById('newUserEmail').value,
            password: document.getElementById('newUserPassword').value,
            role: document.getElementById('newUserRole').value
        };

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                showNotification('User created successfully', 'success');
                modal.remove();
                loadUsers();
            } else {
                const data = await response.json();
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('Failed to create user', 'error');
        }
    };
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('User deleted successfully', 'success');
            loadUsers();
        } else {
            showNotification('Failed to delete user', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete user', 'error');
    }
}

async function loadNodes() {
    try {
        const response = await fetch('/api/admin/nodes');
        const nodes = await response.json();

        const container = document.getElementById('nodesList');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>RAM</th>
                        <th>CPU</th>
                        <th>Disk</th>
                        <th>Status</th>
                        <th>Token</th>
                    </tr>
                </thead>
                <tbody>
                    ${nodes.map(node => `
                        <tr>
                            <td>${node.name}</td>
                            <td>${node.ram}GB</td>
                            <td>${node.cpu}</td>
                            <td>${node.disk}GB</td>
                            <td><span class="vps-status ${node.status}">${node.status}</span></td>
                            <td><button class="btn btn-info" onclick="showNodeToken('${node.token}')">View Token</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load nodes:', error);
    }
}

function showCreateNodeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create Node</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="createNodeForm" style="padding: 30px;">
                <div class="form-group">
                    <label>Node Name</label>
                    <input type="text" id="nodeName" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>RAM (GB)</label>
                        <input type="number" id="nodeRam" required>
                    </div>
                    <div class="form-group">
                        <label>CPU Cores</label>
                        <input type="number" id="nodeCpu" required>
                    </div>
                    <div class="form-group">
                        <label>Disk (GB)</label>
                        <input type="number" id="nodeDisk" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>SSH Host</label>
                    <input type="text" id="nodeSshHost" required placeholder="192.168.1.100">
                </div>
                <div class="form-group">
                    <label>SSH Password</label>
                    <input type="password" id="nodeSshPassword" required>
                </div>
                <button type="submit" class="btn-primary">Create Node</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('createNodeForm').onsubmit = async (e) => {
        e.preventDefault();
        const nodeData = {
            name: document.getElementById('nodeName').value,
            ram: document.getElementById('nodeRam').value,
            cpu: document.getElementById('nodeCpu').value,
            disk: document.getElementById('nodeDisk').value,
            sshHost: document.getElementById('nodeSshHost').value,
            sshPassword: document.getElementById('nodeSshPassword').value
        };

        try {
            const response = await fetch('/api/admin/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nodeData)
            });

            const data = await response.json();
            if (response.ok) {
                showNotification('Node created successfully', 'success');
                showNodeToken(data.token);
                modal.remove();
                loadNodes();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('Failed to create node', 'error');
        }
    };
}

function showNodeToken(token) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Node Setup Token</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 30px;">
                <h3>Setup Command</h3>
                <p>Copy and run this command on your node server:</p>
                <div class="form-group">
                    <input type="text" value="curl -sSL https://your-panel-url/setup.sh | bash -s ${token}" readonly onclick="this.select()">
                </div>
                <h3 style="margin-top: 20px;">Token</h3>
                <div class="form-group">
                    <input type="text" value="${token}" readonly onclick="this.select()">
                </div>
                <p style="color: var(--warning-color); margin-top: 15px;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Save this token securely. You won't be able to see it again.
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function loadApiKeys() {
    try {
        const response = await fetch('/api/admin/api-keys');
        const keys = await response.json();

        const container = document.getElementById('apiKeysList');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Key</th>
                        <th>Role</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${keys.map(key => `
                        <tr>
                            <td>${key.name}</td>
                            <td><code>${key.key}</code></td>
                            <td>${key.role}</td>
                            <td>${new Date(key.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load API keys:', error);
    }
}

function showCreateApiKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create API Key</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="createApiKeyForm" style="padding: 30px;">
                <div class="form-group">
                    <label>Key Name</label>
                    <input type="text" id="apiKeyName" required placeholder="e.g., Production API">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="apiKeyRole" required>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Create API Key</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('createApiKeyForm').onsubmit = async (e) => {
        e.preventDefault();
        const keyData = {
            name: document.getElementById('apiKeyName').value,
            role: document.getElementById('apiKeyRole').value
        };

        try {
            const response = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keyData)
            });

            const data = await response.json();
            if (response.ok) {
                showNotification('API key created successfully', 'success');
                showApiKey(data.key);
                modal.remove();
                loadApiKeys();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('Failed to create API key', 'error');
        }
    };
}

function showApiKey(key) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Your API Key</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 30px;">
                <p>Copy this API key. You won't be able to see it again!</p>
                <div class="form-group">
                    <input type="text" value="${key}" readonly onclick="this.select()">
                </div>
                <button class="btn-primary" onclick="navigator.clipboard.writeText('${key}'); showNotification('Copied to clipboard!', 'success')">
                    <i class="fas fa-copy"></i> Copy to Clipboard
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function loadRedeemCodes() {
    try {
        const response = await fetch('/api/admin/redeem-codes');
        const codes = await response.json();

        const container = document.getElementById('redeemCodesList');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Credits</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${codes.map(code => `
                        <tr>
                            <td><code>${code.code}</code></td>
                            <td>${code.name}</td>
                            <td>${code.credits}</td>
                            <td>${code.used ? '✅ Used' : '⏳ Available'}</td>
                            <td>${new Date(code.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load redeem codes:', error);
    }
}

function showCreateRedeemCodeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create Redeem Code</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="createRedeemCodeForm" style="padding: 30px;">
                <div class="form-group">
                    <label>Code Name</label>
                    <input type="text" id="redeemCodeName" required placeholder="e.g., Promotion 2024">
                </div>
                <div class="form-group">
                    <label>Credits</label>
                    <input type="number" id="redeemCodeCredits" required min="1" value="100">
                </div>
                <button type="submit" class="btn-primary">Generate Code</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('createRedeemCodeForm').onsubmit = async (e) => {
        e.preventDefault();
        const codeData = {
            name: document.getElementById('redeemCodeName').value,
            credits: document.getElementById('redeemCodeCredits').value
        };

        try {
            const response = await fetch('/api/admin/redeem-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(codeData)
            });

            const data = await response.json();
            if (response.ok) {
                showNotification(`Code created: ${data.code}`, 'success');
                modal.remove();
                loadRedeemCodes();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('Failed to create redeem code', 'error');
        }
    };
}

// Profile functions
async function handleUpdateProfile(e) {
    e.preventDefault();
    const profileData = {
        username: document.getElementById('profileUsername').value,
        email: document.getElementById('profileEmail').value
    };

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            checkAuth(); // Reload user data
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to update profile', 'error');
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const passwordData = {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value
    };

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(passwordData)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            e.target.reset();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to change password', 'error');
    }
}

async function handleUploadTheme(e) {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('themeUpload');
    formData.append('theme', fileInput.files[0]);

    try {
        const response = await fetch('/api/profile/theme', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('Theme uploaded successfully', 'success');
            applyCustomTheme(data.imagePath);
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to upload theme', 'error');
    }
}

async function loadUserTheme() {
    try {
        const response = await fetch('/api/profile/theme');
        const data = await response.json();
        if (data.imagePath) {
            applyCustomTheme(data.imagePath);
        }
    } catch (error) {
        console.error('Failed to load user theme:', error);
    }
}

function applyCustomTheme(imagePath) {
    const dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage) {
        dashboardPage.style.backgroundImage = `url(${imagePath})`;
        dashboardPage.style.backgroundSize = 'cover';
        dashboardPage.style.backgroundPosition = 'center';
        dashboardPage.style.backgroundAttachment = 'fixed';
    }
}

async function handleRedeemCode(e) {
    e.preventDefault();
    const code = document.getElementById('redeemCodeInput').value;

    try {
        const response = await fetch('/api/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const data = await response.json();
        if (response.ok) {
            showNotification(data.message, 'success');
            e.target.reset();
            checkAuth(); // Reload credits
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to redeem code', 'error');
    }
}

// Navigation
function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    // Update content views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    const pageMap = {
        'dashboard': 'dashboardView',
        'vps': 'vpsView',
        'plans': 'plansView',
        'admin-panel': 'adminPanelView',
        'profile': 'profileView'
    };

    const viewId = pageMap[page];
    if (viewId) {
        document.getElementById(viewId)?.classList.add('active');
        document.getElementById('pageTitle').textContent = 
            page.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Load data for specific pages
    if (page === 'profile') {
        loadProfileData();
    } else if (page === 'admin-panel') {
        loadUsers();
        loadNodes();
        loadApiKeys();
        loadRedeemCodes();
    }
}

function loadProfileData() {
    if (currentUser) {
        document.getElementById('profileUsername').value = currentUser.username;
        document.getElementById('profileEmail').value = currentUser.email;
    }
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.admin-tab[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabMap = {
        'users': 'adminUsersTab',
        'allvps': 'adminAllVpsTab',
        'nodes': 'adminNodesTab',
        'apikeys': 'adminApiKeysTab',
        'redeem': 'adminRedeemTab'
    };

    document.getElementById(tabMap[tabName])?.classList.add('active');

    // Load data for the tab
    if (tabName === 'users') loadUsers();
    else if (tabName === 'nodes') loadNodes();
    else if (tabName === 'apikeys') loadApiKeys();
    else if (tabName === 'redeem') loadRedeemCodes();
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);

    const themeBtn = document.getElementById('themeToggle');
    if (currentTheme === 'dark') {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        themeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        }
    }
}

// Modal helpers
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Make functions globally available
window.startVps = startVps;
window.stopVps = stopVps;
window.restartVps = restartVps;
window.deleteVps = deleteVps;
window.manageVps = manageVps;
window.openTerminal = openTerminal;
window.deleteUser = deleteUser;
window.showNodeToken = showNodeToken;
window.closeModal = closeModal;
