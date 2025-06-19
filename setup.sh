#!/bin/bash

# Water Dashboard Management System - Docker Setup Script
# This script sets up the complete system with auto-startup

set -e

echo "🚀 Setting up Water Dashboard Management System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if running as root (needed for systemd service)
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  This script needs to be run as root to install the systemd service."
    echo "   Please run: sudo $0"
    exit 1
fi

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 Working directory: $SCRIPT_DIR"

# Build and start the containers
echo "🔨 Building and starting containers..."
cd "$SCRIPT_DIR"
docker-compose down --volumes --remove-orphans 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ All services are running!"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Install systemd service for auto-startup
echo "🔧 Installing systemd service for auto-startup..."
cp "$SCRIPT_DIR/water-dashboard.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable water-dashboard.service

echo "✅ Systemd service installed and enabled!"

# Show service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   • Access the application at: http://localhost"
echo "   • Admin login: admin / admin123"
echo "   • MQTT broker: localhost:1883"
echo "   • MongoDB: localhost:27017"
echo ""
echo "🔧 Useful commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart services: docker-compose restart"
echo "   • Check systemd service: systemctl status water-dashboard"
echo ""
echo "🔄 The system will now automatically start on system boot!" 