#!/bin/bash

# Test script for Water Dashboard Management System
# This script verifies that all services are working correctly

set -e

echo "🧪 Testing Water Dashboard Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# Check if Docker is running
echo "🔍 Checking Docker status..."
if docker info >/dev/null 2>&1; then
    print_status 0 "Docker is running"
else
    print_status 1 "Docker is not running"
    exit 1
fi

# Check if containers are running
echo "🔍 Checking container status..."
if docker-compose ps | grep -q "Up"; then
    print_status 0 "All containers are running"
else
    print_status 1 "Some containers are not running"
    docker-compose ps
    exit 1
fi

# Test MongoDB connection
echo "🔍 Testing MongoDB connection..."
if docker exec water_mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    print_status 0 "MongoDB is accessible"
else
    print_status 1 "MongoDB is not accessible"
fi

# Test MQTT connection
echo "🔍 Testing MQTT connection..."
if command -v mosquitto_pub >/dev/null 2>&1; then
    if timeout 5 mosquitto_pub -h localhost -p 1883 -u mqtt_user -P mqtt_password -t test -m "test" >/dev/null 2>&1; then
        print_status 0 "MQTT broker is accessible"
    else
        print_status 1 "MQTT broker is not accessible"
    fi
else
    echo -e "${YELLOW}⚠️  mosquitto-clients not installed, skipping MQTT test${NC}"
fi

# Test backend API
echo "🔍 Testing backend API..."
if curl -f http://localhost/api/v1/ >/dev/null 2>&1; then
    print_status 0 "Backend API is accessible"
else
    print_status 1 "Backend API is not accessible"
fi

# Test frontend
echo "🔍 Testing frontend..."
if curl -f http://localhost/ >/dev/null 2>&1; then
    print_status 0 "Frontend is accessible"
else
    print_status 1 "Frontend is not accessible"
fi

# Test health endpoint
echo "🔍 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost/health 2>/dev/null || echo "{}")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    print_status 0 "Health endpoint is working"
else
    print_status 1 "Health endpoint is not working"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test admin login (if backend is accessible)
echo "🔍 Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "{}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    print_status 0 "Admin login is working"
else
    print_status 1 "Admin login is not working"
    echo "Response: $LOGIN_RESPONSE"
fi

echo ""
echo "🎉 Testing completed!"
echo ""
echo "📋 Summary:"
echo "   • Frontend: http://localhost"
echo "   • Backend API: http://localhost/api/v1/"
echo "   • MongoDB: localhost:27017"
echo "   • MQTT: localhost:1883"
echo ""
echo "🔑 Default admin credentials:"
echo "   • Username: admin"
echo "   • Password: admin123"
echo ""
echo "🔧 To view logs: docker-compose logs -f" 