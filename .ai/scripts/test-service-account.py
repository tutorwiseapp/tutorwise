#!/usr/bin/env python3
"""Test Service Account approach for Gemini API"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

def test_service_account():
    """Test using Service Account for Gemini API"""

    service_account_file = project_root / "service-account-key.json"

    print("🔍 Testing Service Account approach...")

    if not service_account_file.exists():
        print(f"❌ Service account file not found: {service_account_file}")
        print("💡 Please create and download service account key from Google Cloud Console")
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

        print("🔑 Service account credentials loaded")

        # Configure Gemini with service account
        genai.configure(credentials=credentials)

        print("📝 Testing API call...")
        model = genai.GenerativeModel('gemini-2.5-flash')

        response = model.generate_content(
            "Hello",
            generation_config={
                'max_output_tokens': 10,
                'temperature': 0
            }
        )

        print(f"✅ SUCCESS: {response.text}")
        return True

    except ImportError as e:
        print(f"❌ Missing libraries: {e}")
        return False
    except Exception as e:
        print(f"❌ Service account test failed: {e}")
        if "429" in str(e):
            print("💡 Still quota issue - might be project-level restriction")
            print("🔍 Check if Generative Language API is properly enabled for service accounts")
        return False

if __name__ == "__main__":
    test_service_account()