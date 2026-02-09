#!/bin/bash
# Verification Script for Job Transformation

API_URL="http://localhost:3000/api"
EMAIL="test@example.com"
PASSWORD="password123"

echo "1. Authenticating..."
TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | jq -r .token)

if [ "$TOKEN" == "null" ]; then
    echo "Login failed. Creating account..."
    TOKEN=$(curl -s -X POST $API_URL/auth/signup \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | jq -r .token)
fi

echo "Token: ${TOKEN:0:10}..."

echo "2. Creating a Job..."
JOB_ID=$(curl -s -X POST $API_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Transform Corp",
    "position": "Future CEO",
    "status": "interview",
    "comments": "Testing transformation"
  }' | jq -r .id)

echo "Job ID: $JOB_ID"

echo "3. Transforming Job..."
TRANSFORM_RES=$(curl -s -X POST $API_URL/jobs/$JOB_ID/transform \
  -H "Authorization: Bearer $TOKEN")

echo "Transform Response: $TRANSFORM_RES"
ENTITY_ID=$(echo $TRANSFORM_RES | jq -r .entityId)

echo "Entity ID: $ENTITY_ID"

echo "4. Verifying Job Status (Locked & Archived)..."
JOB_RES=$(curl -s -X GET $API_URL/jobs \
  -H "Authorization: Bearer $TOKEN")

# Filter for the specific job using jq
JOB_STATUS=$(echo $JOB_RES | jq -r ".[] | select(.id == $JOB_ID) | .status")
JOB_LOCKED=$(echo $JOB_RES | jq -r ".[] | select(.id == $JOB_ID) | .is_locked")

echo "Job Status: $JOB_STATUS (Expected: archived)"
echo "Job Locked: $JOB_LOCKED (Expected: true)"

if [ "$JOB_STATUS" == "archived" ] && [ "$JOB_LOCKED" == "true" ]; then
    echo "✅ Job Transformation Verified!"
else
    echo "❌ Job Transformation Failed!"
fi
