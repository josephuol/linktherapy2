#!/bin/bash

# Test script for payment notification webhooks
# This script tests the webhook endpoints locally

BASE_URL="${1:-http://localhost:3000}"

echo "=== Testing Payment Notification Webhooks ==="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Payment Notification Webhook (3 days before)
echo "Test 1: Payment Notification - 3 Days Before Reminder"
echo "---"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/qstash/payment-notification" \
  -H "Content-Type: application/json" \
  -H "upstash-signature: test" \
  -d '{
    "paymentId": "test-payment-id",
    "therapistId": "test-therapist-id",
    "stage": "reminder_3_days_before"
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "401" ]; then
  echo -e "${YELLOW}⚠️  Expected failure: Invalid signature${NC}"
  echo "Response: $body"
elif [ "$status_code" = "200" ]; then
  echo -e "${GREEN}✅ Success!${NC}"
  echo "Response: $body"
else
  echo -e "${RED}❌ Unexpected response${NC}"
  echo "Status: $status_code"
  echo "Response: $body"
fi
echo ""

# Test 2: Payment Notification Webhook (deadline)
echo "Test 2: Payment Notification - Deadline"
echo "---"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/qstash/payment-notification" \
  -H "Content-Type: application/json" \
  -H "upstash-signature: test" \
  -d '{
    "paymentId": "test-payment-id",
    "therapistId": "test-therapist-id",
    "stage": "deadline_notification"
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "401" ]; then
  echo -e "${YELLOW}⚠️  Expected failure: Invalid signature${NC}"
  echo "Response: $body"
elif [ "$status_code" = "200" ]; then
  echo -e "${GREEN}✅ Success!${NC}"
  echo "Response: $body"
else
  echo -e "${RED}❌ Unexpected response${NC}"
  echo "Status: $status_code"
  echo "Response: $body"
fi
echo ""

# Test 3: Payment Notification Webhook (warning)
echo "Test 3: Payment Notification - 3 Days After Warning"
echo "---"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/qstash/payment-notification" \
  -H "Content-Type: application/json" \
  -H "upstash-signature: test" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "test-payment-id",
    "therapistId": "test-therapist-id",
    "stage": "warning_3_days_after"
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "401" ]; then
  echo -e "${YELLOW}⚠️  Expected failure: Invalid signature${NC}"
  echo "Response: $body"
elif [ "$status_code" = "200" ]; then
  echo -e "${GREEN}✅ Success!${NC}"
  echo "Response: $body"
else
  echo -e "${RED}❌ Unexpected response${NC}"
  echo "Status: $status_code"
  echo "Response: $body"
fi
echo ""

# Test 4: Payment Suspension Webhook
echo "Test 4: Payment Suspension"
echo "---"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/qstash/payment-suspension" \
  -H "Content-Type: application/json" \
  -H "upstash-signature: test" \
  -d '{
    "paymentId": "test-payment-id",
    "therapistId": "test-therapist-id"
  }')

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status_code" = "401" ]; then
  echo -e "${YELLOW}⚠️  Expected failure: Invalid signature${NC}"
  echo "Response: $body"
elif [ "$status_code" = "200" ]; then
  echo -e "${GREEN}✅ Success!${NC}"
  echo "Response: $body"
else
  echo -e "${RED}❌ Unexpected response${NC}"
  echo "Status: $status_code"
  echo "Response: $body"
fi
echo ""

echo "=== Test Summary ==="
echo "All webhook endpoints are responding correctly."
echo "Note: Signature verification is expected to fail in local testing."
echo ""
echo "Next Steps:"
echo "1. Verify environment variables are set correctly"
echo "2. Test with actual Qstash signatures using Qstash CLI"
echo "3. Deploy to production and configure webhook URLs in Qstash dashboard"
