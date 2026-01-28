import React, { useState } from 'react';
import { UserPlus, Mail, Shield } from 'lucide-react';

/**
 * InviteForm Component
 * Form invite new member to project
 * 
 * Props:
 * - onInvite: Function - Callback when submitting the form
 * - isLoading: Boolean - Loading state
 */

export default function InviteForm({ onInvite, isLoading = false }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Call parent callback
    if (onInvite) {
      onInvite({ email: email.trim(), role })
        .then(() => {
          // Clear form on success
          setEmail('');
          setRole('viewer');
          setError('');
        })
        .catch((err) => {
          setError(err.message || 'Failed to invite member');
        });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <UserPlus className="w-5 h-5 text-indigo-600 mt-3" />
        
        <div className="flex-1 space-y-3">
          {/* Email Input */}
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(''); // Clear error on change
                }}
                placeholder="colleague@example.com"
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Role Select */}
          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              >
                <option value="viewer">Viewer - Can view only</option>
                <option value="editor">Editor - Can view and edit</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {role === 'viewer' 
                ? 'Can view project but cannot make changes'
                : 'Can view and edit requirements, documents, and settings'}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending invite...
              </span>
            ) : (
              'Send Invite'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
