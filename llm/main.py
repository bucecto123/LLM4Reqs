from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
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

    # Fail fast if API key is not configured
    if not GROQ_API_KEY:
        logger = logging.getLogger("uvicorn.error")
        logger.error("GROQ_API_KEY is not set in the environment")
        raise HTTPException(status_code=500, detail={"error": "GROQ_API_KEY not configured on server"})

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

    # call with a timeout and log responses for debugging
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15)
    except requests.exceptions.RequestException as e:
        logging.getLogger("uvicorn.error").error(f"Error calling LLM API: {e}")
        raise HTTPException(status_code=502, detail={"error": "LLM request failed", "message": str(e)})
    # Try to parse response body as JSON
    # Log response status and a truncated body to the server log to help debugging
    logger = logging.getLogger("uvicorn.error")
    try:
        logger.info(f"LLM response status={response.status_code} body={response.text[:2000]}")
    except Exception:
        logger.info("LLM response received (could not decode body for logging)")

    try:
        data = response.json()
    except Exception:
        # non-json response
        logger.error(f"LLM returned non-JSON response (status={response.status_code})")
        raise HTTPException(status_code=502, detail={"error": "LLM returned non-JSON response", "status_code": response.status_code, "text": response.text})

    # If the LLM returned an HTTP error, bubble it up
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail={"error": "LLM API error", "status_code": response.status_code, "body": data})

    # --- Parse the model output ---
    # Guard against unexpected response shapes (avoid KeyError on 'choices')
    content = None
    # Common OpenAI/Groq style response
    try:
        choices = data.get("choices")
        if isinstance(choices, list) and len(choices) > 0:
            # support both chat-style and completion-style
            first = choices[0]
            if isinstance(first, dict):
                # chat completion with message.content
                msg = first.get("message") or first.get("delta") or {}
                content = msg.get("content") if isinstance(msg, dict) else None
                # fallback to 'text' or 'text' key in the choice
                if not content:
                    content = first.get("text") or first.get("content")
    except Exception:
        content = None

    # If there's still no content, try other top-level fields
    if not content:
        # Sometimes model output is in 'output' or 'result' or as plain text
        content = data.get("output") or data.get("result") or data.get("text")

    # If we still don't have anything, include the full response as text
    if not content:
        content = str(data)

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
