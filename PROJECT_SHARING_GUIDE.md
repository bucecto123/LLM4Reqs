# Project Sharing & Story Graph Implementation

## Overview

This implementation adds project sharing functionality and user story graph generation to the LLM4Reqs system. Team members can now collaborate on projects with role-based access control, and visualize requirement dependencies through AI-generated story graphs.

## Features Implemented

### 1. Project Sharing System

#### Data Model
- **Table**: `project_collaborators`
- **Roles**: `owner`, `editor`, `viewer`
- **Indices**: Optimized queries with composite index on `(project_id, role)` and single index on `user_id`
- **Constraints**: Unique constraint on `(project_id, user_id)` to prevent duplicates
- **Cascade**: Automatic cleanup when project or user is deleted

#### Authorization Policy
- **Owner**: Full access (view, edit, delete, manage collaborators)
- **Editor**: Can view and modify project resources (documents, requirements, conflicts)
- **Viewer**: Read-only access to project resources

#### API Endpoints

##### List Project Collaborators
```http
GET /api/projects/{project}/collaborators
Authorization: Bearer {token}
```

**Response**:
```json
{
  "owner": {
    "id": null,
    "user_id": 1,
    "name": "Project Owner",
    "email": "owner@example.com",
    "role": "owner",
    "joined_at": "2026-01-30T00:00:00.000000Z"
  },
  "collaborators": [
    {
      "id": 1,
      "user_id": 2,
      "name": "Team Member",
      "email": "member@example.com",
      "role": "editor",
      "joined_at": "2026-01-30T01:00:00.000000Z"
    }
  ]
}
```

##### Add Collaborator
```http
POST /api/projects/{project}/collaborators
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "editor"
}
```

**Response**: `201 Created`
```json
{
  "message": "Collaborator added successfully",
  "collaborator": {
    "id": 2,
    "user_id": 3,
    "name": "New Member",
    "email": "newmember@example.com",
    "role": "editor",
    "joined_at": "2026-01-30T02:00:00.000000Z"
  }
}
```

##### Update Collaborator Role
```http
PUT /api/projects/{project}/collaborators/{collaborator}
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "viewer"
}
```

**Response**: `200 OK`
```json
{
  "message": "Collaborator role updated successfully",
  "collaborator": {
    "id": 2,
    "user_id": 3,
    "name": "Team Member",
    "email": "member@example.com",
    "role": "viewer",
    "joined_at": "2026-01-30T01:00:00.000000Z"
  }
}
```

##### Remove Collaborator
```http
DELETE /api/projects/{project}/collaborators/{collaborator}
Authorization: Bearer {token}
```

**Response**: `200 OK`
```json
{
  "message": "Collaborator removed successfully"
}
```

### 2. Story Graph Generation

#### Backend API

##### Generate Story Graph
```http
GET /api/projects/{project}/story-graph?use_cache=true
Authorization: Bearer {token}
```

**Response**: `200 OK`
```json
{
  "cached": false,
  "graph": {
    "success": true,
    "mermaid_code": "graph TD\n    A[User Login] --> B[Dashboard]\n    B --> C[Create Project]\n    C --> D[Add Requirements]",
    "nodes": [
      {
        "id": "req_1",
        "label": "User Authentication",
        "type": "functional",
        "priority": "high",
        "status": "completed"
      }
    ],
    "edges": [
      {
        "source": "A",
        "target": "B",
        "type": "dependency"
      }
    ]
  }
}
```

##### Clear Story Graph Cache
```http
DELETE /api/projects/{project}/story-graph/cache
Authorization: Bearer {token}
```

**Response**: `200 OK`
```json
{
  "message": "Story graph cache cleared successfully"
}
```

#### LLM Service Endpoint

```http
POST http://llm:8000/api/generate-story-graph
Content-Type: application/json

{
  "project_id": 1,
  "project_name": "My Project",
  "requirements": [
    {
      "id": 1,
      "title": "User Login",
      "text": "Users should be able to log in with email and password",
      "type": "functional",
      "priority": "high",
      "status": "completed",
      "personas": ["End User"]
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "mermaid_code": "graph TD\n    req_1[User Login] --> req_2[Dashboard]\n    req_2 --> req_3[Project Creation]",
  "nodes": [...],
  "edges": [...]
}
```

## Protected Routes

The following routes now enforce authorization policies:

### Project Routes
- `GET /api/projects/{project}` - Requires `view` permission
- `PUT /api/projects/{project}` - Requires `update` permission
- `DELETE /api/projects/{project}` - Requires `delete` permission (owner only)
- `GET /api/projects/{project}/requirements` - Requires `viewResources` permission
- `GET /api/projects/{project}/conflicts` - Requires `viewResources` permission

### Document Routes
- `POST /api/documents` - Requires `modifyResources` permission on associated project

### Conflict Routes
- `POST /api/projects/{project}/conflicts/detect` - Requires `viewResources` permission
- `GET /api/projects/{project}/conflicts` - Requires `viewResources` permission

### Conversation Routes
- `GET /api/projects/{project}/conversations` - Requires `viewResources` permission

## Database Migration

Run the migration to add indices:

```bash
docker-compose exec backend php artisan migrate
```

**Migration**: `2026_01_30_000001_update_project_collaborators_roles.php`

Changes:
- Adds composite index on `(project_id, role)` for efficient role-based queries
- Adds index on `user_id` for user-specific queries
- Migrates existing `member` roles to `editor` role

## Testing

### Unit Test
Run the provided test script:

```bash
docker-compose exec backend php test_project_sharing.php
```

Tests cover:
- ✓ Adding collaborators with different roles
- ✓ Listing project collaborators
- ✓ Authorization policy enforcement (owner, editor, viewer)
- ✓ Updating collaborator roles
- ✓ Removing collaborators
- ✓ Duplicate prevention

### Manual API Testing

#### 1. Create Project and Add Collaborator
```bash
# Login as owner
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@example.com", "password": "password"}'

# Create project
curl -X POST http://localhost:8001/api/projects \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "description": "Testing sharing"}'

# Add collaborator
curl -X POST http://localhost:8001/api/projects/1/collaborators \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"email": "editor@example.com", "role": "editor"}'
```

#### 2. Generate Story Graph
```bash
curl -X GET http://localhost:8001/api/projects/1/story-graph \
  -H "Authorization: Bearer {token}"
```

## Frontend Integration Guide

### React Component Example (Story Graph)

```jsx
import { useEffect, useState } from 'react';
import mermaid from 'mermaid';

function StoryGraphView({ projectId }) {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoryGraph();
  }, [projectId]);

  const fetchStoryGraph = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/story-graph`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setGraph(data.graph);
      
      // Render mermaid diagram
      if (data.graph.mermaid_code) {
        mermaid.contentLoaded();
      }
    } catch (error) {
      console.error('Failed to fetch story graph:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading graph...</div>;
  
  return (
    <div className="story-graph">
      <h2>User Story Dependencies</h2>
      <div className="mermaid">
        {graph?.mermaid_code}
      </div>
    </div>
  );
}
```

### React Component Example (Project Sharing)

```jsx
function ProjectSharingPanel({ projectId }) {
  const [collaborators, setCollaborators] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  const loadCollaborators = async () => {
    const response = await fetch(`/api/projects/${projectId}/collaborators`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setCollaborators(data.collaborators);
  };

  const addCollaborator = async () => {
    await fetch(`/api/projects/${projectId}/collaborators`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, role })
    });
    loadCollaborators();
  };

  const removeCollaborator = async (collaboratorId) => {
    await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadCollaborators();
  };

  return (
    <div className="sharing-panel">
      <h3>Project Collaborators</h3>
      
      {/* Add collaborator form */}
      <div className="add-collaborator">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="owner">Owner</option>
        </select>
        <button onClick={addCollaborator}>Add</button>
      </div>

      {/* Collaborators list */}
      <ul className="collaborators-list">
        {collaborators.map(collab => (
          <li key={collab.id}>
            <span>{collab.name} ({collab.email})</span>
            <span className="role">{collab.role}</span>
            <button onClick={() => removeCollaborator(collab.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Security Considerations

1. **Authorization Enforcement**: All protected routes check user permissions before allowing access
2. **Owner Protection**: Only project owners can delete projects or transfer ownership
3. **Duplicate Prevention**: Unique constraint prevents adding the same user twice
4. **Cascade Deletion**: Collaborators are automatically removed when project or user is deleted
5. **Input Validation**: Email validation and role enum validation on all inputs

## Performance Optimizations

1. **Caching**: Story graphs are cached for 1 hour to reduce LLM API calls
2. **Indexed Queries**: Composite indices on `(project_id, role)` for fast permission checks
3. **Lazy Loading**: Collaborators are loaded with user data in a single query
4. **Query Optimization**: Authorization checks use `exists()` for minimal overhead

## Acceptance Criteria Status

- ✅ Viewer can read shared project data
- ✅ Editors can modify project resources
- ✅ Upload works in chat (with authorization)
- ✅ Unit tests covering sharing functionality
- ✅ Story graph generation with caching
- ✅ Regression coverage (all existing tests still pass)

## Next Steps

1. **Frontend Implementation**: Build React components for sharing UI and graph visualization
2. **Notifications**: Add email notifications when users are added to projects
3. **Activity Log**: Track collaborator actions for audit trail
4. **Advanced Graph Features**: Add filtering, zooming, and export options for story graphs
5. **Real-time Updates**: Use WebSockets to notify collaborators of changes

## Troubleshooting

### Permission Denied Errors
- Verify user has correct role for the action
- Check that authorization policies are properly registered
- Ensure user is authenticated (valid token)

### Story Graph Not Generating
- Verify LLM service is running: `docker-compose ps`
- Check LLM service logs: `docker-compose logs llm`
- Ensure GROQ_API_KEY is set in `.env`

### Database Errors
- Run migrations: `docker-compose exec backend php artisan migrate`
- Check PostgreSQL connection: `docker-compose logs db`

## Files Created/Modified

### New Files
- `backend/app/Policies/ProjectPolicy.php` - Authorization policy
- `backend/app/Http/Controllers/Api/ProjectCollaboratorController.php` - Sharing API
- `backend/app/Http/Controllers/Api/StoryGraphController.php` - Graph generation API
- `backend/database/migrations/2026_01_30_000001_update_project_collaborators_roles.php` - Migration
- `backend/test_project_sharing.php` - Test suite
- `PROJECT_SHARING_GUIDE.md` - This documentation

### Modified Files
- `backend/routes/api.php` - Added new routes
- `backend/app/Providers/AppServiceProvider.php` - Registered policy
- `backend/app/Http/Controllers/Api/ProjectController.php` - Added authorization checks
- `backend/app/Http/Controllers/Api/DocumentController.php` - Added authorization checks
- `backend/app/Http/Controllers/Api/ConflictController.php` - Added authorization checks
- `backend/app/Http/Controllers/Api/ConversationController.php` - Added authorization checks
- `llm/main.py` - Added story graph generation endpoint

---

**Implementation Date**: January 30, 2026
**Status**: ✅ Complete and Tested
**Backend Team**: Complete
