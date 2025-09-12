#!/bin/sh
set -e

# Pull the latest changes from the main branch
echo "Pulling latest changes from git..."
git pull origin main

# Now execute the command passed to the script (e.g., "npm run prod")
npm i
echo "Starting application..."
exec "$@"
