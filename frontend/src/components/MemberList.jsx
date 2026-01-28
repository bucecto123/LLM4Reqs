import React from 'react';
import { Trash2, Crown, Edit, Eye } from 'lucide-react';

/**
* MemberList Component
* Displays a list of collaborators with role badges and actions
*
* Props:
* collaborators: Array - List of members
* currentUserRole: String - Role of the current user
* onChangeRole: Function - Callback when changing roles
* onRemove: Function - Callback when deleting a member
*/

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600'
  },
  editor: {
    label: 'Editor',
    icon: Edit,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600'
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600'
  }
};

export default function MemberList({ 
  collaborators = [], 
  currentUserRole = 'viewer',
  onChangeRole,
  onRemove 
}) {
  const canManage = currentUserRole === 'owner';

  const handleRoleChange = (userId, newRole) => {
    if (onChangeRole) {
      onChangeRole(userId, newRole);
    }
  };

  const handleRemove = (userId, memberName) => {
    if (onRemove) {
      onRemove(userId, memberName);
    }
  };

  return (
    <div className="space-y-2">
      {collaborators.map((member) => {
        const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
        const RoleIcon = roleConfig.icon;
        const isOwner = member.role === 'owner';

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            {/* Member Info */}
            <div className="flex items-center space-x-3 flex-1">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Name & Email */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {member.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {member.email}
                </p>
              </div>
            </div>

            {/* Role & Actions */}
            <div className="flex items-center space-x-3">
              {/* Role Badge/Dropdown */}
              {canManage && !isOwner ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${roleConfig.color}`}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <span className={`px-3 py-1.5 rounded-md border text-sm font-medium inline-flex items-center space-x-1.5 ${roleConfig.color}`}>
                  <RoleIcon className={`w-4 h-4 ${roleConfig.iconColor}`} />
                  <span>{roleConfig.label}</span>
                </span>
              )}

              {/* Remove Button */}
              {canManage && !isOwner && (
                <button
                  onClick={() => handleRemove(member.user_id, member.name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {collaborators.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No members yet
        </div>
      )}
    </div>
  );
}
