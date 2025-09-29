#!/usr/bin/env python3
"""Test OAuth approach for Gemini API"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

print("🔍 Testing OAuth approach for Gemini API...")

def test_oauth_setup():
    """Check if we can set up OAuth for Google Cloud"""

    # First, let's see what we have
    oauth_file = project_root / "oauth-credentials.json"

    if oauth_file.exists():
        print(f"✅ Found OAuth credentials file: {oauth_file}")
        try:
            with open(oauth_file) as f:
                creds = json.load(f)
                print(f"📝 Client ID: {creds.get('installed', {}).get('client_id', 'Not found')[:20]}...")
        except Exception as e:
            print(f"❌ Error reading OAuth file: {e}")
    else:
        print(f"❌ No OAuth credentials found at: {oauth_file}")
        print("💡 After creating OAuth credentials in Google Cloud Console:")
        print(f"   1. Download the JSON file")
        print(f"   2. Save it as: {oauth_file}")
        print(f"   3. Run this script again")
        return False

    # Try to use OAuth with google-auth
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow

        print("✅ Google auth libraries available")

        # Set up OAuth flow
        SCOPES = ['https://www.googleapis.com/auth/generative-language']

        flow = InstalledAppFlow.from_client_secrets_file(
            oauth_file, SCOPES)

        print("🔓 Starting OAuth flow...")
        print("💡 This will open a browser window for authentication")

        # This will open browser for auth
        creds = flow.run_local_server(port=0)

        print("✅ OAuth authentication successful!")

        # Save credentials for future use
        token_file = project_root / "oauth-token.json"
        with open(token_file, 'w') as token:
            token.write(creds.to_json())

        print(f"💾 Saved token to: {token_file}")

        return True

    except ImportError as e:
        print(f"❌ Missing OAuth libraries: {e}")
        print("💡 Install with: pip install google-auth google-auth-oauthlib")
        return False
    except Exception as e:
        print(f"❌ OAuth setup failed: {e}")
        return False

if __name__ == "__main__":
    test_oauth_setup()