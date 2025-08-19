'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AdminTest() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Portal Test</h1>
        <p className="text-gray-600 mb-6">
          This is a test page to verify the admin portal is working
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/admin/agent"
            className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Admin Portal
          </Link>
          
          <Link 
            href="/"
            className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Development Server URLs:</p>
          <p>Home: http://localhost:3001</p>
          <p>Admin Test: http://localhost:3001/admin-test</p>
          <p>Admin Portal: http://localhost:3001/admin/agent</p>
        </div>
      </div>
    </div>
  );
}