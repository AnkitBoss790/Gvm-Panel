#!/bin/bash

# GVM Panel V2 - Deployment Script
# This script packages and deploys GVM Panel V2

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
========================================================================
               GVM Panel V2 - Deployment Script
                    Powered by PowerDev
========================================================================
EOF
echo -e "${NC}"

# Create deployment package
echo -e "${GREEN}[1/5] Creating deployment package...${NC}"
mkdir -p gvm-panel-deploy
cp -r public gvm-panel-deploy/
cp server.js gvm-panel-deploy/
cp package.json gvm-panel-deploy/
cp README.md gvm-panel-deploy/
cp QUICKSTART.md gvm-panel-deploy/
cp install.sh gvm-panel-deploy/

# Create uploads directory structure
mkdir -p gvm-panel-deploy/uploads/themes

# Create .gitignore
cat > gvm-panel-deploy/.gitignore << 'EOF'
node_modules/
gvm_panel.db
gvm_panel.db-journal
uploads/themes/*
!uploads/themes/.gitkeep
*.log
.env
EOF

# Create empty .gitkeep for uploads
touch gvm-panel-deploy/uploads/themes/.gitkeep

echo -e "${GREEN}[2/5] Package created${NC}"

# Create archive
echo -e "${GREEN}[3/5] Creating archive...${NC}"
tar -czf gvm-panel-v2.tar.gz gvm-panel-deploy/
echo -e "${GREEN}Archive created: gvm-panel-v2.tar.gz${NC}"

# Create zip as well
echo -e "${GREEN}[4/5] Creating zip archive...${NC}"
zip -r gvm-panel-v2.zip gvm-panel-deploy/ > /dev/null 2>&1
echo -e "${GREEN}Zip archive created: gvm-panel-v2.zip${NC}"

# Create installation instructions
cat > INSTALL.txt << 'EOF'
GVM Panel V2 - Installation Instructions
=========================================

QUICK INSTALL (Recommended)
---------------------------
1. Extract the archive:
   tar -xzf gvm-panel-v2.tar.gz
   cd gvm-panel-deploy

2. Run the installer (as root):
   sudo bash install.sh

3. Copy the application files:
   sudo cp -r * /opt/gvm-panel/

4. Start the service:
   sudo systemctl start gvm-panel

5. Access the panel:
   http://your-server-ip:3000

   Default credentials:
   Username: admin
   Password: admin

MANUAL INSTALL
--------------
1. Extract archive and navigate:
   tar -xzf gvm-panel-v2.tar.gz
   cd gvm-panel-deploy

2. Install Node.js (if not installed):
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
   sudo apt-get install -y nodejs

   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs

3. Install dependencies:
   npm install

4. Start the server:
   node server.js

5. Access the panel:
   http://localhost:3000

SYSTEM REQUIREMENTS
-------------------
- Linux-based OS (Ubuntu 20.04+, Debian 10+, CentOS 8+)
- Node.js 18 or higher
- 2GB RAM minimum (4GB recommended)
- 20GB disk space
- QEMU/KVM support (for VM creation)

FEATURES
--------
✓ Multi-user support with role-based access
✓ VPS creation and management
✓ Credit system with redeem codes
✓ Admin panel with comprehensive controls
✓ Node management for distributed deployment
✓ API key generation
✓ Custom themes
✓ Light/Dark mode
✓ Web-based terminal
✓ Support for 8 Linux distributions

DOCUMENTATION
-------------
- Full documentation: See README.md
- Quick start guide: See QUICKSTART.md
- API documentation: http://your-panel/api/docs

SUPPORT
-------
- Website: https://
- Email: support@
- GitHub: https://

Made with ❤️ by HopingBoyz
EOF

echo -e "${GREEN}[5/5] Creating checksums...${NC}"
# Create checksums
sha256sum gvm-panel-v2.tar.gz > gvm-panel-v2.tar.gz.sha256
sha256sum gvm-panel-v2.zip > gvm-panel-v2.zip.sha256

echo -e "${BLUE}"
cat << "EOF"
========================================================================
                    Deployment Package Created!
========================================================================
EOF
echo -e "${NC}"

echo "Files created:"
echo "  - gvm-panel-v2.tar.gz ($(du -h gvm-panel-v2.tar.gz | cut -f1))"
echo "  - gvm-panel-v2.zip ($(du -h gvm-panel-v2.zip | cut -f1))"
echo "  - gvm-panel-v2.tar.gz.sha256"
echo "  - gvm-panel-v2.zip.sha256"
echo "  - INSTALL.txt"
echo ""
echo -e "${GREEN}Package is ready for distribution!${NC}"
echo ""
echo "To deploy on a server:"
echo "  1. Upload gvm-panel-v2.tar.gz to your server"
echo "  2. Extract: tar -xzf gvm-panel-v2.tar.gz"
echo "  3. Run: cd gvm-panel-deploy && sudo bash install.sh"
echo ""

# Cleanup
read -p "Remove temporary files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf gvm-panel-deploy
    echo -e "${GREEN}Cleanup complete${NC}"
fi

echo -e "${BLUE}Deployment script finished!${NC}"
