#!/bin/bash

# Corrected User Invitation Flow Test Script
# Fixed URL formatting and variable extraction issues

set -e

API_BASE="http://localhost:3000/api/v1"
FRONTEND_BASE="http://localhost:3001"

echo "🚀 Testing User Invitation Flow (Corrected Version)"
echo "==================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Global variables for extracted data
ADMIN_TOKEN=""
USER_ID=""
ORG_ID=""
INVITATION_ID=""

# Fixed function to extract JSON values
extract_json_value() {
    local json="$1"
    local key="$2"
    
    # Clean the JSON first (remove any extra newlines or spaces)
    json=$(echo "$json" | tr -d '\n' | tr -s ' ')
    
    # Try different extraction patterns
    local value=""
    
    # Pattern 1: Direct key in root
    value=$(echo "$json" | sed -n 's/.*"'$key'":"\([^"]*\)".*/\1/p' | head -1)
    
    # Pattern 2: Key in data object
    if [ -z "$value" ]; then
        value=$(echo "$json" | sed -n 's/.*"data":{[^}]*"'$key'":"\([^"]*\)".*/\1/p' | head -1)
    fi
    
    # Pattern 3: Nested user object
    if [ -z "$value" ]; then
        value=$(echo "$json" | sed -n 's/.*"user":{[^}]*"'$key'":"\([^"]*\)".*/\1/p' | head -1)
    fi
    
    # Pattern 4: For non-quoted values (like IDs)
    if [ -z "$value" ]; then
        value=$(echo "$json" | sed -n 's/.*"'$key'":"*\([^",}]*\)"*.*/\1/p' | head -1)
    fi
    
    # Clean the value (remove any trailing characters)
    value=$(echo "$value" | sed 's/[^a-zA-Z0-9._-]//g')
    
    echo "$value"
}

# Fixed request function with proper URL handling
make_request_fixed() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    local expected_status="$5"
    local description="$6"
    
    echo ""
    echo -e "${BLUE}=== $description ===${NC}"
    
    # Clean the endpoint (remove any extra characters)
    endpoint=$(echo "$endpoint" | tr -d '\n' | tr -s '/')
    
    local full_url="$API_BASE$endpoint"
    echo "Request: $method $full_url"
    
    # Build headers array
    local headers=("-H" "Content-Type: application/json")
    if [ -n "$token" ]; then
        # Clean the token
        token=$(echo "$token" | tr -d '\n' | tr -d ' ')
        headers+=("-H" "Authorization: Bearer $token")
    fi
    
    # Execute request with cleaned parameters
    local response
    if [ -n "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X "$method" \
            "${headers[@]}" \
            -d "$data" \
            "$full_url")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X "$method" \
            "${headers[@]}" \
            "$full_url")
    fi
    
    # Parse response properly
    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2 | tr -d ' ')
    local response_body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    echo "HTTP Status: $http_code"
    echo "Response: $response_body"
    
    # Check status
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Test passed${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$response_body"
        return 0
    else
        echo -e "${RED}✗ Expected: $expected_status, Got: $http_code${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$response_body"
        return 1
    fi
}

# Test authentication with fixed parsing
test_authentication_fixed() {
    echo ""
    echo "Step 1: Authentication (Fixed)"
    echo "=============================="

    local login_data='{
        "email": "admin@demoproperties.com",
        "password": "admin123"
    }'

    echo "Testing login..."
    local login_response
    login_response=$(make_request_fixed "POST" "/auth/login" "$login_data" "" "200" "Admin login")
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "Extracting data from response..."
        
        # Extract values with better parsing
        ADMIN_TOKEN=$(extract_json_value "$login_response" "accessToken")
        if [ -z "$ADMIN_TOKEN" ]; then
            ADMIN_TOKEN=$(extract_json_value "$login_response" "token")
        fi
        
        USER_ID=$(extract_json_value "$login_response" "id")
        ORG_ID=$(extract_json_value "$login_response" "organizationId")
        
        echo "Extracted:"
        echo "  Token: ${ADMIN_TOKEN:0:20}..."
        echo "  User ID: $USER_ID"
        echo "  Org ID: $ORG_ID"
        
        if [ -n "$ADMIN_TOKEN" ] && [ ${#ADMIN_TOKEN} -gt 20 ]; then
            echo -e "${GREEN}✓ Authentication successful${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed to extract token${NC}"
            return 1
        fi
    else
        return 1
    fi
}

# Test existing endpoints that should work
test_existing_endpoints() {
    echo ""
    echo "Step 2: Test Existing Endpoints"
    echo "==============================="
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}✗ No token available${NC}"
        return 1
    fi
    
    # Test properties endpoint
    make_request_fixed "GET" "/properties" "" "$ADMIN_TOKEN" "200" "Get properties"
    
    # Test dashboard endpoint if ORG_ID is available
    if [ -n "$ORG_ID" ]; then
        make_request_fixed "GET" "/reports/dashboard/$ORG_ID" "" "$ADMIN_TOKEN" "200" "Get dashboard metrics"
    fi
}

# Test invitation endpoints
test_invitation_endpoints() {
    echo ""
    echo "Step 3: Test Invitation Endpoints"
    echo "================================="
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}✗ No token available${NC}"
        return 1
    fi
    
    # Test invitation creation
    local invite_data="{
        \"email\": \"testuser$(date +%s)@example.com\",
        \"firstName\": \"Test\",
        \"lastName\": \"User\",
        \"role\": \"PROPERTY_MANAGER\",
        \"entityIds\": []
    }"
    
    local invite_response
    invite_response=$(make_request_fixed "POST" "/users/invite" "$invite_data" "$ADMIN_TOKEN" "201" "Create invitation")
    
    if [ $? -eq 0 ]; then
        INVITATION_ID=$(extract_json_value "$invite_response" "id")
        echo "Invitation ID: $INVITATION_ID"
    fi
    
    # Test get organization invitations
    if [ -n "$ORG_ID" ]; then
        make_request_fixed "GET" "/users/organization/$ORG_ID/invitations" "" "$ADMIN_TOKEN" "200" "Get organization invitations"
    fi
    
    # Test validate invitation with invalid token
    make_request_fixed "GET" "/users/validate-invitation/invalid-token" "" "" "404" "Validate invalid token"
    
    # Test resend invitation if we have invitation ID
    if [ -n "$INVITATION_ID" ]; then
        make_request_fixed "POST" "/users/$INVITATION_ID/resend-invitation" "" "$ADMIN_TOKEN" "200" "Resend invitation"
    fi
}

# Print final summary
print_final_summary() {
    echo ""
    echo "========================================"
    echo "Final Test Summary"
    echo "========================================"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ -n "$ADMIN_TOKEN" ]; then
        echo -e "\nAuthentication: ${GREEN}✓ Working${NC}"
        echo "Token: ${ADMIN_TOKEN:0:30}..."
        echo "User ID: $USER_ID"
        echo "Org ID: $ORG_ID"
    else
        echo -e "\nAuthentication: ${RED}✗ Failed${NC}"
    fi
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    elif [ $TESTS_PASSED -gt 0 ]; then
        echo -e "\n${YELLOW}⚠ Some tests passed, some failed${NC}"
    else
        echo -e "\n${RED}❌ All tests failed${NC}"
    fi
    
    echo ""
    echo "Next steps:"
    echo "1. Check server logs for any errors"
    echo "2. Verify invitation endpoints in Swagger: http://localhost:3000/api/docs"
    echo "3. Test manually with curl using the working token"
}

# Main execution
main() {
    echo "Starting corrected invitation flow tests..."
    
    # Test authentication first
    test_authentication_fixed
    auth_result=$?
    
    if [ $auth_result -eq 0 ]; then
        # Test existing endpoints
        test_existing_endpoints
        
        # Test invitation-specific endpoints
        test_invitation_endpoints
    else
        echo -e "${RED}Authentication failed - skipping other tests${NC}"
    fi
    
    # Always show summary
    print_final_summary
}

# Run the tests
main "$@"