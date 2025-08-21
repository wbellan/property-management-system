#!/bin/bash

# JWT Token Debug Test
# Let's decode your JWT token to see what's in it

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWVoYzBvcjMwMDAxMTBvZTEyMjkyZG9zIiwiZW1haWwiOiJhZG1pbkBkZW1vcHJvcGVydGllcy5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJvcmdhbml6YXRpb25JZCI6ImRlbW8tb3JnLWlkIiwiaWF0IjoxNzU1ODA3NTQ1LCJleHAiOjE3NTU4OTM5NDV9.hGMz9DY0rJ_T5avFPCAEYMyjMH6UnnXYqtVqn1Afd7E"

echo "🔍 JWT Token Analysis"
echo "====================="

echo ""
echo "1. Token parts:"
echo "Header: $(echo $TOKEN | cut -d'.' -f1)"
echo "Payload: $(echo $TOKEN | cut -d'.' -f2)"
echo "Signature: $(echo $TOKEN | cut -d'.' -f3)"

echo ""
echo "2. Decoded payload:"
# Decode the payload (add padding if needed)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# Add padding
case ${#PAYLOAD} in
  *) PAYLOAD="${PAYLOAD}$(printf '%*s' $((4 - ${#PAYLOAD} % 4)) | tr ' ' '=')" ;;
esac

if command -v base64 >/dev/null 2>&1; then
    echo $PAYLOAD | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null || echo $PAYLOAD | base64 -d
else
    echo "base64 command not available"
fi

echo ""
echo "3. Testing current token with user endpoint:"
curl -X GET "http://localhost:3000/api/v1/properties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "4. Check server logs for JWT strategy debug output"
echo "5. If you see 'JWT Strategy - Raw payload:' in logs, the token is being processed"