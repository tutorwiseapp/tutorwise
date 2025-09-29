#!/usr/bin/env python3
"""Check available Gemini models"""

import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

api_key = os.getenv('GOOGLE_AI_API_KEY')
if not api_key:
    print("❌ GOOGLE_AI_API_KEY not found")
    exit(1)

genai.configure(api_key=api_key)

print("🔍 Available Gemini models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"✅ {model.name}")