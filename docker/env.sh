#!/usr/bin/env sh
# ================================================================================
# File: env.sh
# Description: Replaces environment variables in asset files.
# ================================================================================

# Set the exit flag to exit immediately if any command fails
set -e


# Check if the directory exists
if [ ! -d "/usr/share/nginx/html" ]; then
    # If not, display a warning message and skip to the next iteration
    echo "Warning: directory '/usr/share/nginx/html' not found, skipping."
    continue
fi

# Display the current directory being scanned
echo "Scanning directory: /usr/share/nginx/html"

# Iterate through each environment variable that starts with CONLUZ
env | grep "^CONLUZ" | while IFS='=' read -r key value; do
    # Display the variable being replaced
    echo "  • Replacing ${key} → ${value}"

    # Use find and sed to replace the variable in all files within the directory
    find "/usr/share/nginx/html" -type f \
        -exec sed -i "s|${key}|${value}|g" {} +
done
