#!/bin/bash
# Script to reset only the interview status and conversations for user pachocamacho@gmail.com
# without deleting their loaded profile data.

USER_EMAIL="pachocamacho@gmail.com"
DB_CONTAINER="jobboard-db"
DB_USER="jobboard_user"
DB_NAME="jobboard"

echo "Resetting interview status for $USER_EMAIL (preserving profile data)..."

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

# Reset onboarding status to 'interview_pending' and clear strategy + prompt, but KEEP profile_data
echo "Resetting agent profile onboarding status, strategy, and prompt..."
docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "UPDATE agent_profiles SET onboarding_status = 'interview_pending', career_strategy = '{}'::jsonb, search_prompt = NULL WHERE user_id = $USER_ID;"

# Delete all learned memories
echo "Deleting agent memories..."
docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DELETE FROM agent_memories WHERE user_id = $USER_ID;"

echo "Successfully reset interview status and strategy for $USER_EMAIL! Profile data remains intact."
