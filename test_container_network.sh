#!/bin/bash
# Test if container can make outbound requests

echo "Testing container network access..."

# Test 1: Can we reach DeepSeek API from outside the container
echo "1. Testing DeepSeek API from local machine:"
curl -s -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Authorization: Bearer sk-1add0c66bb594522b6597e164fcdd263" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek-chat", "messages": [{"role": "user", "content": "Test"}], "max_tokens": 5}' \
  -w "\nHTTP Status: %{http_code}\n" \
  | head -5

echo ""
echo "2. Testing if container process is running:"
curl -s "https://openclaw-kimi.yksanjo.workers.dev/api/status?token=0KItm2hnncZjgTjoVVbeBjLS2SHyrIit" | jq -r '.status'

echo ""
echo "3. Possible issues:"
echo "   a) Container can't reach DeepSeek API (network restriction)"
echo "   b) DeepSeek API key not passed to container correctly"
echo "   c) OpenClaw not configured to use DeepSeek"
echo "   d) Container process crashed"
echo ""
echo "4. Next steps:"
echo "   - Check container logs"
echo "   - Test with AI Gateway instead of direct API"
echo "   - Try a different AI provider (Anthropic, OpenAI)"
