# Chat Workflows Implementation

## Overview

This document describes the implementation of two distinct chat workflows in the LLM4Reqs application:

1. **Normal Chat Workflow** - For general conversations without project context
2. **Project Chat Workflow** - For project-specific conversations with knowledge base integration

## Architecture Changes

### Backend Changes

#### 1. API Routes (`backend/routes/api.php`)

Added new routes to support both workflows:

```php
// Get all user conversations (normal chat workflow - null project_id)
Route::get('/conversations', [ConversationController::class, 'getUserConversations']);

// Get conversations for a specific project (project chat workflow)
Route::get('/projects/{project}/conversations', [ConversationController::class, 'getProjectConversations']);
```

#### 2. Conversation Controller (`backend/app/Http/Controllers/Api/ConversationController.php`)

Added two new methods:

- **`getUserConversations()`**: Fetches conversations where `project_id` is `null` (normal chat)
- **`getProjectConversations($projectId)`**: Fetches conversations for a specific project

Updated authorization logic in `update()` and `destroy()` methods to handle both:

- Project-based conversations: Check project ownership
- Normal conversations: Check direct user ownership

#### 3. Conversation Service (`backend/app/Services/ConversationService.php`)

Modified `createConversation()` to allow `null` values for `project_id`:

```php
'project_id' => $data['project_id'] ?? null, // Allow null for normal chat workflow
```

#### 4. Request Validation (`backend/app/Http/Requests/ConversationRequest.php`)

Changed `project_id` validation from `required` to `nullable`:

```php
'project_id' => 'nullable|integer|exists:projects,id',
```

### Frontend Changes

#### 1. State Management (`frontend/src/pages/DashBoard.jsx`)

Added new state variable to track chat mode:

```javascript
const [chatMode, setChatMode] = useState("normal"); // 'normal' or 'project'
```

#### 2. Load Projects Function

Simplified initialization - no longer auto-creates default project:

- Projects are only loaded if needed (for project mode)
- Normal chat mode works without any project

#### 3. Load Conversations Function

Now handles both workflows based on `chatMode`:

```javascript
const loadConversations = async () => {
  if (chatMode === "normal") {
    // Fetch user's conversations (null project_id)
    data = await apiFetch("/api/conversations");
  } else if (chatMode === "project") {
    // Fetch conversations for current project
    data = await apiFetch(`/api/projects/${currentProjectId}/conversations`);
  }
};
```

#### 4. Create New Conversation

Updated to conditionally include `project_id`:

```javascript
const requestBody = {
  title: conversationTitle,
  context: null,
  status: "active",
};

// Only include project_id if in project mode
if (chatMode === "project") {
  requestBody.project_id = currentProjectId;
}
```

#### 5. UI Updates

- "New Chat" button: Only disabled in project mode when no project is available
- Send message buttons: Same conditional logic
- Document loading: Only attempted in project mode

#### 6. useEffect Hooks

Updated to reload conversations when chat mode changes:

```javascript
useEffect(() => {
  if (chatMode === "normal") {
    loadConversations();
  } else if (chatMode === "project" && currentProjectId) {
    loadConversations();
  }
}, [chatMode, currentProjectId]);
```

## Workflows

### Normal Chat Workflow

1. User opens dashboard (default mode: `normal`)
2. System loads user's conversations where `project_id IS NULL`
3. User can immediately create new conversations
4. Conversations are saved with `project_id = null`
5. Documents are not available in normal chat mode
6. Messages are processed normally without project-specific knowledge base

### Project Chat Workflow

1. User switches to project mode (to be implemented in UI)
2. System loads available projects
3. User selects a project
4. System loads conversations for selected project
5. User can create conversations linked to the project
6. Conversations are saved with the selected `project_id`
7. Documents can be uploaded and linked to conversations
8. Messages can leverage project knowledge base (RAG)

## Database Schema

### Conversations Table

- `id`: Primary key
- `user_id`: Owner of the conversation (required)
- `project_id`: Associated project (nullable)
  - `NULL` for normal chat workflow
  - Valid project ID for project chat workflow
- `title`: Conversation title
- `context`: Additional context
- `status`: Conversation status

## Future Enhancements

### UI for Mode Switching

Add a UI toggle to switch between modes:

- Tab/button to switch between "Normal Chat" and "Project Chat"
- Dropdown to select project when in project mode
- Visual indicator of current mode

### Knowledge Base Features (Project Mode)

- Enhanced document upload limits
- RAG database integration for project documents
- Document summarization across all project files
- Project-specific context in AI responses

### Document Support (Normal Mode)

- Limited document upload for normal conversations
- No cross-conversation knowledge base
- Simple document attachment without RAG

## Testing

To test the implementation:

1. **Normal Chat Mode** (Current Default):

   ```bash
   # Start the application
   # Open dashboard - should work without projects
   # Create a new conversation
   # Send messages
   # Verify conversations are saved with project_id = null
   ```

2. **Project Chat Mode** (Will need UI update):
   ```bash
   # Switch to project mode (when UI is implemented)
   # Select a project
   # Create conversations
   # Upload documents
   # Verify conversations are saved with project_id
   ```

## Migration Notes

### Backward Compatibility

- Existing project-based conversations remain unchanged
- Old API route `/api/projects/{project}/conversations` still works
- New route `/api/conversations` added for normal chat workflow

### Database Migration

No migration needed - `project_id` was already nullable in the schema.

## Security Considerations

1. **Authorization**:

   - Normal conversations: User must own the conversation
   - Project conversations: User must own the project

2. **Data Isolation**:
   - Normal conversations visible only to owner
   - Project conversations visible to project owner
   - No cross-user data leakage

## API Documentation

### Get User Conversations (Normal Chat)

```
GET /api/conversations
Authorization: Bearer {token}
Response: Array of conversations where project_id IS NULL
```

### Get Project Conversations

```
GET /api/projects/{projectId}/conversations
Authorization: Bearer {token}
Response: Array of conversations for the specified project
```

### Create Conversation

```
POST /api/conversations
Authorization: Bearer {token}
Body: {
  "title": "Conversation title",
  "project_id": null | number,  // null for normal chat, project ID for project chat
  "context": "Optional context",
  "status": "active"
}
Response: Created conversation object
```
