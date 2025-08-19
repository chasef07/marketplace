'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Settings } from 'lucide-react';

interface AdminAccessButtonProps {
  variant?: 'button' | 'link' | 'icon';
  className?: string;
}

export default function AdminAccessButton({ 
  variant = 'button',
  className = '' 
}: AdminAccessButtonProps) {
  const router = useRouter();

  const handleAdminAccess = () => {
    router.push('/admin/agent');
  };

  // For testing - always show the admin button

  // Icon variant (for navbar/header)
  if (variant === 'icon') {
    return (
      <button
        onClick={handleAdminAccess}
        className={`p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title="Admin Portal (Testing Mode)"
      >
        <Shield className="h-5 w-5 text-blue-600" />
      </button>
    );
  }

  // Link variant (for menus/sidebars)
  if (variant === 'link') {
    return (
      <button
        onClick={handleAdminAccess}
        className={`flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors ${className}`}
      >
        <Shield className="h-4 w-4" />
        <span>Admin Portal</span>
      </button>
    );
  }

  // Button variant (default)
  return (
    <button
      onClick={handleAdminAccess}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
    >
      <Shield className="h-4 w-4" />
      <span>Admin Portal</span>
    </button>
  );
}

// Hook for checking admin status in other components
export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/admin-check');
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
}