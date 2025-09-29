#!/usr/bin/env python3
"""Gemini CLI using OAuth authentication"""

import os
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env.local")

def authenticate_oauth():
    """Authenticate using OAuth credentials"""
    oauth_file = project_root / "oauth-credentials.json"
    token_file = project_root / "oauth-token.json"

    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow

        SCOPES = ['https://www.googleapis.com/auth/generative-language']

        creds = None

        # Check if we have saved credentials
        if token_file.exists():
            print("🔓 Loading saved OAuth token...")
            creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)

        # If there are no valid credentials, authenticate
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                print("🔄 Refreshing expired token...")
                creds.refresh(Request())
            else:
                print("🔐 Starting OAuth authentication...")
                print("💡 This will open a browser window - please complete authentication")

                if not oauth_file.exists():
                    print(f"❌ OAuth credentials file not found: {oauth_file}")
                    print("💡 Please download OAuth credentials from Google Cloud Console")
                    return None

                flow = InstalledAppFlow.from_client_secrets_file(str(oauth_file), SCOPES)
                creds = flow.run_local_server(port=0)

            # Save the credentials for next time
            with open(token_file, 'w') as token:
                token.write(creds.to_json())
            print(f"💾 Saved credentials to {token_file}")

        return creds

    except ImportError as e:
        print(f"❌ Missing OAuth libraries: {e}")
        return None
    except Exception as e:
        print(f"❌ OAuth authentication failed: {e}")
        return None

def test_gemini_oauth(query="Hello"):
    """Test Gemini API with OAuth"""

    print("🔍 Testing Gemini API with OAuth authentication...")

    # Authenticate
    creds = authenticate_oauth()
    if not creds:
        return False

    try:
        import google.generativeai as genai

        # Use OAuth credentials instead of API key
        genai.configure(credentials=creds)

        print("📝 Making API request...")
        model = genai.GenerativeModel('gemini-2.5-flash')

        response = model.generate_content(
            query,
            generation_config={
                'max_output_tokens': 100,
                'temperature': 0.1
            }
        )

        print(f"✅ SUCCESS: {response.text}")
        return True

    except Exception as e:
        print(f"❌ API request failed: {e}")
        if "429" in str(e):
            print("💡 Still quota issue - this might be a project-level restriction")
        return False

def main():
    parser = argparse.ArgumentParser(description='Gemini CLI with OAuth')
    parser.add_argument('--query', '-q', default='Hello', help='Query to send to Gemini')
    parser.add_argument('--auth-only', action='store_true', help='Only authenticate, don\'t make API call')

    args = parser.parse_args()

    if args.auth_only:
        creds = authenticate_oauth()
        if creds:
            print("✅ OAuth authentication successful")
        else:
            print("❌ OAuth authentication failed")
    else:
        test_gemini_oauth(args.query)

if __name__ == "__main__":
    main()