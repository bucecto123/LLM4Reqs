from fastapi import FastAPI
from pydantic import BaseModel
import time

app = FastAPI()

class TextInput(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "llm"}

@app.post("/extract")
def extract(input: TextInput):
    start = time.time()
    result = {
        "requirements": [
            {
                "id": 1,
                "text": "User should be able to login with email and password",
                "type": "Functional",
                "priority": "High",
                "stakeholder": "Manager",
                "category": "Authentication"
            }
        ],
        "metadata": {
            "total_count": 1,
            "processing_time": round(time.time() - start, 2)
        }
    }
    return result

def extract_requirements(text: str):
    return {
        "requirements": [
            {
                "id": 1,
                "text": "User should be able to login with email and password",
                "type": "Functional",
                "priority": "High",
                "stakeholder": "Manager",
                "category": "Authentication"
            }
        ],
        "metadata": {
            "total_count": 1,
            "processing_time": 0.5
        }
    }
