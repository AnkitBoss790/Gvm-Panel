const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const { exec, spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./gvm_panel.db');

// Initialize database
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    credits INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // VPS table
  db.run(`CREATE TABLE IF NOT EXISTS vps (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    ram INTEGER NOT NULL,
    cpu INTEGER NOT NULL,
    disk INTEGER NOT NULL,
    os TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    ssh_port INTEGER NOT NULL,
    status TEXT DEFAULT 'stopped',
    expiry_date DATE,
    tag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Nodes table
  db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ram INTEGER NOT NULL,
    cpu INTEGER NOT NULL,
    disk INTEGER NOT NULL,
    ssh_host TEXT NOT NULL,
    ssh_password TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'offline',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // API Keys table
  db.run(`CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Redeem Codes table
  db.run(`CREATE TABLE IF NOT EXISTS redeem_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Themes table
  db.run(`CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Create default admin user
  const defaultPassword = bcrypt.hashSync('admin', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role, credits) 
          VALUES ('admin', 'admin@gvmpanel.com', ?, 'admin', 99999)`, [defaultPassword]);
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: 'gvm-panel-secret-key-' + uuidv4(),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/themes/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session.userId && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden - Admin only' });
  }
};

// ============ AUTH ROUTES ============

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (bcrypt.compareSync(password, user.password)) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// Register
app.post('/api/register', (req, res) => {
  const { username, email, password, redeemCode } = req.body;

  // Validate redeem code
  db.get('SELECT * FROM redeem_codes WHERE code = ? AND used = 0', [redeemCode], (err, code) => {
    if (err || !code) {
      return res.status(400).json({ error: 'Invalid or used redeem code' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run('INSERT INTO users (username, email, password, credits) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, code.credits], function(err) {
        if (err) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Mark code as used
        db.run('UPDATE redeem_codes SET used = 1 WHERE code = ?', [redeemCode]);

        res.json({ success: true, message: 'Registration successful' });
      });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/user', requireAuth, (req, res) => {
  db.get('SELECT id, username, email, role, credits FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// ============ DASHBOARD ROUTES ============

app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const isAdmin = req.session.role === 'admin';

  const queries = {
    activeVps: isAdmin ? 
      `SELECT COUNT(*) as count FROM vps WHERE status = 'running'` :
      `SELECT COUNT(*) as count FROM vps WHERE user_id = ? AND status = 'running'`,
    totalVps: isAdmin ?
      `SELECT COUNT(*) as count FROM vps` :
      `SELECT COUNT(*) as count FROM vps WHERE user_id = ?`,
    totalUsers: `SELECT COUNT(*) as count FROM users`,
    systemUptime: `SELECT datetime('now') as uptime`
  };

  const stats = {};

  db.get(queries.activeVps, isAdmin ? [] : [userId], (err, row) => {
    stats.activeVps = row ? row.count : 0;

    db.get(queries.totalVps, isAdmin ? [] : [userId], (err, row) => {
      stats.totalVps = row ? row.count : 0;

      if (isAdmin) {
        db.get(queries.totalUsers, (err, row) => {
          stats.totalUsers = row ? row.count : 0;

          exec('uptime -p', (error, stdout) => {
            stats.uptime = stdout.trim() || 'Unknown';
            res.json(stats);
          });
        });
      } else {
        exec('uptime -p', (error, stdout) => {
          stats.uptime = stdout.trim() || 'Unknown';
          res.json(stats);
        });
      }
    });
  });
});

// ============ VPS ROUTES ============

// Get user's VPS instances
app.get('/api/vps', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const isAdmin = req.session.role === 'admin';

  const query = isAdmin ?
    'SELECT * FROM vps ORDER BY created_at DESC' :
    'SELECT * FROM vps WHERE user_id = ? ORDER BY created_at DESC';

  db.all(query, isAdmin ? [] : [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// Create VPS
app.post('/api/vps/create', requireAuth, (req, res) => {
  const { ram, cpu, disk, os, username, password, expiryDate, tag, selectedUser } = req.body;
  const userId = req.session.role === 'admin' && selectedUser ? selectedUser : req.session.userId;

  // Calculate cost (example: 1 credit per GB RAM)
  const cost = parseInt(ram);

  // Check user credits
  db.get('SELECT credits FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.credits < cost && req.session.role !== 'admin') {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    const vpsId = uuidv4();
    const name = `VM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const sshPort = 2222 + Math.floor(Math.random() * 1000);

    db.run(`INSERT INTO vps (id, user_id, name, ram, cpu, disk, os, username, password, ssh_port, expiry_date, tag, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stopped')`,
      [vpsId, userId, name, ram, cpu, disk, os, username, password, sshPort, expiryDate, tag],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create VPS' });
        }

        // Deduct credits
        if (req.session.role !== 'admin') {
          db.run('UPDATE users SET credits = credits - ? WHERE id = ?', [cost, userId]);
        }

        res.json({
          success: true,
          message: '✅ Successfully Created VPS',
          vps: { id: vpsId, name, ram, cpu, disk, os, sshPort }
        });
      });
  });
});

// Start VPS
app.post('/api/vps/:id/start', requireAuth, (req, res) => {
  const vpsId = req.params.id;

  db.get('SELECT * FROM vps WHERE id = ?', [vpsId], (err, vps) => {
    if (err || !vps) {
      return res.status(404).json({ error: 'VPS not found' });
    }

    // Check ownership
    if (vps.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update status
    db.run('UPDATE vps SET status = ? WHERE id = ?', ['running', vpsId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to start VPS' });
      }

      // In production, you would execute the actual QEMU command here
      res.json({ success: true, message: 'VPS started successfully' });
    });
  });
});

// Stop VPS
app.post('/api/vps/:id/stop', requireAuth, (req, res) => {
  const vpsId = req.params.id;

  db.get('SELECT * FROM vps WHERE id = ?', [vpsId], (err, vps) => {
    if (err || !vps) {
      return res.status(404).json({ error: 'VPS not found' });
    }

    if (vps.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.run('UPDATE vps SET status = ? WHERE id = ?', ['stopped', vpsId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to stop VPS' });
      }
      res.json({ success: true, message: 'VPS stopped successfully' });
    });
  });
});

// Restart VPS
app.post('/api/vps/:id/restart', requireAuth, (req, res) => {
  const vpsId = req.params.id;

  db.get('SELECT * FROM vps WHERE id = ?', [vpsId], (err, vps) => {
    if (err || !vps) {
      return res.status(404).json({ error: 'VPS not found' });
    }

    if (vps.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, message: 'VPS restarting...' });
  });
});

// Delete VPS
app.delete('/api/vps/:id', requireAuth, (req, res) => {
  const vpsId = req.params.id;

  db.get('SELECT * FROM vps WHERE id = ?', [vpsId], (err, vps) => {
    if (err || !vps) {
      return res.status(404).json({ error: 'VPS not found' });
    }

    if (vps.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.run('DELETE FROM vps WHERE id = ?', [vpsId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete VPS' });
      }
      res.json({ success: true, message: 'VPS deleted successfully' });
    });
  });
});

// ============ ADMIN ROUTES ============

// Get all users (Admin only)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, email, role, credits, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// Create user (Admin only)
app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, hashedPassword, role], function(err) {
      if (err) {
        return res.status(400).json({ error: 'User creation failed' });
      }
      res.json({ success: true, id: this.lastID });
    });
});

// Delete user (Admin only)
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;

  db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    res.json({ success: true });
  });
});

// Get all nodes (Admin only)
app.get('/api/admin/nodes', requireAdmin, (req, res) => {
  db.all('SELECT * FROM nodes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// Create node (Admin only)
app.post('/api/admin/nodes', requireAdmin, (req, res) => {
  const { name, ram, cpu, disk, sshHost, sshPassword } = req.body;
  const nodeId = uuidv4();
  const token = uuidv4();

  db.run('INSERT INTO nodes (id, name, ram, cpu, disk, ssh_host, ssh_password, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nodeId, name, ram, cpu, disk, sshHost, sshPassword, token], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create node' });
      }
      res.json({ success: true, id: nodeId, token });
    });
});

// Get API keys
app.get('/api/admin/api-keys', requireAdmin, (req, res) => {
  db.all('SELECT id, name, key, role, created_at FROM api_keys WHERE user_id = ?', [req.session.userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// Create API key
app.post('/api/admin/api-keys', requireAdmin, (req, res) => {
  const { name, role } = req.body;
  const keyId = uuidv4();
  const apiKey = 'gvm_' + uuidv4().replace(/-/g, '');

  db.run('INSERT INTO api_keys (id, user_id, name, key, role) VALUES (?, ?, ?, ?, ?)',
    [keyId, req.session.userId, name, apiKey, role], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create API key' });
      }
      res.json({ success: true, key: apiKey });
    });
});

// Get redeem codes
app.get('/api/admin/redeem-codes', requireAdmin, (req, res) => {
  db.all('SELECT * FROM redeem_codes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// Create redeem code
app.post('/api/admin/redeem-codes', requireAdmin, (req, res) => {
  const { name, credits } = req.body;
  const code = 'GVM-' + Math.random().toString(36).substr(2, 12).toUpperCase();

  db.run('INSERT INTO redeem_codes (code, name, credits) VALUES (?, ?, ?)',
    [code, name, credits], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create redeem code' });
      }
      res.json({ success: true, code });
    });
});

// ============ PROFILE ROUTES ============

app.put('/api/profile', requireAuth, (req, res) => {
  const { username, email, currentPassword, newPassword, theme } = req.body;
  const userId = req.session.userId;

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password if changing password
    if (newPassword && !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const updates = [];
    const values = [];

    if (username && username !== user.username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (email && email !== user.email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (newPassword) {
      updates.push('password = ?');
      values.push(bcrypt.hashSync(newPassword, 10));
    }

    if (updates.length > 0) {
      values.push(userId);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update profile' });
        }
        res.json({ success: true, message: 'Profile updated successfully' });
      });
    } else {
      res.json({ success: true, message: 'No changes made' });
    }
  });
});

// Upload theme
app.post('/api/profile/theme', requireAuth, upload.single('theme'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imagePath = '/uploads/themes/' + req.file.filename;

  db.run('INSERT INTO themes (user_id, image_path) VALUES (?, ?)',
    [req.session.userId, imagePath], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save theme' });
      }
      res.json({ success: true, imagePath });
    });
});

// Get user theme
app.get('/api/profile/theme', requireAuth, (req, res) => {
  db.get('SELECT image_path FROM themes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.session.userId], (err, row) => {
      if (err || !row) {
        return res.json({ imagePath: null });
      }
      res.json({ imagePath: row.image_path });
    });
});

// Redeem code
app.post('/api/redeem', requireAuth, (req, res) => {
  const { code } = req.body;

  db.get('SELECT * FROM redeem_codes WHERE code = ? AND used = 0', [code], (err, redeemCode) => {
    if (err || !redeemCode) {
      return res.status(400).json({ error: 'Invalid or already used code' });
    }

    db.run('UPDATE users SET credits = credits + ? WHERE id = ?', [redeemCode.credits, req.session.userId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to redeem code' });
      }

      db.run('UPDATE redeem_codes SET used = 1 WHERE code = ?', [code]);

      res.json({ success: true, credits: redeemCode.credits, message: `${redeemCode.credits} credits added!` });
    });
  });
});

// ============ PLANS ROUTE ============

app.get('/api/plans', (req, res) => {
  const plans = [
    { ram: 4, cpu: 2, disk: 30, credits: 50 },
    { ram: 8, cpu: 2, disk: 60, credits: 100 },
    { ram: 12, cpu: 4, disk: 100, credits: 190 },
    { ram: 16, cpu: 4, disk: 170, credits: 260 },
    { ram: 32, cpu: 6, disk: 200, credits: 380 }
  ];
  res.json(plans);
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket for terminal
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');

  ws.on('message', (message) => {
    console.log('Received:', message);
    // Handle terminal commands here
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Create necessary directories
const fs = require('fs');
if (!fs.existsSync('uploads/themes')) {
  fs.mkdirSync('uploads/themes', { recursive: true });
}

// Start server
server.listen(PORT, () => {
  console.log(`
========================================================================
  ______ _    ____  __   ____   ___    _   __ ______ __       _    __ ___
 / ____/| |  / /  |/  /  / __ \\ /   |  / | / // ____// /      | |  / /|__ \\
/ / __  | | / // /|_/ /  / /_/ // /| | /  |/ // __/  / /       | | / / __/ /
/ /_/ /  | |/ // /  / /  / ____// ___ |/ /|  // /___ / /___     | |/ / / __/
\\____/   |___//_/  /_/  /_/    /_/  |_/_/ |_//_____//_____/     |___/ /____/

                        POWERED BY PowerDev
========================================================================

🚀 Server running on http://localhost:${PORT}
📊 Default Admin Credentials:
   Username: admin
   Password: admin

🔐 Please change the default password after first login!
========================================================================
  `);
});
