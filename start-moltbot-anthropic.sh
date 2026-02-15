#!/bin/bash
# Startup script for Moltbot with Anthropic Claude
# Simplified version that just uses the template without complex modifications

set -e

# Check if clawdbot gateway is already running
if pgrep -f "clawdbot gateway" > /dev/null 2>&1; then
    echo "Moltbot gateway is already running, exiting."
    exit 0
fi

# Paths
CONFIG_DIR="/root/.clawdbot"
CONFIG_FILE="$CONFIG_DIR/clawdbot.json"
TEMPLATE_DIR="/root/.clawdbot-templates"
TEMPLATE_FILE="$TEMPLATE_DIR/moltbot.json.template"
BACKUP_DIR="/data/moltbot"

echo "Config directory: $CONFIG_DIR"
echo "Backup directory: $BACKUP_DIR"

# Create config directory
mkdir -p "$CONFIG_DIR"

# ============================================================
# RESTORE FROM R2 BACKUP (simplified)
# ============================================================
if [ -f "$BACKUP_DIR/clawdbot/clawdbot.json" ]; then
    echo "Restoring from R2 backup at $BACKUP_DIR/clawdbot..."
    cp -a "$BACKUP_DIR/clawdbot/." "$CONFIG_DIR/"
    echo "Restored config from R2 backup"
elif [ -f "$BACKUP_DIR/clawdbot.json" ]; then
    # Legacy backup format
    echo "Restoring from legacy R2 backup at $BACKUP_DIR..."
    cp -a "$BACKUP_DIR/." "$CONFIG_DIR/"
    echo "Restored config from legacy R2 backup"
elif [ -d "$BACKUP_DIR" ]; then
    echo "R2 mounted at $BACKUP_DIR but no backup data found yet"
else
    echo "R2 not mounted, starting fresh"
fi

# If config file still doesn't exist, create from template
if [ ! -f "$CONFIG_FILE" ]; then
    echo "No existing config found, initializing from template..."
    if [ -f "$TEMPLATE_FILE" ]; then
        cp "$TEMPLATE_FILE" "$CONFIG_FILE"
        echo "Copied template to config file"
    else
        echo "ERROR: Template file not found at $TEMPLATE_FILE"
        exit 1
    fi
fi

# Simple environment variable substitution for API keys
echo "Applying environment variables to config..."

# Use Node.js for simple JSON manipulation
node << 'EOF'
const fs = require('fs');
const configPath = process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Apply Anthropic API key if set
if (process.env.ANTHROPIC_API_KEY && config.models?.providers?.anthropic) {
    console.log('Setting Anthropic API key from environment variable');
    config.models.providers.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
}

// Apply gateway token if set
if (process.env.CLAWDBOT_GATEWAY_TOKEN && config.gateway) {
    config.gateway.auth = config.gateway.auth || {};
    config.gateway.auth.token = process.env.CLAWDBOT_GATEWAY_TOKEN;
}

// Write updated config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Configuration updated with environment variables');
EOF

echo "Starting Moltbot Gateway..."
echo "Gateway will be available on port 18789"

# Start the gateway
exec clawdbot gateway --config "$CONFIG_FILE"