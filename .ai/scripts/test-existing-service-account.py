#!/usr/bin/env python3
"""Test existing google-credentials.json service account"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

def test_existing_service_account():
    """Test using existing google-credentials.json"""

    service_account_file = project_root / "google-credentials.json"

    print("🔍 Testing existing google-credentials.json...")

    if not service_account_file.exists():
        print(f"❌ File not found: {service_account_file}")
        return False

    try:
        # Load service account info
        with open(service_account_file) as f:
            service_info = json.load(f)
            print(f"✅ Service account: {service_info.get('client_email', 'Unknown')}")
            print(f"📋 Project: {service_info.get('project_id', 'Unknown')}")

        # Test with google-auth
        from google.oauth2 import service_account
        import google.generativeai as genai

        # Create credentials from service account
        credentials = service_account.Credentials.from_service_account_file(
            service_account_file,
            scopes=['https://www.googleapis.com/auth/generative-language']
        )

        print("🔑 Existing service account credentials loaded")

        # Configure Gemini with service account
        genai.configure(credentials=credentials)

        print("📝 Testing API call...")
        model = genai.GenerativeModel('gemini-2.5-flash')

        response = model.generate_content(
            "Hi",
            generation_config={
                'max_output_tokens': 5,
                'temperature': 0
            }
        )

        print(f"✅ SUCCESS: {response.text}")
        return True

    except Exception as e:
        print(f"❌ Existing service account test failed: {e}")
        if "429" in str(e):
            print("💡 Same quota issue with existing service account")
        return False

if __name__ == "__main__":
    test_existing_service_account()