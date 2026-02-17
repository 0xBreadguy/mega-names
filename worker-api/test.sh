#!/bin/bash

# Test script for .mega resolution API
# Run after starting the dev server with: npm run dev

echo "Testing .mega domain resolution API..."
echo

# Test forward resolve
echo "=== Forward Resolve Test ==="
echo "curl http://localhost:8788/resolve?name=bread.mega"
curl -s "http://localhost:8788/resolve?name=bread.mega" | jq
echo

# Test reverse resolve  
echo "=== Reverse Resolve Test ==="
echo "curl http://localhost:8788/resolve?address=0x1234567890123456789012345678901234567890"
curl -s "http://localhost:8788/resolve?address=0x1234567890123456789012345678901234567890" | jq
echo

# Test full lookup
echo "=== Full Lookup Test ==="
echo "curl http://localhost:8788/lookup?name=bread.mega"
curl -s "http://localhost:8788/lookup?name=bread.mega" | jq
echo

# Test error cases
echo "=== Error Cases ==="
echo "Invalid address:"
curl -s "http://localhost:8788/resolve?address=invalid" | jq
echo

echo "Missing parameters:"
curl -s "http://localhost:8788/resolve" | jq
echo

echo "Invalid name format:"
curl -s "http://localhost:8788/resolve?name=invalid..name" | jq
echo

# Test CORS
echo "=== CORS Headers ==="
curl -s -I -H "Origin: https://example.com" "http://localhost:8788/resolve?name=test.mega" | grep -E "(Access-Control|HTTP)"
echo

echo "Testing complete!"
echo
echo "NOTE: All names return 'not found' because the placeholder keccak256"
echo "implementation doesn't match the real contract. This is expected."
echo "Replace keccak256 functions with proper implementation for production."