# 🚀 GVM Panel V2 - Quick Start Guide

## Installation Methods

### Method 1: One-Click Install (Recommended)

```bash
# Download and install everything automatically
bash <(curl -s https://raw.githubusercontent.com/AnkitBoss790/gvm-panel/main/quick-install.sh)
```

### Method 2: Manual Installation

#### Step 1: Clone Repository
```bash
git clone https://github.com/AnkitBoss790/gvm-panel.git
cd gvm-panel
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Start Server
```bash
npm start
```

#### Step 4: Access Panel
Open browser: `http://localhost:3000`

---

## First Login

### Default Credentials
- **Username**: `admin`
- **Password**: `admin`

⚠️ **Change immediately after first login!**

---

## Creating Your First VPS

### Step 1: Get Credits
1. Go to Admin Panel → Redeem Codes
2. Create a new redeem code
3. Copy the code
4. Go to Profile → Redeem Code
5. Enter the code and redeem

### Step 2: Create VPS
1. Click "My VPS" in sidebar
2. Click "Create New VPS" button
3. Configure:
   - RAM: 4GB (minimum)
   - CPU: 2 cores
   - Disk: 30GB
   - OS: Ubuntu 22.04
   - Username: root
   - Password: your_password
4. Click "Create VPS"

### Step 3: Start VPS
1. Find your VPS in the list
2. Click "Start" button
3. Wait for status to show "RUNNING"

### Step 4: Access VPS
1. Click "Manage" on your VPS
2. Copy SSH command
3. Use SSH client or Web Terminal

---

## User Registration Flow

### For New Users:
1. Click "Register" on login page
2. Fill in details:
   - Username
   - Email
   - Password
   - Confirm Password
   - **Redeem Code** (get from admin)
3. Submit registration
4. Login with credentials

### Admin Creates Redeem Code:
1. Login as admin
2. Go to Admin Panel → Redeem Codes
3. Click "Create Code"
4. Enter:
   - Name: "New User Promo"
   - Credits: 100
5. Share code with new user

---

## Plans & Pricing

| Plan | RAM | CPU | Disk | Credits |
|------|-----|-----|------|---------|
| Starter | 4GB | 2 | 30GB | 50 |
| Professional | 8GB | 2 | 60GB | 100 |
| Business | 12GB | 4 | 100GB | 190 |
| Enterprise | 16GB | 4 | 170GB | 260 |
| Ultimate | 32GB | 6 | 200GB | 380 |

---

## Admin Tasks

### Add New User
1. Admin Panel → Users tab
2. Click "Add User"
3. Fill details and select role
4. User can now login

### Create Node
1. Admin Panel → Nodes tab
2. Click "Add Node"
3. Enter node specifications
4. Copy setup token
5. Run on node server:
```bash
curl -sSL https://your-panel.com/setup.sh | bash -s YOUR_TOKEN
```

### Generate API Key
1. Admin Panel → API Keys tab
2. Click "Create API Key"
3. Enter name and role
4. Copy and save key securely

### Monitor System
- Dashboard shows:
  - Active VPS count
  - Total VPS
  - Total users
  - System uptime

---

## Common Operations

### SSH to VPS
```bash
# Use the SSH command from VPS details
ssh -p PORT username@localhost
```

### Setup Tmate (Remote Access)
```bash
# On your VPS
apt install tmate -y && tmate -F
```

### Change Theme
1. Go to Profile
2. Upload background image
3. Theme applies automatically

### Redeem Credits
1. Profile → Redeem Code
2. Enter code
3. Credits added instantly

---

## Troubleshooting

### Can't Login
- Check username/password
- Try admin/admin for first login
- Check browser console for errors

### VPS Won't Start
- Check system has enough resources
- Verify KVM is enabled
- Check logs: `journalctl -u gvm-panel -f`

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 PID

# Restart panel
systemctl restart gvm-panel
```

### Database Errors
```bash
# Stop service
systemctl stop gvm-panel

# Backup database
cp /opt/gvm-panel/gvm_panel.db /opt/gvm-panel/gvm_panel.db.backup

# Restart service
systemctl start gvm-panel
```

---

## Security Best Practices

### 1. Change Default Password
```
Profile → Change Password
```

### 2. Use Strong Passwords
- Minimum 12 characters
- Mix of letters, numbers, symbols

### 3. Enable Firewall
```bash
# UFW (Ubuntu/Debian)
ufw allow 3000/tcp
ufw enable

# Firewalld (CentOS/RHEL)
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

### 4. Use HTTPS
```bash
# Install Nginx
apt install nginx

# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

### 5. Regular Backups
```bash
# Backup database
cp /opt/gvm-panel/gvm_panel.db backup-$(date +%Y%m%d).db

# Backup VMs
cp -r /home/vms /backup/vms-$(date +%Y%m%d)
```

---

## Command Reference

### Service Management
```bash
# Start
systemctl start gvm-panel

# Stop
systemctl stop gvm-panel

# Restart
systemctl restart gvm-panel

# Status
systemctl status gvm-panel

# Enable auto-start
systemctl enable gvm-panel
```

### View Logs
```bash
# Real-time logs
journalctl -u gvm-panel -f

# Last 100 lines
journalctl -u gvm-panel -n 100

# Today's logs
journalctl -u gvm-panel --since today
```

### Database Operations
```bash
# Access database
sqlite3 /opt/gvm-panel/gvm_panel.db

# Backup database
sqlite3 /opt/gvm-panel/gvm_panel.db ".backup backup.db"

# List tables
sqlite3 /opt/gvm-panel/gvm_panel.db ".tables"
```

---

## Advanced Configuration

### Change Port
Edit `/opt/gvm-panel/server.js`:
```javascript
const PORT = 8080; // Change from 3000 to 8080
```

### Enable Debug Mode
```bash
export NODE_ENV=development
npm start
```

### Custom VM Storage Path
Edit server configuration:
```javascript
const VM_DIR = '/custom/path/vms';
```

---

## API Usage

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### Create VPS
```bash
curl -X POST http://localhost:3000/api/vps/create \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "ram": 4,
    "cpu": 2,
    "disk": 30,
    "os": "Ubuntu 22.04",
    "username": "root",
    "password": "password"
  }'
```

### List VPS
```bash
curl http://localhost:3000/api/vps \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

---

## Support & Resources

### Documentation
- Full docs: https://docs.
- API reference: https://api.

### Community
- Discord: https://discord.gg/
- Forum: ??
- GitHub: https://github.com/AnkitBoss790/gvm-panel

### Contact
- Email: support@
- Twitter: @powerdev
- Website: https://
---

## Updates

### Check for Updates
```bash
cd /opt/gvm-panel
git pull origin main
npm install
systemctl restart gvm-panel
```

### Version Check
```bash
cat /opt/gvm-panel/package.json | grep version
```

---

## Contributing

Want to contribute?
1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request

---

**Made with ❤️ by PowerDev**

*For more help, visit our documentation or join our community!*
