from fastapi import FastAPI
from pydantic import BaseModel
import os
import time
import requests
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()  # reads .env file

app = FastAPI()

# --- Load API Key ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # set this in the environment
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"  # free, fast, and supports reasoning


class TextInput(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "llm"}


@app.post("/extract")
def extract(input: TextInput):
    start = time.time()

    # --- Construct the prompt ---
    prompt = f"""
    You are a requirements extraction assistant.
    Extract software requirements from the following text, and return them in JSON format
    with fields: id, text, type (Functional/Non-Functional), priority (High/Medium/Low),
    stakeholder, and category.

    Text:
    {input.text}
    """

    # --- Call Groq API ---
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that extracts structured software requirements."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }

    response = requests.post(GROQ_API_URL, headers=headers, json=payload)
    data = response.json()

    # --- Parse the model output ---
    content = data["choices"][0]["message"]["content"]

    # If model output is JSON, try parsing
    import json
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {"raw_output": content}

    # Add metadata
    result["metadata"] = {
        "processing_time": round(time.time() - start, 2)
    }

    return result


def extract_requirements(text: str):
    """Helper for local testing."""
    input_data = TextInput(text=text)
    return extract(input_data)
