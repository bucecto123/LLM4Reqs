/**
 * Project Sharing Service
 * Management collaborators (members) of project
 */

import { apiFetch } from '../utils/auth';

/*List collaborators of project*/
export async function getProjectCollaborators(projectId) {
  return await apiFetch(`/api/projects/${projectId}/collaborators`);
}

/*Add new collaborator (invite)*/
export async function addCollaborator(projectId, { email, role = 'viewer' }) {
  return await apiFetch(`/api/projects/${projectId}/collaborators`, {
    method: 'POST',
    body: { email, role }
  });
}

/*Role of collaborator — {userId} is the collaborator's user_id (not the collaborator PK) */
export async function updateCollaboratorRole(projectId, userId, newRole) {
  return await apiFetch(`/api/projects/${projectId}/collaborators/user/${userId}`, {
    method: 'PUT',
    body: { role: newRole }
  });
}

/* DELETED collaborator — {userId} is the collaborator's user_id (not the collaborator PK) */
export async function removeCollaborator(projectId, userId) {
  return await apiFetch(`/api/projects/${projectId}/collaborators/user/${userId}`, {
    method: 'DELETE'
  });
}

/*Check the current user permissions*/
export function canEdit(userRole) {
  return ['owner', 'editor'].includes(userRole);
}

export function canDelete(userRole) {
  return userRole === 'owner';
}

export function canChangeRole(userRole) {
  return userRole === 'owner';
}
