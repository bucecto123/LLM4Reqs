"""
Persona Manager for LLM Service
Generates dynamic system prompts based on persona profiles.
"""

from typing import Dict, Optional, List
from dataclasses import dataclass
from enum import Enum


class PersonaType(str, Enum):
    """Persona types."""
    END_USER = "end_user"
    BUSINESS_ANALYST = "business_analyst"
    PRODUCT_OWNER = "product_owner"
    DEVELOPER = "developer"
    QA_TESTER = "qa_tester"
    SECURITY_EXPERT = "security_expert"
    UX_DESIGNER = "ux_designer"
    SYSTEM_ADMIN = "system_admin"
    CUSTOM = "custom"


@dataclass
class PersonaProfile:
    """Represents a persona profile for prompt generation."""
    id: int
    name: str
    type: str
    role: str
    description: str
    priorities: List[str]
    concerns: List[str]
    typical_requirements: List[str]
    communication_style: str
    technical_level: str  # low, medium, high
    focus_areas: List[str]
    example_questions: List[str] = None
    custom_attributes: Dict = None
    
    def __post_init__(self):
        if self.example_questions is None:
            self.example_questions = []
        if self.custom_attributes is None:
            self.custom_attributes = {}


class PersonaManager:
    """
    Manages persona profiles and generates persona-specific prompts for LLM.
    """
    
    def __init__(self):
        """Initialize persona manager."""
        self.personas: Dict[int, PersonaProfile] = {}
    
    def load_persona(self, persona_data: Dict) -> PersonaProfile:
        """
        Load a persona from database data.
        
        Args:
            persona_data: Dictionary containing persona fields from database
            
        Returns:
            PersonaProfile object
        """
        persona = PersonaProfile(
            id=persona_data.get('id'),
            name=persona_data.get('name'),
            type=persona_data.get('type', 'custom'),
            role=persona_data.get('role'),
            description=persona_data.get('description', ''),
            priorities=persona_data.get('priorities', []),
            concerns=persona_data.get('concerns', []),
            typical_requirements=persona_data.get('typical_requirements', []),
            communication_style=persona_data.get('communication_style', 'Professional'),
            technical_level=persona_data.get('technical_level', 'medium'),
            focus_areas=persona_data.get('focus_areas', []),
            example_questions=persona_data.get('example_questions', []),
            custom_attributes=persona_data.get('custom_attributes', {})
        )
        
        # Cache the persona
        self.personas[persona.id] = persona
        return persona
    
    def get_persona(self, persona_id: int) -> Optional[PersonaProfile]:
        """Get a cached persona by ID."""
        return self.personas.get(persona_id)
    
    def generate_system_prompt(
        self, 
        persona: PersonaProfile, 
        task_type: str = 'generate',
        context: str = None
    ) -> str:
        """
        Generate a system prompt for the LLM based on persona profile.
        
        Args:
            persona: PersonaProfile object
            task_type: Type of task (generate, analyze, review, refine)
            context: Optional context to include in prompt
            
        Returns:
            Complete system prompt string
        """
        # Build priorities list
        priorities_text = ""
        if persona.priorities:
            priorities_text = "**Your Priorities (in order):**\n"
            for i, priority in enumerate(persona.priorities, 1):
                priorities_text += f"{i}. {priority}\n"
        
        # Build concerns list
        concerns_text = ""
        if persona.concerns:
            concerns_text = "**Your Main Concerns:**\n"
            for concern in persona.concerns:
                concerns_text += f"- {concern}\n"
        
        # Build focus areas
        focus_text = ""
        if persona.focus_areas:
            focus_text = "**Your Focus Areas:**\n"
            for area in persona.focus_areas:
                focus_text += f"- {area}\n"
        
        # Build system prompt
        prompt = f"""You are a {persona.role} with the following characteristics:

**Role & Background:**
{persona.description}

{priorities_text}
{concerns_text}
{focus_text}
**Communication Style:**
{persona.communication_style}

**Technical Level:** {persona.technical_level.upper()}
"""
        
        # Add task-specific instructions
        task_instructions = self._get_task_instructions(task_type, persona)
        prompt += f"\n{task_instructions}"
        
        # Add context if provided
        if context:
            prompt += f"\n\n**Additional Context:**\n{context}"
        
        return prompt
    
    def _get_task_instructions(self, task_type: str, persona: PersonaProfile) -> str:
        """
        Get task-specific instructions for the persona.
        
        Args:
            task_type: generate, analyze, review, refine
            persona: PersonaProfile object
            
        Returns:
            Task-specific instructions
        """
        task_templates = {
            'generate': f"""
**Your Task: Generate Requirements**

When generating requirements from your {persona.role} perspective:
1. Focus on your priorities and concerns listed above
2. Use language appropriate to your {persona.technical_level} technical level
3. Address your specific focus areas
4. Think from your role's perspective - what matters to YOU in this position
5. Each requirement should be clear, testable, and relevant to your concerns

Generate 5-10 requirements that reflect your unique perspective. For each requirement:
- State it clearly and concisely
- Explain why it matters to you in your role
- Include acceptance criteria when appropriate
- Highlight any risks or concerns from your perspective
""",
            'analyze': f"""
**Your Task: Analyze Requirements**

Analyze the provided requirements from your {persona.role} perspective:
1. Identify issues that concern someone in your position
2. Check if requirements address your priorities
3. Look for missing considerations from your focus areas
4. Assess clarity and testability from your technical level
5. Highlight risks specific to your concerns

Provide:
- Overall assessment of the requirements
- Specific issues you've identified
- Missing elements from your perspective
- Suggestions for improvement
""",
            'review': f"""
**Your Task: Review Requirements**

Review the requirements as a {persona.role} would:
1. Evaluate against your priorities
2. Check for concerns you would have
3. Assess completeness from your perspective
4. Consider technical level appropriateness

Provide:
- Approval status (Approved / Needs Revision / Rejected)
- Key concerns from your perspective
- Must-have changes
- Nice-to-have improvements
""",
            'refine': f"""
**Your Task: Refine Requirements**

Refine the requirements to better align with your {persona.role} perspective:
1. Improve clarity using your communication style
2. Add missing elements from your focus areas
3. Strengthen testability and acceptance criteria
4. Address your specific concerns
5. Ensure technical level is appropriate

Provide improved versions of the requirements with explanations of changes.
"""
        }
        
        return task_templates.get(task_type, task_templates['generate'])
    
    def generate_multi_persona_prompt(
        self, 
        personas: List[PersonaProfile], 
        task_type: str = 'analyze'
    ) -> str:
        """
        Generate a prompt that considers multiple personas simultaneously.
        
        Args:
            personas: List of PersonaProfile objects
            task_type: Type of task
            
        Returns:
            Multi-perspective system prompt
        """
        prompt = "You are analyzing requirements from multiple stakeholder perspectives:\n\n"
        
        for i, persona in enumerate(personas, 1):
            prompt += f"**Perspective {i}: {persona.role}**\n"
            prompt += f"- Priorities: {', '.join(persona.priorities[:3])}\n"
            prompt += f"- Concerns: {', '.join(persona.concerns[:3])}\n"
            prompt += f"- Technical Level: {persona.technical_level}\n\n"
        
        prompt += """
**Your Task:**
Analyze the requirements from EACH perspective listed above. For each persona:
1. Identify their specific concerns with the requirements
2. Suggest improvements from their viewpoint
3. Highlight conflicts between different perspectives

Provide a comprehensive multi-stakeholder analysis.
"""
        
        return prompt
    
    def format_persona_context_for_chat(
        self, 
        persona: PersonaProfile,
        user_message: str
    ) -> Dict[str, str]:
        """
        Format persona context for chat API call.
        
        Args:
            persona: PersonaProfile object
            user_message: User's message
            
        Returns:
            Dictionary with system and user messages
        """
        # Determine task type from user message
        task_type = self._infer_task_type(user_message)
        
        # Generate system prompt
        system_prompt = self.generate_system_prompt(persona, task_type)
        
        return {
            'system_prompt': system_prompt,
            'user_message': user_message,
            'task_type': task_type,
            'persona_name': persona.name,
            'persona_role': persona.role
        }
    
    def _infer_task_type(self, message: str) -> str:
        """
        Infer task type from user message.
        
        Args:
            message: User's message text
            
        Returns:
            Inferred task type
        """
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['generate', 'create', 'write', 'list']):
            return 'generate'
        elif any(word in message_lower for word in ['analyze', 'check', 'examine', 'evaluate']):
            return 'analyze'
        elif any(word in message_lower for word in ['review', 'approve', 'assess']):
            return 'review'
        elif any(word in message_lower for word in ['refine', 'improve', 'enhance', 'update']):
            return 'refine'
        else:
            return 'generate'  # Default


# Global instance
persona_manager = PersonaManager()


def get_persona_prompt(persona_data: Dict, user_message: str, task_type: str = None) -> Dict[str, str]:
    """
    Convenience function to get persona-enhanced prompt.
    
    Args:
        persona_data: Dictionary with persona data from database
        user_message: User's message
        task_type: Optional explicit task type
        
    Returns:
        Dictionary with formatted prompts
    """
    persona = persona_manager.load_persona(persona_data)
    
    if task_type is None:
        task_type = persona_manager._infer_task_type(user_message)
    
    system_prompt = persona_manager.generate_system_prompt(persona, task_type)
    
    return {
        'system_prompt': system_prompt,
        'user_message': user_message,
        'task_type': task_type,
        'persona_id': persona.id,
        'persona_name': persona.name,
        'persona_role': persona.role
    }
