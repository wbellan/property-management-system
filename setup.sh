#!/bin/bash

# Property Management System - Getting Started Script

echo "🏢 Property Management System Setup"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists, if not create from example
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your database credentials"
else
    echo "✅ .env file already exists"
fi

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker detected. Starting PostgreSQL..."
    docker-compose up -d postgres
    
    # Wait a bit for PostgreSQL to start
    echo "⏳ Waiting for PostgreSQL to start..."
    sleep 10
else
    echo "⚠️  Docker not found. Please ensure PostgreSQL is running manually."
    echo "   Database URL should be: postgresql://postgres:postgres@localhost:5432/property_management_db"
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npm run db:generate

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Seed the database
echo "🌱 Seeding database with demo data..."
npm run db:seed

# Make test script executable
chmod +x test-api.sh

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the development server: npm run start:dev"
echo "2. Visit the API docs: http://localhost:3000/api/docs"
echo "3. Run the API test script: ./test-api.sh"
echo ""
echo "🧪 Demo accounts for testing:"
echo "   - Super Admin: admin@demoproperties.com / admin123"
echo "   - Org Admin: orgadmin@demoproperties.com / admin123"
echo "   - Entity Manager: manager@sunsetproperties.com / admin123"
echo "   - Tenant: tenant@example.com / admin123"
echo ""
echo "🏗️  What's built so far:"
echo "   ✅ Authentication & Authorization (JWT + Role-based)"
echo "   ✅ Organizations Module (Property management companies)"
echo "   ✅ Entities Module (Property owners - LLCs, individuals)"
echo "   ✅ Properties Module (Buildings/complexes)"
echo "   ✅ Spaces Module (Units/rooms within properties)"
echo "   ✅ Leases Module (Tenant agreements & lifecycle management)"
echo "   ✅ Financials Module (Invoicing, payments, bank reconciliation)"
echo "   🚧 Maintenance Module (Ready for implementation)"
echo "   🚧 Reports Module (Ready for implementation)"
echo ""
echo "🚀 Ready to build your property management system!"