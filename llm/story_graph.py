import json
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
import re

# ----------------- Pydantic Models for Validation -----------------

class PriorityParam(str, Enum):
    MUST = "must"
    SHOULD = "should"
    COULD = "could"

class StoryPriority(str, Enum):
    MVP = "mvp"
    NEXT = "next"
    LATER = "later"

class MetaInfo(BaseModel):
    title: str
    goal: str
    product: str

class Activity(BaseModel):
    id: str
    name: str
    order: int

class Task(BaseModel):
    id: str
    name: str
    order: int
    priority: PriorityParam

class UserStory(BaseModel):
    id: str
    activityId: str
    taskId: str
    text: str
    priority: StoryPriority

class UserStoryMap(BaseModel):
    meta: MetaInfo
    activities: List[Activity]
    tasks: List[Task]
    userStories: List[UserStory]

# ----------------- Prompt Templates -----------------

STORY_MAP_PROMPT_TEMPLATE = """
Generate a User Story Map strictly conforming to the JSON schema below.

Rules:
1. Output JSON only.
2. All required fields must be present.
3. No additional keys.
4. No natural language outside JSON.
5. Ordering matters (order fields must be sequential).

Interpretation rules:
- Activities = horizontal backbone (left -> right).
- Tasks = vertical priority (top -> bottom).
- User stories must belong to exactly one activity and one task.
- MVP stories must appear in top-priority tasks.

Product context:
{product_description}

Function definition (Strict Schema):
{json_schema}
"""

# ----------------- Logic -----------------

def get_schema_json():
    """Returns the JSON schema of the UserStoryMap model."""
    return json.dumps(UserStoryMap.model_json_schema(), indent=2)

def generate_mermaid_chart(story_map: UserStoryMap) -> str:
    """
    Converts a UserStoryMap object into a Mermaid flowchart string.
    Visualizes Activities -> Tasks -> Stories.
    """
    lines = ["graph TD"]
    
    # 1. Add Title
    safe_title = re.sub(r'[^a-zA-Z0-9 ]', '', story_map.meta.title)
    lines.append(f"    Title[\"{story_map.meta.title}\"]")
    lines.append("    style Title fill:#f9f,stroke:#333,stroke-width:2px")
    
    # Sort activities by order
    sorted_activities = sorted(story_map.activities, key=lambda x: x.order)
    
    # Add Activities as a subgraph or top level nodes
    # Linking Title to first activity
    if sorted_activities:
        lines.append(f"    Title --> {sorted_activities[0].id}")

    # Process activities
    for i, activity in enumerate(sorted_activities):
        # Activity Node
        lines.append(f"    {activity.id}[\"Activity: {activity.name}\"]")
        lines.append(f"    style {activity.id} fill:#bbf,stroke:#333,stroke-width:2px")
        
        # Link to next activity (Backbone)
        if i < len(sorted_activities) - 1:
            lines.append(f"    {activity.id} --> {sorted_activities[i+1].id}")

        # Find tasks for this activity? 
        # The schema doesn't explicitly link Task -> Activity in the Task object, 
        # but the UserStory links to both. 
        # However, standard Story Maps usually have Tasks under Activities.
        # Wait, the Schema provided by the user:
        # "tasks": [{"id", "name", "order", "priority"}] 
        # "userStories": [{"activityId", "taskId", ...}]
        # It seems Tasks are independent of Activities in the definition, but Stories link them.
        # Usually, a Task lives under an Activity.
        # But if the schema doesn't link Task -> Activity, we might have to infer it from Stories.
        # Or maybe Tasks are "steps" that apply to the whole product? 
        # Let's check "Interpretation rules": "Activities = horizontal backbone", "Tasks = vertical priority".
        # This implies a matrix. 
        
        # Let's try to infer Task -> Activity relationship via Stories.
        # A Task is usually a breakdown of an Activity. 
        # If a Task has stories with Activity X, we put that Task under Activity X.
        
        # Get all stories for this activity
        stories_for_activity = [s for s in story_map.userStories if s.activityId == activity.id]
        
        # Find unique tasks associated with these stories
        task_ids = set(s.taskId for s in stories_for_activity)
        
        # Find the actual task objects
        associated_tasks = [t for t in story_map.tasks if t.id in task_ids]
        associated_tasks.sort(key=lambda x: x.order)
        
        for task in associated_tasks:
            # Connect Activity -> Task
            lines.append(f"    {activity.id} --> {task.id}")
            lines.append(f"    {task.id}[\"Task: {task.name}\"]")
            # Style task based on priority
            stroke = "#f00" if task.priority == PriorityParam.MUST else "#ff0" if task.priority == PriorityParam.SHOULD else "#0f0"
            lines.append(f"    style {task.id} stroke:{stroke},stroke-width:2px")

            # Add Stories for this Task AND Activity
            task_stories = [s for s in stories_for_activity if s.taskId == task.id]
            # Sort by priority?
            
            last_node = task.id
            for story in task_stories:
                story_node_id = f"{story.id}"
                priority_icon = "MVP" if story.priority == StoryPriority.MVP else ""
                lines.append(f"    {last_node} --> {story_node_id}")
                lines.append(f"    {story_node_id}(\"{priority_icon} {story.text}\")")
                last_node = story_node_id

    return "\n".join(lines)
