#!/usr/bin/env python3
"""
Backend Health Check Test Script
Tests the Tutorwise backend health endpoint and provides detailed diagnostics.
"""
import requests
import json
from datetime import datetime

def test_health_endpoint():
    url = "https://tutorwise-production.up.railway.app/health"
    
    print("=" * 50)
    print("TUTORWISE BACKEND HEALTH CHECK")
    print("=" * 50)
    print(f"Testing URL: {url}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("-" * 50)
    
    try:
        # Make the request with a timeout
        response = requests.get(url, timeout=10)
        
        print(f"HTTP Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print("-" * 50)
        
        # Try to parse JSON response
        try:
            data = response.json()
            print("Response Body (JSON):")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError:
            print("Response Body (Raw Text):")
            print(response.text)
        
        print("-" * 50)
        
        # Interpret the results
        if response.status_code == 200:
            print("✅ SUCCESS: Health check endpoint is accessible")
            if isinstance(data, dict):
                redis_status = data.get('redis', 'unknown')
                neo4j_status = data.get('neo4j', 'unknown')
                print(f"   Redis Status: {redis_status}")
                print(f"   Neo4j Status: {neo4j_status}")
                
                if redis_status == 'ok' and neo4j_status == 'ok':
                    print("✅ ALL SYSTEMS OPERATIONAL")
                else:
                    print("⚠️  Some services are not healthy")
        elif response.status_code == 503:
            print("⚠️  SERVICE UNAVAILABLE: Backend is running but databases are not healthy")
        else:
            print(f"❌ UNEXPECTED STATUS CODE: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: Request took longer than 10 seconds")
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Cannot reach the backend server")
        print("   - Check if Railway deployment is running")
        print("   - Verify the URL is correct")
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {e}")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
    
    print("=" * 50)

if __name__ == "__main__":
    test_health_endpoint()