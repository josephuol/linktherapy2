#!/bin/bash

# Run tests in Docker container
# Usage: ./run-tests-docker.sh <your-email>

set -e

TEST_EMAIL="${1:-test@example.com}"

echo "=== Building Test Container ==="
docker build -f Dockerfile.test -t linktherapy-test .

echo ""
echo "=== Running Email Template Tests ==="
echo "Test email will be sent to: $TEST_EMAIL"
echo ""

# Run the email test
docker run --rm \
  -v "$(pwd)/.env.local:/app/.env.local:ro" \
  linktherapy-test \
  node test-emails-direct.js "$TEST_EMAIL"

echo ""
echo "=== Tests Complete ==="
echo "Check your email inbox for test messages!"
