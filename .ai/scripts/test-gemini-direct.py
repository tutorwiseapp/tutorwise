#!/usr/bin/env python3
"""Direct Gemini API test - bypassing all our code"""

import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Load environment exactly like our CLI
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

api_key = os.getenv('GOOGLE_AI_API_KEY')
print(f"API Key loaded: {api_key[:20]}..." if api_key else "❌ No API key")

if not api_key:
    exit(1)

# Configure and test basic API access
genai.configure(api_key=api_key)

print("\n🔍 Testing API access...")

try:
    # Test 1: List models (this should work even with quota issues for generation)
    print("\n1. Testing model listing:")
    models = list(genai.list_models())
    print(f"✅ Found {len(models)} models")

    # Test 2: Try the simplest possible generation
    print("\n2. Testing content generation with gemini-2.5-flash:")
    model = genai.GenerativeModel('gemini-2.5-flash')

    # Very simple prompt to minimize quota usage
    response = model.generate_content("Say hello")
    print(f"✅ Response received: {response.text[:50]}...")

except Exception as e:
    print(f"❌ Error: {e}")
    print(f"Error type: {type(e).__name__}")

    # Check if it's really a quota issue
    if "429" in str(e):
        print("\n🔍 This is indeed a quota/rate limit issue")
        print("Possible causes:")
        print("1. Daily quota exceeded")
        print("2. Rate limit hit (requests per minute)")
        print("3. Free tier limits")
        print("4. Regional restrictions")
        print("5. API key permissions")
    elif "401" in str(e) or "403" in str(e):
        print("\n🔍 This is an authentication/permission issue")
        print("Check if API key is valid and has proper permissions")
    else:
        print(f"\n🔍 Unexpected error: {e}")

print("\n💡 Suggestions:")
print("1. Check Google AI Studio quota dashboard")
print("2. Try waiting a few minutes (rate limiting)")
print("3. Verify API key has Gemini API enabled")
print("4. Check if there are any regional restrictions")