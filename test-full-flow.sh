#!/bin/bash

echo "🧪 Testing Full Interview Categories Flow"
echo "========================================"
echo

# Test 1: Can we get categories?
echo "✓ GET /api/questions"
CATEGORIES=$(curl -s http://localhost:3001/api/questions | jq -r '.categories')
if [ "$CATEGORIES" != "null" ]; then
  echo "  ✅ Categories loaded"
  echo "  📋 $(echo "$CATEGORIES" | jq -r 'length') categories available"
  echo "  🏷️  $(echo "$CATEGORIES" | jq -r 'map(.name) | join(", ")')"
else
  echo "  ❌ No categories found"
  exit 1
fi
echo

# Test 2: Can we start a session with new format?
echo "✓ POST /api/interview/start-session (NEW format)"
SESSION_RESPONSE=$(curl -s http://localhost:3001/api/interview/start-session \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "behavioral",
    "questionIds": ["disagreed-engineer", "owned-decision"],
    "difficulty": "medium"
  }')

if echo "$SESSION_RESPONSE" | jq -e '.session.clientSecret' > /dev/null 2>&1; then
  echo "  ✅ Session created successfully"
  echo "  📂 Category: $(echo "$SESSION_RESPONSE" | jq -r '.categoryName')"
  echo "  📝 Questions: $(echo "$SESSION_RESPONSE" | jq -r '.questionStack | length')"
  echo "  ⏱️  Duration: $(echo "$SESSION_RESPONSE" | jq -r '.estimatedDuration') min"
else
  echo "  ❌ Failed to create session"
  echo "$SESSION_RESPONSE" | jq .
  exit 1
fi
echo

# Test 3: Check backward compatibility
echo "✓ POST /api/interview/start-session (OLD format)"
OLD_SESSION=$(curl -s http://localhost:3001/api/interview/start-session \
  -H "Content-Type: application/json" \
  -d '{
    "questionStack": [{"id": "test", "text": "Test question", "prompt": "Test"}],
    "difficulty": "medium"
  }')

if echo "$OLD_SESSION" | jq -e '.session.clientSecret' > /dev/null 2>&1; then
  echo "  ✅ Old format still works (backward compatible)"
else
  echo "  ❌ Old format broken"
  exit 1
fi
echo

echo "========================================"
echo "🎉 All tests passed!"
echo
echo "Frontend ready at: http://localhost:3001"
echo "Test the UI now!"

