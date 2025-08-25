'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/src/lib/supabase';
import { X, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface AgentNotification {
  id: string;
  type: 'success' | 'info' | 'warning';
  message: string;
  timestamp: Date;
  itemId?: number;
  negotiationId?: number;
}

export function NotificationOverlay() {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClientClient();
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setupNotificationListener(user.id);
      }
    });
  }, []);

  const setupNotificationListener = (userId: string) => {
    const supabase = createSupabaseClientClient();

    // Listen for new agent decisions that should notify the seller
    const subscription = supabase
      .channel('agent-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_decisions',
          filter: `negotiations.seller_id=eq.${userId}`,
        },
        (payload) => {
          handleNewAgentDecision(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleNewAgentDecision = async (decision: any) => {
    // Only show notifications for critical decisions
    if (decision.decision_type === 'ACCEPT') {
      addNotification({
        type: 'success',
        message: `Item sold for $${decision.recommended_price}`,
        itemId: decision.item_id,
        negotiationId: decision.negotiation_id,
      });
    } else if (decision.decision_type === 'DECLINE') {
      addNotification({
        type: 'warning',
        message: `Declined offer - ${decision.reasoning?.substring(0, 50)}...`,
        itemId: decision.item_id,
        negotiationId: decision.negotiation_id,
      });
    }
    // COUNTER and WAIT decisions don't generate notifications (autonomous operation)
  };

  const addNotification = (notification: Omit<AgentNotification, 'id' | 'timestamp'>) => {
    const newNotification: AgentNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications

    // Auto-remove after 10 seconds for non-critical notifications
    if (notification.type !== 'success') {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 10000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            bg-white border-l-4 shadow-lg rounded-lg p-4 max-w-sm
            transform transition-all duration-300 ease-in-out
            ${notification.type === 'success' ? 'border-green-500' : ''}
            ${notification.type === 'warning' ? 'border-yellow-500' : ''}
            ${notification.type === 'info' ? 'border-blue-500' : ''}
          `}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {notification.type === 'warning' && (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              {notification.type === 'info' && (
                <Clock className="h-5 w-5 text-blue-500" />
              )}
            </div>
            
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                AI Agent
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}