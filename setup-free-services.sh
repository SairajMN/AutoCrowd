#!/bin/bash

echo "🚀 Setting up AutoCrowd with FREE services for Vercel deployment"
echo "================================================================="

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI is not installed. Installing..."
        npm install -g vercel
    fi

    print_success "Dependencies check passed!"
}

# Setup Supabase (Free PostgreSQL)
setup_supabase() {
    print_status "Setting up Supabase (Free PostgreSQL)..."

    echo ""
    echo "📋 Supabase is already configured with your provided credentials!"
    echo "Project: https://ukelmbogzbptpkgpegvr.supabase.co"
    echo ""

    # The Supabase URL is already configured in the environment files
    print_success "Supabase configured!"
}

# Setup Upstash Redis (Free)
setup_upstash() {
    print_status "Setting up Upstash Redis (Free)..."

    echo ""
    echo "📋 Upstash Redis Setup Instructions:"
    echo "1. Go to https://console.upstash.com"
    echo "2. Sign up for a free account"
    echo "3. Create a Redis database"
    echo "4. Copy the REDIS URL (rediss:// format)"
    echo ""
    read -p "Enter your Upstash Redis URL: " UPSTASH_URL

    if [ -z "$UPSTASH_URL" ]; then
        print_error "Upstash Redis URL is required!"
        exit 1
    fi

    # Update backend/.env
    sed -i.bak "s|REDIS_URL=.*|REDIS_URL=$UPSTASH_URL|" backend/.env
    print_success "Upstash Redis configured!"
}

# Setup ASI API Key (Real AI)
setup_asi_key() {
    print_status "Setting up ASI API Key for Real AI Verification..."

    echo ""
    echo "📋 ASI API Key Setup Instructions:"
    echo "1. Go to https://asi.one or contact ASI team"
    echo "2. Get your API key for production use"
    echo "3. This enables REAL AI milestone verification"
    echo ""
    read -p "Enter your ASI API Key (leave empty to skip): " ASI_KEY

    if [ -n "$ASI_KEY" ]; then
        # Update backend/.env
        sed -i.bak "s|ASI_API_KEY=.*|ASI_API_KEY=$ASI_KEY|" backend/.env
        print_success "ASI API Key configured for REAL AI verification!"
    else
        print_warning "ASI API Key not provided - will use mock verification"
    fi
}

# Setup Vercel project
setup_vercel() {
    print_status "Setting up Vercel deployment..."

    # Check if already logged in
    if ! vercel whoami &> /dev/null; then
        print_status "Please login to Vercel:"
        vercel login
    fi

    # Link project
    if [ ! -f ".vercel/project.json" ]; then
        print_status "Linking project to Vercel..."
        vercel link --yes
    fi

    print_success "Vercel configured!"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    # Backend dependencies
    cd backend
    npm install
    cd ..

    # Frontend dependencies
    cd frontend
    npm install
    cd ..

    print_success "Dependencies installed!"
}

# Configure environment variables
configure_env() {
    print_status "Configuring environment variables..."

    # Generate secure random strings
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    # Update backend/.env with generated secrets
    sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" backend/.env
    sed -i.bak "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" backend/.env

    print_success "Environment variables configured!"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."

    # Set environment variables in Vercel
    print_status "Setting environment variables in Vercel..."

    # Read from backend/.env and set in Vercel
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue

        # Remove quotes if present
        value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")

        print_status "Setting $key..."
        vercel env add "$key" production <<< "$value"
    done < backend/.env

    # Deploy
    print_status "Deploying application..."
    vercel --prod

    print_success "Deployment completed!"
}

# Main setup function
main() {
    echo "🤖 AutoCrowd Free Services Setup"
    echo "=================================="

    check_dependencies
    setup_supabase
    setup_upstash
    setup_asi_key
    setup_vercel
    install_dependencies
    configure_env
    deploy_to_vercel

    echo ""
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Your app is now deployed to Vercel"
    echo "2. Update your contract addresses if needed"
    echo "3. Test the AI verification functionality"
    echo "4. Monitor your free tier usage"
    echo ""
    echo "🔗 Useful Links:"
    echo "- Vercel Dashboard: https://vercel.com/dashboard"
    echo "- Supabase Dashboard: https://supabase.com/dashboard"
    echo "- Upstash Console: https://console.upstash.com"
    echo "- Blockscout: https://eth-sepolia.blockscout.com"
}

# Run main function
main "$@"
