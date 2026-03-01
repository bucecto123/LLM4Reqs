
import os
try:
    import google.generativeai as genai
    from langchain_google_genai import ChatGoogleGenerativeAI
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None
    ChatGoogleGenerativeAI = None

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from typing import List, Dict, Any, Optional
import requests
import json

class ModelManager:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        if self.gemini_api_key and GEMINI_AVAILABLE:
            genai.configure(api_key=self.gemini_api_key)

    def get_available_models(self) -> List[Dict[str, Any]]:
        models = []
        
        # 1. Fetch Groq Models
        if self.groq_api_key:
            try:
                url = "https://api.groq.com/openai/v1/models"
                headers = {
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json"
                }
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    for m in data.get('data', []):
                        # Filter for likely chat models if needed, or take all
                        model_id = m['id']
                        models.append({
                            'provider': 'groq',
                            'model_id': model_id,
                            'name': model_id, # Groq doesn't provide nice names in API usually
                            'context_window': m.get('context_window', 8192), # Placeholder fallback
                            'supports_tools': None # We will check this later
                        })
            except Exception as e:
                print(f"Error fetching Groq models: {e}")

        # 2. Fetch Gemini Models
        if self.gemini_api_key and GEMINI_AVAILABLE:
            try:
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        # Extract clean name, e.g. models/gemini-1.5-pro -> gemini-1.5-pro
                        model_id = m.name.replace('models/', '')
                        models.append({
                            'provider': 'gemini',
                            'model_id': model_id,
                            'name': m.display_name or model_id,
                            'context_window': m.input_token_limit,
                            'supports_tools': None
                        })
            except Exception as e:
                print(f"Error fetching Gemini models: {e}")
                
        return models

    def get_chat_model(self, provider: str, model_id: str, temperature: float = 0.7):
        if provider == 'groq':
            if not self.groq_api_key:
                raise ValueError("GROQ_API_KEY not set")
            return ChatGroq(
                groq_api_key=self.groq_api_key,
                model_name=model_id,
                temperature=temperature
            )
        elif provider == 'gemini':
            if not GEMINI_AVAILABLE:
                raise ValueError("Gemini dependencies not installed. Please install google-generativeai and langchain-google-genai")
            if not self.gemini_api_key:
                raise ValueError("GEMINI_API_KEY not set")
            # Google models require 'models/' prefix usually, but langchain might handle it. 
            # Let's ensure it's correct. genai.list_models returns 'models/...'
            # API usually accepts 'gemini-pro'.
            # Langchain Google GenAI expects 'model="gemini-pro"'
            
            # If model_id already has 'models/' prefix, keep it? 
            # Actually ChatGoogleGenerativeAI documentation usually shows 'gemini-pro'.
            # Let's strip 'models/' if present.
            clean_model = model_id.replace('models/', '')
            
            return ChatGoogleGenerativeAI(
                google_api_key=self.gemini_api_key,
                model=clean_model,
                temperature=temperature,
                convert_system_message_to_human=True # sometimes needed for older gemini
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def check_tool_capability(self, provider: str, model_id: str) -> bool:
        """
        Verifies if a model supports tool calling by attempting a simple tool call.
        """
        print(f"Checking tool capability for {provider}/{model_id}...")
        try:
            # Define a simple calculator tool
            tool_schema = {
                "type": "function",
                "function": {
                    "name": "add_numbers",
                    "description": "Add two numbers",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "a": {"type": "integer"},
                            "b": {"type": "integer"}
                        },
                        "required": ["a", "b"]
                    }
                }
            }

            model = self.get_chat_model(provider, model_id, temperature=0.0)
            
            # Bind tools
            if provider == 'groq':
                model_with_tools = model.bind_tools([tool_schema])
            elif provider == 'gemini':
                # Gemini tool binding in langchain
                # ChatGoogleGenerativeAI supports bind_tools
                # Note: Gemini might strictly require Pydantic or specific format
                # But let's try standard dict first as it's often supported
                # If not, we might need a dummy tool function
                model_with_tools = model.bind_tools([tool_schema])
            else:
                return False

            messages = [HumanMessage(content="What is 5 plus 3? Please use the add_numbers tool.")]
            
            response = model_with_tools.invoke(messages)
            
            # Check if tool_calls is present and populated
            if hasattr(response, 'tool_calls') and response.tool_calls:
                print(f"Model {model_id} supports tools! Calls: {response.tool_calls}")
                return True
            
            print(f"Model {model_id} did NOT call tools. Response: {response.content}")
            return False

        except Exception as e:
            print(f"Tool check failed for {model_id}: {e}")
            return False

_manager_instance = None

def get_model_manager():
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = ModelManager()
    return _manager_instance
