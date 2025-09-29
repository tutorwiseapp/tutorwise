#!/usr/bin/env python3
"""Test with different models and rate limits"""

import os
import time
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

api_key = os.getenv('GOOGLE_AI_API_KEY')
genai.configure(api_key=api_key)

# Try different models that might have different quotas
models_to_try = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
]

print("🔍 Testing different models for quota limits...")

for model_name in models_to_try:
    try:
        print(f"\n📝 Testing: {model_name}")
        model = genai.GenerativeModel(model_name)

        # Very minimal request
        response = model.generate_content("Hi",
                                        generation_config={
                                            'max_output_tokens': 10,
                                            'temperature': 0
                                        })
        print(f"✅ {model_name}: {response.text.strip()}")
        break  # If one works, we found the solution

    except Exception as e:
        if "429" in str(e):
            print(f"❌ {model_name}: Quota exceeded")
        elif "404" in str(e):
            print(f"⚠️ {model_name}: Model not found")
        else:
            print(f"❌ {model_name}: {str(e)[:100]}")

    # Small delay to avoid hammering the API
    time.sleep(1)

print("\n💡 If all models show quota exceeded:")
print("1. This might be a new API key that needs activation")
print("2. Or there's a daily generation limit even with generous quotas")
print("3. Try waiting 1-2 hours and test again")
print("4. Check Google AI Studio dashboard for usage metrics")