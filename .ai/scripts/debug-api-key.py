#!/usr/bin/env python3
"""Debug API key details"""

import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

api_key = os.getenv('GOOGLE_AI_API_KEY')
print(f"🔍 API Key Analysis:")
print(f"Length: {len(api_key) if api_key else 'None'}")
print(f"Format: {api_key[:20]}..." if api_key else "Missing")

# Check if the key format suggests it's from Google AI Studio vs Cloud Console
if api_key:
    if api_key.startswith('AIzaSy'):
        print("✅ Correct Google AI key format")
    else:
        print("❌ Incorrect key format")

genai.configure(api_key=api_key)

print("\n🔍 Testing different approaches...")

# Test 1: Basic model listing (this should work)
try:
    models = list(genai.list_models())
    print(f"✅ Can list {len(models)} models - key authenticates")
except Exception as e:
    print(f"❌ Cannot list models: {e}")
    exit(1)

# Test 2: Try the absolute simplest generation
try:
    print("\n📝 Testing minimal generation...")
    model = genai.GenerativeModel('gemini-2.5-flash')

    # Most minimal possible request
    response = model.generate_content(
        "Hi",
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=1,
            temperature=0,
        )
    )
    print(f"✅ SUCCESS: '{response.text}'")

except Exception as e:
    print(f"❌ Generation failed: {e}")

    # Check if it's specifically a quota issue
    if "429" in str(e):
        print("\n🔍 Quota error details:")
        print("This suggests the API key is valid but has no generation quota")
        print("Possible causes:")
        print("1. Key created in Google AI Studio but needs Google Cloud Console setup")
        print("2. API not enabled in Google Cloud Console for this project")
        print("3. Need to request quota increase")
        print("4. Regional restrictions")

        # Check if we can get more details
        error_str = str(e).lower()
        if "check your plan" in error_str:
            print("\n💡 Try: Go to Google Cloud Console → APIs & Services → Generative Language API")
            print("    Check if API is enabled and has proper quotas set")