#!/bin/bash
# Verification Script with File Upload

API_URL="http://localhost:3000/api"
EMAIL="test@example.com"
PASSWORD="password123"

# 1. Login
TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | jq -r .token)

# 2. Create Job
JOB_ID=$(curl -s -X POST $API_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company": "Transform Files Corp", "status": "applied"}' | jq -r .id)

echo "Created Job ID: $JOB_ID"

# 3. Upload File
echo "Hello World" > test.txt
UPLOAD_RES=$(curl -s -X POST $API_URL/jobs/$JOB_ID/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt")
echo "Upload Result: $UPLOAD_RES"

# 4. Transform
TRANSFORM_RES=$(curl -s -X POST $API_URL/jobs/$JOB_ID/transform \
  -H "Authorization: Bearer $TOKEN")
ENTITY_ID=$(echo $TRANSFORM_RES | jq -r .entityId)
echo "Entity ID: $ENTITY_ID"

# 5. Verify Files
FILE_COUNT=$(echo "SELECT count(*) FROM business_entity_files WHERE entity_id = $ENTITY_ID;" | docker exec -i jobboard-db psql -U jobboard_user -d jobboard -t | tr -d ' ')

echo "Files copied: $FILE_COUNT (Expected: 1)"

if [ "$FILE_COUNT" -eq 1 ]; then
    echo "✅ File Migration Verified!"
else
    echo "❌ File Migration Failed!"
fi

rm test.txt
