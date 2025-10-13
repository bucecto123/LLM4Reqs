import requests
import json

# Base URL for the LLM API
BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    print("🔍 Testing Health Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_root():
    """Test the root endpoint"""
    print("\n🔍 Testing Root Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_groq_connection():
    """Test Groq connection"""
    print("\n🔍 Testing Groq Connection...")
    try:
        response = requests.post(f"{BASE_URL}/api/test")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_chat():
    """Test chat endpoint"""
    print("\n🔍 Testing Chat Endpoint...")
    try:
        data = {
            "message": "What are functional requirements?",
            "conversation_history": [],
            "context": "Software development project"
        }
        response = requests.post(f"{BASE_URL}/api/chat", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_extract():
    """Test requirement extraction endpoint"""
    print("\n🔍 Testing Requirement Extraction...")
    try:
        data = {
            "text": "The system must allow users to login with their email and password. The login process should be completed within 2 seconds. Users should be able to reset their password if forgotten.",
            "document_type": "meeting_notes"
        }
        response = requests.post(f"{BASE_URL}/api/extract", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_persona():
    """Test persona generation endpoint"""
    print("\n🔍 Testing Persona Generation...")
    try:
        data = {
            "requirement_text": "The system must process 1000 transactions per second",
            "persona_name": "Developer",
            "persona_prompt": "Focus on technical implementation, architecture, and scalability"
        }
        response = requests.post(f"{BASE_URL}/api/persona/generate", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_conflicts():
    """Test conflict detection endpoint"""
    print("\n🔍 Testing Conflict Detection...")
    try:
        data = {
            "requirements": [
                {"id": 1, "text": "The application must work offline"},
                {"id": 2, "text": "The application requires real-time cloud synchronization"},
                {"id": 3, "text": "Data must be stored locally for performance"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/conflicts/detect", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting LLM API Tests...\n")
    
    tests = [
        ("Health Check", test_health),
        ("Root Endpoint", test_root),
        ("Groq Connection", test_groq_connection),
        ("Chat API", test_chat),
        ("Requirement Extraction", test_extract),
        ("Persona Generation", test_persona),
        ("Conflict Detection", test_conflicts)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results[test_name] = "✅ PASSED" if success else "❌ FAILED"
        except Exception as e:
            results[test_name] = f"❌ FAILED: {e}"
        
        print("-" * 50)
    
    print("\n📊 Test Results Summary:")
    print("=" * 50)
    for test_name, result in results.items():
        print(f"{test_name}: {result}")
    
    passed = sum(1 for result in results.values() if "✅" in result)
    total = len(results)
    print(f"\n📈 Overall: {passed}/{total} tests passed")

if __name__ == "__main__":
    main()