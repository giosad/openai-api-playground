#!/bin/sh
set -e

# Display current user info
echo "Starting with user: $(id)"

# Get PUID/PGID from environment, default to 1000/1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Using PUID=$PUID and PGID=$PGID"

# Find existing user with this UID, or create one
EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1 || true)

if [ -n "$EXISTING_USER" ]; then
    echo "Using existing user '$EXISTING_USER' with UID: $PUID"
    APP_USER="$EXISTING_USER"
else
    # Create group if needed
    if ! getent group appgroup >/dev/null 2>&1; then
        echo "Creating appgroup with GID: $PGID"
        addgroup -g $PGID appgroup
    fi
    
    # Create user
    echo "Creating appuser with UID: $PUID"
    adduser -u $PUID -G appgroup -D -s /bin/sh appuser
    APP_USER="appuser"
fi

# Set ownership of app directory
echo "Setting ownership of /app to $PUID:$PGID"
chown -R $PUID:$PGID /app

# Switch to user and execute the command
echo "Switching to $APP_USER and executing command"
exec su-exec "$APP_USER" "$@"
