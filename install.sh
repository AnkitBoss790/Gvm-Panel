#!/bin/bash

# GVM Panel V2 - One-Click Installer
# Powered by PowerDev 

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
show_banner() {
    clear
    echo -e "${PURPLE}"
    cat << "EOF"
========================================================================
  ______ _    ____  __   ____   ___    _   __ ______ __       _    __ ___
 / ____/| |  / /  |/  /  / __ \ /   |  / | / // ____// /      | |  / /|__ \
/ / __  | | / // /|_/ /  / /_/ // /| | /  |/ // __/  / /       | | / / __/ /
/ /_/ /  | |/ // /  / /  / ____// ___ |/ /|  // /___ / /___     | |/ / / __/
\____/   |___//_/  /_/  /_/    /_/  |_/_/ |_//_____//_____/     |___/ /____/

                        POWERED BY PowerDev 
                         Installation Script
========================================================================
EOF
    echo -e "${NC}"
}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "This script must be run as root"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        log_error "Cannot detect OS"
        exit 1
    fi
    log_info "Detected OS: $OS $VER"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update
        apt-get install -y curl wget git nodejs npm qemu-system qemu-kvm \
            cloud-image-utils libvirt-daemon-system libvirt-clients bridge-utils \
            build-essential
        
        # Install latest Node.js
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        yum install -y curl wget git nodejs npm qemu-kvm qemu-img \
            cloud-utils libvirt virt-install bridge-utils
        
        # Install Node.js
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        log_error "Unsupported OS: $OS"
        exit 1
    fi
    
    log_success "Dependencies installed"
}

setup_panel() {
    log_info "Setting up GVM Panel V2..."
    
    # Create installation directory
    INSTALL_DIR="/opt/gvm-panel"
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR
    
    # Create package.json
    cat > package.json << 'PACKAGEJSON'
{
  "name": "gvm-panel-v2",
  "version": "2.0.0",
  "description": "GVM Panel V2 - Advanced VM Management Panel",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.2",
    "uuid": "^9.0.0",
    "sqlite3": "^5.1.6",
    "multer": "^1.4.5-lts.1",
    "ws": "^8.14.2"
  }
}
PACKAGEJSON
    
    # Install npm packages
    log_info "Installing Node.js packages..."
    npm install --production
    
    log_success "GVM Panel setup complete"
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > /etc/systemd/system/gvm-panel.service << EOF
[Unit]
Description=GVM Panel V2
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gvm-panel
ExecStart=/usr/bin/node /opt/gvm-panel/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable gvm-panel
    
    log_success "Systemd service created"
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 3000/tcp
        ufw allow 22/tcp
        log_success "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --reload
        log_success "Firewalld configured"
    else
        log_warning "No firewall detected. Please manually open port 3000"
    fi
}

setup_kvm() {
    log_info "Setting up KVM..."
    
    # Check KVM support
    if egrep -c '(vmx|svm)' /proc/cpuinfo > /dev/null; then
        log_success "KVM is supported"
    else
        log_warning "KVM may not be supported on this system"
    fi
    
    # Enable and start libvirtd
    if command -v systemctl &> /dev/null; then
        systemctl enable libvirtd 2>/dev/null || true
        systemctl start libvirtd 2>/dev/null || true
    fi
    
    # Add user to required groups
    usermod -aG kvm root 2>/dev/null || true
    usermod -aG libvirt root 2>/dev/null || true
    
    log_success "KVM setup complete"
}

create_directories() {
    log_info "Creating directories..."
    
    mkdir -p /opt/gvm-panel/public
    mkdir -p /opt/gvm-panel/uploads/themes
    mkdir -p /home/vms
    
    log_success "Directories created"
}

get_server_ip() {
    # Get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "YOUR_SERVER_IP")
    
    # Get local IP
    LOCAL_IP=$(ip route get 1 | awk '{print $7; exit}' 2>/dev/null || echo "localhost")
}

show_completion() {
    get_server_ip
    
    echo ""
    echo -e "${GREEN}========================================================================${NC}"
    echo -e "${GREEN}              GVM Panel V2 Installation Complete!${NC}"
    echo -e "${GREEN}========================================================================${NC}"
    echo ""
    echo -e "${CYAN}📋 Installation Details:${NC}"
    echo -e "   Installation Directory: ${YELLOW}/opt/gvm-panel${NC}"
    echo -e "   VM Storage Directory: ${YELLOW}/home/vms${NC}"
    echo ""
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "   Local: ${YELLOW}http://localhost:3000${NC}"
    echo -e "   LAN: ${YELLOW}http://${LOCAL_IP}:3000${NC}"
    echo -e "   Public: ${YELLOW}http://${PUBLIC_IP}:3000${NC}"
    echo ""
    echo -e "${CYAN}🔐 Default Admin Credentials:${NC}"
    echo -e "   Username: ${YELLOW}admin${NC}"
    echo -e "   Password: ${YELLOW}admin${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT: Change the default password immediately!${NC}"
    echo ""
    echo -e "${CYAN}🚀 Start the panel:${NC}"
    echo -e "   ${YELLOW}systemctl start gvm-panel${NC}"
    echo ""
    echo -e "${CYAN}📊 Check status:${NC}"
    echo -e "   ${YELLOW}systemctl status gvm-panel${NC}"
    echo ""
    echo -e "${CYAN}📝 View logs:${NC}"
    echo -e "   ${YELLOW}journalctl -u gvm-panel -f${NC}"
    echo ""
    echo -e "${CYAN}🔧 Manage service:${NC}"
    echo -e "   Start: ${YELLOW}systemctl start gvm-panel${NC}"
    echo -e "   Stop: ${YELLOW}systemctl stop gvm-panel${NC}"
    echo -e "   Restart: ${YELLOW}systemctl restart gvm-panel${NC}"
    echo ""
    echo -e "${GREEN}========================================================================${NC}"
    echo -e "${PURPLE}                    Powered by PowerDev${NC}"
    echo -e "${GREEN}========================================================================${NC}"
    echo ""
}

# Main installation
main() {
    show_banner
    
    log_info "Starting GVM Panel V2 installation..."
    sleep 2
    
    check_root
    detect_os
    install_dependencies
    setup_panel
    create_directories
    setup_kvm
    create_systemd_service
    setup_firewall
    
    # Note: In production, you would copy the actual files here
    log_warning "Note: You need to copy server.js and public/ files to /opt/gvm-panel/"
    log_info "Please download the complete files from: https://github.com/hopingboyz/gvm-panel"
    
    show_completion
    
    read -p "Do you want to start GVM Panel now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        systemctl start gvm-panel
        log_success "GVM Panel started!"
        log_info "Access the panel at: http://${PUBLIC_IP}:3000"
    else
        log_info "You can start the panel later with: systemctl start gvm-panel"
    fi
}

# Run main function
main
