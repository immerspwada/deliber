#!/bin/bash

# 🐳 Docker Installation Script for Thai Ride App
# Supports macOS, Linux, and Windows (WSL)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    log_info "Detected OS: $OS"
}

# Check if Docker is already installed
check_docker_installed() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
        log_success "Docker is already installed: $DOCKER_VERSION"
        
        # Check if Docker daemon is running
        if docker info &> /dev/null; then
            log_success "Docker daemon is running"
            return 0
        else
            log_warning "Docker is installed but daemon is not running"
            return 1
        fi
    else
        log_info "Docker is not installed"
        return 1
    fi
}

# Install Docker on macOS
install_docker_macos() {
    log_info "Installing Docker Desktop for macOS..."
    
    # Check if Homebrew is installed
    if command -v brew &> /dev/null; then
        log_info "Using Homebrew to install Docker Desktop..."
        
        # Remove any existing Docker installation that might conflict
        brew uninstall --cask docker-desktop 2>/dev/null || true
        
        # Install Docker Desktop
        brew install --cask docker-desktop
        
        log_success "Docker Desktop installed via Homebrew"
    else
        log_warning "Homebrew not found. Please install Docker Desktop manually:"
        log_info "1. Go to https://www.docker.com/products/docker-desktop/"
        log_info "2. Download Docker Desktop for Mac"
        log_info "3. Install and start Docker Desktop"
        exit 1
    fi
}

# Install Docker on Linux
install_docker_linux() {
    log_info "Installing Docker on Linux..."
    
    # Detect Linux distribution
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
    else
        log_error "Cannot detect Linux distribution"
        exit 1
    fi
    
    case $DISTRO in
        ubuntu|debian)
            install_docker_ubuntu_debian
            ;;
        centos|rhel|fedora)
            install_docker_centos_rhel
            ;;
        *)
            log_error "Unsupported Linux distribution: $DISTRO"
            log_info "Please install Docker manually: https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
}

# Install Docker on Ubuntu/Debian
install_docker_ubuntu_debian() {
    log_info "Installing Docker on Ubuntu/Debian..."
    
    # Update package index
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index again
    sudo apt-get update
    
    # Install Docker Engine
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    log_success "Docker installed on Ubuntu/Debian"
    log_warning "Please log out and log back in for group changes to take effect"
}

# Install Docker on CentOS/RHEL
install_docker_centos_rhel() {
    log_info "Installing Docker on CentOS/RHEL..."
    
    # Install prerequisites
    sudo yum install -y yum-utils
    
    # Set up repository
    sudo yum-config-manager \
        --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo
    
    # Install Docker Engine
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    log_success "Docker installed on CentOS/RHEL"
    log_warning "Please log out and log back in for group changes to take effect"
}

# Start Docker Desktop on macOS
start_docker_macos() {
    log_info "Starting Docker Desktop..."
    
    # Check if Docker Desktop is already running
    if pgrep -f "Docker Desktop" > /dev/null; then
        log_success "Docker Desktop is already running"
        return 0
    fi
    
    # Start Docker Desktop
    open -a Docker
    
    log_info "Waiting for Docker Desktop to start..."
    
    # Wait for Docker daemon to be ready (max 60 seconds)
    local count=0
    while ! docker info &> /dev/null && [ $count -lt 60 ]; do
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    echo
    
    if docker info &> /dev/null; then
        log_success "Docker Desktop started successfully"
    else
        log_error "Docker Desktop failed to start within 60 seconds"
        log_info "Please start Docker Desktop manually and try again"
        exit 1
    fi
}

# Start Docker on Linux
start_docker_linux() {
    log_info "Starting Docker service..."
    
    # Start Docker service
    sudo systemctl start docker
    
    # Enable Docker to start on boot
    sudo systemctl enable docker
    
    if docker info &> /dev/null; then
        log_success "Docker service started successfully"
    else
        log_error "Failed to start Docker service"
        exit 1
    fi
}

# Verify Docker installation
verify_docker() {
    log_info "Verifying Docker installation..."
    
    # Check Docker version
    if docker --version; then
        log_success "Docker version check passed"
    else
        log_error "Docker version check failed"
        exit 1
    fi
    
    # Check Docker Compose
    if docker compose version; then
        log_success "Docker Compose version check passed"
    else
        log_error "Docker Compose version check failed"
        exit 1
    fi
    
    # Run hello-world container
    log_info "Running Docker hello-world test..."
    if docker run --rm hello-world; then
        log_success "Docker hello-world test passed"
    else
        log_error "Docker hello-world test failed"
        exit 1
    fi
}

# Install Supabase CLI
install_supabase_cli() {
    log_info "Installing Supabase CLI..."
    
    # Check if npm is available
    if command -v npm &> /dev/null; then
        # Install Supabase CLI as dev dependency
        npm install --save-dev supabase
        log_success "Supabase CLI installed via npm"
    else
        log_warning "npm not found. Please install Node.js and npm first"
        log_info "Then run: npm install --save-dev supabase"
    fi
}

# Start Supabase local development
start_supabase() {
    log_info "Starting Supabase local development..."
    
    # Check if supabase command is available
    if command -v npx &> /dev/null; then
        # Initialize Supabase if not already done
        if [[ ! -f "supabase/config.toml" ]]; then
            log_info "Initializing Supabase project..."
            npx supabase init
        fi
        
        # Start Supabase
        log_info "Starting Supabase services..."
        npx supabase start
        
        # Show status
        npx supabase status
        
        log_success "Supabase local development started"
    else
        log_warning "npx not found. Please install Node.js first"
    fi
}

# Main installation flow
main() {
    log_info "🐳 Thai Ride App - Docker Installation Script"
    log_info "============================================="
    
    # Detect operating system
    detect_os
    
    # Check if Docker is already installed and running
    if check_docker_installed; then
        log_info "Skipping Docker installation"
    else
        # Install Docker based on OS
        case $OS in
            macos)
                install_docker_macos
                start_docker_macos
                ;;
            linux)
                install_docker_linux
                start_docker_linux
                ;;
            windows)
                log_error "Windows installation not supported by this script"
                log_info "Please install Docker Desktop for Windows manually:"
                log_info "https://www.docker.com/products/docker-desktop/"
                exit 1
                ;;
        esac
    fi
    
    # Verify Docker installation
    verify_docker
    
    # Install Supabase CLI
    install_supabase_cli
    
    # Start Supabase local development
    start_supabase
    
    log_success "🎉 Installation completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Run 'npm run dev' to start the development server"
    log_info "2. Open http://localhost:5173 in your browser"
    log_info "3. Test the provider job system"
    log_info ""
    log_info "Useful commands:"
    log_info "- npx supabase status    # Check Supabase status"
    log_info "- npx supabase stop      # Stop Supabase services"
    log_info "- npx supabase start     # Start Supabase services"
    log_info "- docker ps              # List running containers"
}

# Run main function
main "$@"