# GVM Panel V2 🚀

**Advanced Multi-VM Management Panel powered by PowerDev**

A professional, modern web-based panel for managing multiple QEMU virtual machines with a beautiful UI, user management, credit system, and powerful admin tools.

![GVM Panel V2](https://img.shields.io/badge/Version-2.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎨 Modern UI
- Beautiful gradient design with logo branding
- Light/Dark theme support
- Responsive layout for all devices
- Custom background themes
- Smooth animations and transitions

### 👥 Authentication System
- Secure login with bcrypt password hashing
- Registration with redeem code validation
- Session-based authentication
- Role-based access control (Admin/User)

### 💻 VPS Management
- Create VPS instances with custom specifications
- Support for multiple Linux distributions:
  - Ubuntu 22.04 & 24.04
  - Debian 11 & 12
  - Fedora 40
  - CentOS Stream 9
  - AlmaLinux 9
  - Rocky Linux 9
- Real-time status monitoring
- Start, Stop, Restart operations
- SSH access with tmate integration
- Web Terminal (simulated)
- Custom tags and expiry dates

### 📊 Dashboard
- Active VPS count
- Total VPS instances
- System uptime display
- Total users (admin only)
- Visual statistics with icons
- Real-time updates

### 💳 Credit System
- Credit-based VPS creation
- Redeem code system
- 5 pricing plans:
  - **Starter**: 4GB RAM, 2 CPU, 30GB Disk - 50 Credits
  - **Professional**: 8GB RAM, 2 CPU, 60GB Disk - 100 Credits
  - **Business**: 12GB RAM, 4 CPU, 100GB Disk - 190 Credits
  - **Enterprise**: 16GB RAM, 4 CPU, 170GB Disk - 260 Credits
  - **Ultimate**: 32GB RAM, 6 CPU, 200GB Disk - 380 Credits

### 🔧 Admin Panel
- **User Management**
  - Add new users
  - Delete users
  - View user details and credits
  - Assign VPS to specific users
  
- **VPS Management**
  - View all VPS instances
  - Manage any user's VPS
  - Delete VPS instances
  
- **Node Management**
  - Add compute nodes
  - Generate node tokens
  - View node status
  - Setup commands for nodes
  
- **API Keys**
  - Create API keys
  - Role-based API access
  - Copy to clipboard functionality
  
- **Redeem Codes**
  - Generate random codes
  - Set credit amounts
  - Track code usage

### 👤 Profile Management
- Update username and email
- Change password
- Upload custom background theme
- Redeem codes for credits
- Theme preferences

## 🚀 Installation

### Prerequisites

```bash
# System requirements
- Node.js 18 or higher
- QEMU/KVM
- SQLite3
- Linux-based system (Ubuntu/Debian recommended)
```

### One-Click Installation

```bash
# Download and run the installer
curl -sSL https://raw.githubusercontent.com/AnkitBoss790/gvm-panel/main/install.sh | bash
```

### Manual Installation

1. **Clone the repository**
```bash
git clone https://github.com/AnkitBoss790/gvm-panel.git
cd gvm-panel
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **Access the panel**
```
Open your browser: http://localhost:3000
```

### Default Admin Credentials

```
Username: admin
Password: admin
```

⚠️ **Important**: Change the default password immediately after first login!

## 📁 Project Structure

```
gvm-panel/
├── server.js           # Backend API server
├── package.json        # Node.js dependencies
├── gvm_panel.db       # SQLite database
├── public/
│   ├── index.html     # Main frontend
│   ├── style.css      # Styles
│   └── app.js         # Frontend JavaScript
├── uploads/
│   └── themes/        # User uploaded themes
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - New user registration
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user info

### VPS Management
- `GET /api/vps` - List user's VPS
- `POST /api/vps/create` - Create new VPS
- `POST /api/vps/:id/start` - Start VPS
- `POST /api/vps/:id/stop` - Stop VPS
- `POST /api/vps/:id/restart` - Restart VPS
- `DELETE /api/vps/:id` - Delete VPS

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/nodes` - List nodes
- `POST /api/admin/nodes` - Create node
- `GET /api/admin/api-keys` - List API keys
- `POST /api/admin/api-keys` - Create API key
- `GET /api/admin/redeem-codes` - List redeem codes
- `POST /api/admin/redeem-codes` - Create redeem code

### Profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/theme` - Upload theme
- `GET /api/profile/theme` - Get user theme
- `POST /api/redeem` - Redeem code

## 🎨 Customization

### Custom Themes
Users can upload custom background images through the Profile page. Supported formats: JPG, PNG, WebP.

### Color Scheme
Edit CSS variables in `public/style.css`:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #48bb78;
    --danger-color: #f56565;
    --warning-color: #ed8936;
    --info-color: #4299e1;
}
```

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- Role-based access control
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection

## 🌐 Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start server.js --name gvm-panel

# Save PM2 configuration
pm2 save

# Enable startup on boot
pm2 startup
```

### Using Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 📝 Node Setup

1. Create a node in the Admin Panel
2. Copy the setup token
3. Run on your node server:
```bash
curl -sSL https://your-panel-url/setup.sh | bash -s YOUR_TOKEN
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 PID
```

### Database Locked
```bash
# Stop the server
pm2 stop gvm-panel

# Remove database lock
rm gvm_panel.db-journal

# Restart
pm2 start gvm-panel
```

### QEMU/KVM Not Working
```bash
# Check KVM support
egrep -c '(vmx|svm)' /proc/cpuinfo

# Install QEMU
sudo apt install qemu-system qemu-kvm

# Add user to KVM group
sudo usermod -aG kvm $USER
```

## 📊 Database Schema

### Users Table
- id, username, email, password, role, credits, created_at

### VPS Table
- id, user_id, name, ram, cpu, disk, os, username, password, ssh_port, status, expiry_date, tag, created_at

### Nodes Table
- id, name, ram, cpu, disk, ssh_host, ssh_password, token, status, created_at

### API Keys Table
- id, user_id, name, key, role, created_at

### Redeem Codes Table
- id, code, name, credits, used, created_at

### Themes Table
- id, user_id, image_path, created_at

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**PowerDev**
- Website: https://PowerDev.infy.uk
- GitHub: [@powerdev](https://github.com/AnkitBoss790)

## 🙏 Credits

- Built with Express.js and SQLite
- Icons by Font Awesome
- Design inspired by modern cloud panels

## 📞 Support

For support, email support@powerdev.infy.uk or join our Discord server.

## 🎯 Roadmap

- [ ] Docker support
- [ ] Kubernetes integration
- [ ] Real-time terminal via WebSocket
- [ ] VPS snapshots
- [ ] Bandwidth monitoring
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Payment gateway integration
- [ ] Mobile app

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

**Made with ❤️ by PowerDev**
