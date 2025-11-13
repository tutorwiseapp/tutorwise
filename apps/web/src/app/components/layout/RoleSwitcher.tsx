'use client';

import React, { useState } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { Role } from '@/types';

const roleConfig: Record<Role, { label: string; color: string }> = {
  agent: { label: 'Agent', color: 'text-purple-600 bg-purple-50' },
  client: { label: 'Client', color: 'text-blue-600 bg-blue-50' },
  tutor: { label: 'Tutor', color: 'text-green-600 bg-green-50' },
  student: { label: 'Student', color: 'text-orange-600 bg-orange-50' } // v5.0: Added student role
};

const RoleSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { activeRole, availableRoles, switchRole, isRoleSwitching } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);

  if (!activeRole || availableRoles.length <= 1) return null;

  const currentRole = roleConfig[activeRole];

  const handleRoleSwitch = async (role: Role) => {
    try {
      await switchRole(role);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className={`inline-flex items-center px-4 py-2 text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${currentRole.color} ${isRoleSwitching ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
        onClick={() => !isRoleSwitching && setIsOpen(!isOpen)}
        disabled={isRoleSwitching}
      >
        {currentRole.label}
        <svg className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-1">
            {availableRoles.map((role) => {
              if (role === activeRole) return null;
              const config = roleConfig[role];
              return (
                <button
                  key={role}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => handleRoleSwitch(role)}
                  disabled={isRoleSwitching}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
    </div>
  );
};

export default RoleSwitcher;