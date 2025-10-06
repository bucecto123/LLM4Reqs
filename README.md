# COS40005 - Technology - Project A
## LLM4Reqs: Requirements Context Automation
LLM4Reqs is an AI-driven system that leverages Large Language Models (LLMs) to automatically generate software requirements and contextual usage scenarios. By analyzing project inputs such as stakeholder goals, high-level specifications, and domain knowledge, the system produces structured requirements alongside realistic usage contexts.

## How to Test the API

1. Change directory to the project folder:
   ```
   cd llm
   ```
2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Start the API server:
   ```
   uvicorn main:app --reload
   ```
4. You can now test the two APIs available in `main.py`.