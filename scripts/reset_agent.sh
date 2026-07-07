#!/bin/bash
# Script to reset the agent onboarding status and conversations for user pachocamacho@gmail.com

USER_EMAIL="pachocamacho@gmail.com"
DB_CONTAINER="jobboard-db"
DB_USER="jobboard_user"
DB_NAME="jobboard"

echo "Resetting agent status for $USER_EMAIL..."

# Get user ID
USER_ID=$(docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "SELECT id FROM users WHERE email = '$USER_EMAIL';")

if [ -z "$USER_ID" ]; then
    echo "Error: User $USER_EMAIL not found in database."
    exit 1
fi

echo "Found user ID: $USER_ID"

# Delete conversations
echo "Deleting agent conversations..."
docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DELETE FROM agent_conversations WHERE user_id = $USER_ID;"

# Reset agent profile onboarding status and clear profile data
echo "Resetting agent profile onboarding status..."
docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "UPDATE agent_profiles SET onboarding_status = 'uninitialized', profile_data = '{}'::jsonb WHERE user_id = $USER_ID;"

echo "Successfully reset agent status for $USER_EMAIL!"
