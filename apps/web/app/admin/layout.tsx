import Link from 'next/link';
import { Bot, Monitor, History, TestTube, BarChart, Home } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Bot className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Agent Admin Portal</h1>
                <p className="text-sm text-gray-600">Testing Mode - No Authentication Required</p>
              </div>
            </div>
            
            <Link 
              href="/"
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Back to Main Site</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <nav className="space-y-2">
              <Link 
                href="/admin/agent" 
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BarChart className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              
              <Link 
                href="/admin/agent/monitor" 
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Monitor className="h-5 w-5" />
                <span>Live Monitor</span>
              </Link>
              
              <Link 
                href="/admin/agent/decisions" 
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <History className="h-5 w-5" />
                <span>Decision History</span>
              </Link>
              
              <Link 
                href="/admin/agent/test" 
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <TestTube className="h-5 w-5" />
                <span>Testing Playground</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}