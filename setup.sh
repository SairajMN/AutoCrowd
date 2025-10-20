#!/bin/bash

# AutoCrowd Setup Script
# This script sets up the entire AutoCrowd development environment

set -e

echo "🚀 Setting up AutoCrowd Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Check if Python is installed
check_python() {
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3.8+ is not installed. Please install Python and try again."
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    print_success "Python $PYTHON_VERSION is installed"
}

# Check if Git is installed
check_git() {
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git and try again."
        exit 1
    fi
    
    print_success "Git $(git --version | cut -d' ' -f3) is installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install contract dependencies
    print_status "Installing contract dependencies..."
    cd contracts
    npm install
    cd ..
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    print_success "All dependencies installed successfully"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Copy environment examples if they don't exist
    if [ ! -f .env ]; then
        cp env.example .env
        print_warning "Created .env file from template. Please update with your values."
    fi
    
    if [ ! -f frontend/.env.local ]; then
        cp frontend/env.example frontend/.env.local
        print_warning "Created frontend/.env.local file from template. Please update with your values."
    fi
    
    if [ ! -f backend/.env ]; then
        cp backend/env.example backend/.env
        print_warning "Created backend/.env file from template. Please update with your values."
    fi
    
    if [ ! -f contracts/.env ]; then
        cp contracts/env.example contracts/.env
        print_warning "Created contracts/.env file from template. Please update with your values."
    fi
    
    print_success "Environment files created"
}

# Build contracts
build_contracts() {
    print_status "Building contracts..."
    
    cd contracts
    
    # Check if Foundry is installed
    if ! command -v forge &> /dev/null; then
        print_error "Foundry is not installed. Please install Foundry and try again."
        print_status "Install Foundry: https://getfoundry.sh/"
        cd ..
        exit 1
    fi
    
    # Build contracts
    forge build
    
    cd ..
    
    print_success "Contracts built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test contracts
    print_status "Testing contracts..."
    cd contracts
    forge test
    cd ..
    
    # Test frontend (if tests exist)
    if [ -f frontend/package.json ] && grep -q '"test"' frontend/package.json; then
        print_status "Testing frontend..."
        cd frontend
        npm test
        cd ..
    fi
    
    # Test backend (if tests exist)
    if [ -f backend/package.json ] && grep -q '"test"' backend/package.json; then
        print_status "Testing backend..."
        cd backend
        npm test
        cd ..
    fi
    
    print_success "All tests passed"
}

# Main setup function
main() {
    echo "Starting AutoCrowd setup..."
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    check_node
    check_python
    check_git
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_environment
    
    # Build contracts
    build_contracts
    
    # Run tests
    run_tests
    
    echo ""
    print_success "🎉 AutoCrowd setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update environment files with your configuration:"
    echo "   - .env (root)"
    echo "   - frontend/.env.local"
    echo "   - backend/.env"
    echo "   - contracts/.env"
    echo ""
    echo "2. Deploy contracts:"
    echo "   npm run deploy:contracts"
    echo ""
    echo "3. Start development servers:"
    echo "   npm run dev"
    echo ""
    echo "4. Start backend services:"
    echo "   cd backend && npm run dev"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"
