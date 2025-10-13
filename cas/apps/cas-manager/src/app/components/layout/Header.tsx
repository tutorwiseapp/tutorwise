// src/app/components/layout/Header.tsx
import React from 'react';

export const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              CAS Manager
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
