# main.py - FastAPI Entry Point with Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from groq import Groq
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI(
    title="AI Requirements Generation Service",
    description="LLM-powered requirement extraction and generation using Groq",
    version="1.0.0"
)

# CORS configuration for Laravel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001", "http://localhost:3000"],  # Laravel & React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    # Visible runtime warning to help developers during local development
    print("WARNING: GROQ_API_KEY is not set. Groq calls will fail until you set this in your .env file.")

groq_client = Groq(api_key=GROQ_API_KEY)
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")

# Free Groq models:
# - mixtral-8x7b-32768 (Best for complex tasks, 32k context)
# - llama-3.1-8b-instant (Fastest, good for simple tasks)
# - llama-3.1-70b-versatile (Most powerful, slower)
# - gemma2-9b-it (Good balance)

# ==================== REQUEST/RESPONSE MODELS ====================

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    # Avoid mutable default; normalize to an empty list in the endpoint
    conversation_history: Optional[List[ChatMessage]] = None
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    model: str

class ExtractionRequest(BaseModel):
    text: str
    document_type: Optional[str] = "meeting_notes"

class Requirement(BaseModel):
    requirement_text: str
    requirement_type: str  # functional, non-functional, constraint, assumption
    priority: str  # high, medium, low
    confidence_score: float

class ExtractionResponse(BaseModel):
    requirements: List[Requirement]
    total_extracted: int
    tokens_used: int

class PersonaGenerationRequest(BaseModel):
    requirement_text: str
    persona_name: str  # Developer, Business Analyst, Manager
    persona_prompt: str

class PersonaGenerationResponse(BaseModel):
    persona_view: str
    tokens_used: int

class ConflictDetectionRequest(BaseModel):
    requirements: List[Dict[str, Any]]

class Conflict(BaseModel):
    requirement_id_1: int
    requirement_id_2: int
    conflict_description: str
    severity: str

class ConflictDetectionResponse(BaseModel):
    conflicts: List[Conflict]
    total_conflicts: int

# ==================== PROMPT TEMPLATES ====================

EXTRACTION_PROMPT = """You are an expert business analyst. Extract software requirements from the following text.

Text:
{text}

Instructions:
1. Extract clear, specific requirements
2. Classify each as: functional, non-functional, constraint, or assumption
3. Assign priority: high, medium, or low
4. Provide a confidence score (0.0 to 1.0)
5. Return ONLY valid JSON, no markdown formatting, no explanations

Return format (MUST be valid JSON):
{{
  "requirements": [
    {{
      "requirement_text": "The system must...",
      "requirement_type": "functional",
      "priority": "high",
      "confidence_score": 0.95
    }}
  ]
}}"""

CHAT_SYSTEM_PROMPT = """You are an AI assistant specialized in software requirements engineering. 
You help users understand, refine, and document software requirements.
Be clear, concise, and technical when needed. Always provide actionable advice."""

PERSONA_PROMPT_TEMPLATE = """Rewrite the following requirement from the perspective of a {persona_name}.

Original Requirement:
{requirement_text}

Instructions:
- Focus on what matters most to this persona
- Be specific and detailed
- Use appropriate technical language for this persona
- Highlight key concerns and considerations

Provide the rewritten requirement:"""

CONFLICT_DETECTION_PROMPT = """Analyze the following requirements and identify any conflicts or contradictions.

Requirements:
{requirements_text}

Instructions:
1. Look for direct contradictions
2. Identify incompatible features
3. Find conflicting priorities or constraints
4. Return ONLY valid JSON, no markdown, no explanations

Return format (MUST be valid JSON):
{{
  "conflicts": [
    {{
      "requirement_id_1": 1,
      "requirement_id_2": 3,
      "conflict_description": "Requirement 1 requires real-time sync while Requirement 3 specifies batch processing",
      "severity": "high"
    }}
  ]
}}

If no conflicts found, return: {{"conflicts": []}}"""

# ==================== HELPER FUNCTIONS ====================

def call_groq_chat(messages: List[Dict], max_tokens: int = 1000, temperature: float = 0.7) -> tuple:
    """Call Groq API and return response + token usage"""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model=DEFAULT_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        content = chat_completion.choices[0].message.content
        tokens_used = chat_completion.usage.total_tokens
        
        return content, tokens_used
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

def parse_json_response(content: str) -> Dict:
    """Parse JSON from LLM response, handling markdown code blocks"""
    # Remove markdown code blocks if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    
    content = content.strip()
    
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        # Try to find JSON in the response
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end > start:
            try:
                return json.loads(content[start:end])
            except:
                pass
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to parse LLM response as JSON. Response: {content[:200]}"
        )

# ==================== API ENDPOINTS ====================

@app.get("/")
def read_root():
    return {
        "service": "AI Requirements Generation Service (Groq)",
        "status": "running",
        "version": "1.0.0",
        "model": DEFAULT_MODEL
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "model": DEFAULT_MODEL
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for conversational AI
    
    Usage:
    POST /api/chat
    {
        "message": "Explain functional requirements",
        "conversation_history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! How can I help?"}
        ],
        "context": "Optional context about the project"
    }
    """
    try:
        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
        
        # Add context if provided
        if request.context:
            messages.append({
                "role": "system",
                "content": f"Project Context: {request.context}"
            })
        
        # Normalize conversation history (avoid None) and limit to last 10 messages to save tokens
        history = request.conversation_history or []
        for msg in history[-10:]:
            # Accept either ChatMessage Pydantic models or plain dicts
            if isinstance(msg, dict):
                role = msg.get("role")
                content = msg.get("content")
            else:
                role = getattr(msg, "role", None)
                content = getattr(msg, "content", None)

            if role and content:
                messages.append({"role": role, "content": content})
        
        # Add current message
        messages.append({"role": "user", "content": request.message})
        
        # Call Groq
        response_text, tokens_used = call_groq_chat(messages, max_tokens=2000, temperature=0.7)
        
        return ChatResponse(
            response=response_text,
            tokens_used=tokens_used,
            model=DEFAULT_MODEL
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/extract", response_model=ExtractionResponse)
async def extract_requirements(request: ExtractionRequest):
    """
    Extract requirements from text
    
    Usage:
    POST /api/extract
    {
        "text": "The app should allow users to login. It must be fast and secure.",
        "document_type": "meeting_notes"
    }
    """
    try:
        prompt = EXTRACTION_PROMPT.format(text=request.text)
        
        messages = [
            {"role": "system", "content": "You are a requirements extraction expert. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        # Use lower temperature for more consistent JSON output
        response_text, tokens_used = call_groq_chat(messages, max_tokens=3000, temperature=0.3)
        parsed_data = parse_json_response(response_text)
        
        requirements = [
            Requirement(**req) for req in parsed_data.get("requirements", [])
        ]
        
        return ExtractionResponse(
            requirements=requirements,
            total_extracted=len(requirements),
            tokens_used=tokens_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/persona/generate", response_model=PersonaGenerationResponse)
async def generate_persona_view(request: PersonaGenerationRequest):
    """
    Generate persona-specific view of a requirement
    
    Usage:
    POST /api/persona/generate
    {
        "requirement_text": "The system must process 1000 transactions per second",
        "persona_name": "Developer",
        "persona_prompt": "Focus on technical implementation, architecture, and scalability"
    }
    """
    try:
        prompt = PERSONA_PROMPT_TEMPLATE.format(
            persona_name=request.persona_name,
            requirement_text=request.requirement_text
        )
        
        # Add persona-specific guidance
        system_prompt = f"You are a {request.persona_name} analyzing requirements. {request.persona_prompt}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response_text, tokens_used = call_groq_chat(messages, max_tokens=2000, temperature=0.7)
        
        return PersonaGenerationResponse(
            persona_view=response_text,
            tokens_used=tokens_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conflicts/detect", response_model=ConflictDetectionResponse)
async def detect_conflicts(request: ConflictDetectionRequest):
    """
    Detect conflicts between requirements
    
    Usage:
    POST /api/conflicts/detect
    {
        "requirements": [
            {"id": 1, "text": "Must work offline"},
            {"id": 2, "text": "Requires real-time cloud sync"}
        ]
    }
    """
    try:
        # Format requirements for prompt (use .get to be resilient to missing keys)
        requirements_text = "\n".join([
            f"ID {req.get('id')}: {req.get('text')}"
            for req in request.requirements
        ])
        
        prompt = CONFLICT_DETECTION_PROMPT.format(requirements_text=requirements_text)
        
        messages = [
            {"role": "system", "content": "You are an expert at detecting requirement conflicts. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        response_text, tokens_used = call_groq_chat(messages, max_tokens=2000, temperature=0.3)
        parsed_data = parse_json_response(response_text)
        
        conflicts = [
            Conflict(**conflict) for conflict in parsed_data.get("conflicts", [])
        ]
        
        return ConflictDetectionResponse(
            conflicts=conflicts,
            total_conflicts=len(conflicts)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== TESTING ENDPOINT ====================

@app.post("/api/test")
async def test_groq():
    """Simple test endpoint to verify Groq connection"""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": "Say 'Hello, FastAPI with Groq!'"}],
            model=DEFAULT_MODEL,
            max_tokens=50
        )
        return {
            "success": True,
            "response": chat_completion.choices[0].message.content,
            "model": DEFAULT_MODEL,
            "tokens_used": chat_completion.usage.total_tokens
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# ==================== .env.example ====================
"""
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=mixtral-8x7b-32768

# Available FREE Groq models:
# mixtral-8x7b-32768          - Best for complex tasks, 32k context (RECOMMENDED)
# llama-3.1-8b-instant        - Fastest, good for simple tasks
# llama-3.1-70b-versatile     - Most powerful, slower
# llama3-70b-8192             - Good balance
# llama3-8b-8192              - Fast and efficient
# gemma2-9b-it                - Google's model, good for instructions
"""