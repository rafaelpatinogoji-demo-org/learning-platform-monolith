#!/bin/bash

# LearnLite Database Seeding Script
# This script sets up the database with sample data for development

set -e

echo "🌱 LearnLite Database Seeding"
echo "=============================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure your database settings."
    exit 1
fi

# Check if database is running
echo "🔍 Checking database connection..."
if ! npm run migrate:up > /dev/null 2>&1; then
    echo "❌ Database connection failed. Please ensure your database is running:"
    echo "   docker compose up -d"
    exit 1
fi

echo "✅ Database connection successful"

# Run migrations
echo "📦 Running database migrations..."
npm run migrate:up

# Run seed script
echo "🌱 Seeding database with sample data..."
echo "⚠️  WARNING: This will completely clear all existing data!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

npm run seed

echo ""
echo "✅ Database seeding completed successfully!"
echo ""
echo "🔑 You can now log in with these test accounts:"
echo "   Admin:      admin@learnlite.com / admin123"
echo "   Instructor: john.instructor@learnlite.com / instructor123"
echo "   Student:    alice.student@learnlite.com / student123"
echo ""
echo "🚀 Start the development server with: npm run dev"
