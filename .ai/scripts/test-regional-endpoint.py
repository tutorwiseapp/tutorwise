#!/usr/bin/env python3
"""Test different regional endpoints"""

import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

api_key = os.getenv('GOOGLE_AI_API_KEY')
print(f"🔍 Testing regional endpoints...")

# Configure with explicit client options
genai.configure(api_key=api_key)

# Test different approaches
test_cases = [
    {
        "name": "Default (Global)",
        "config": {}
    },
    {
        "name": "Europe West1 Endpoint",
        "config": {"client_options": {"api_endpoint": "europe-west1-generativelanguage.googleapis.com"}}
    }
]

for test_case in test_cases:
    try:
        print(f"\n📝 Testing: {test_case['name']}")

        # Reconfigure for this test
        genai.configure(api_key=api_key, **test_case['config'])

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            "Hi",
            generation_config={
                'max_output_tokens': 5,
                'temperature': 0
            }
        )
        print(f"✅ SUCCESS with {test_case['name']}: {response.text}")
        break

    except Exception as e:
        print(f"❌ Failed with {test_case['name']}: {str(e)[:100]}...")
        if "429" not in str(e):
            print(f"   Different error: {e}")

print("\n💡 If all fail with 429 errors, the issue might be:")
print("1. Account-level quota restrictions")
print("2. New project quota approval needed")
print("3. Billing account verification pending")