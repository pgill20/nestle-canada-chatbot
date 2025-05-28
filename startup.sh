#!/bin/bash

# Azure App Service startup script
echo "Starting Nestlé Chatbot Application..."

# Install dependencies
pip install -r requirements.txt

# Run database migrations or setup (if needed)
# python setup_db.py

# Start the application
echo "Starting Flask application with Gunicorn..."
gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app