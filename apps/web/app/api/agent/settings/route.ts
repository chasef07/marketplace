import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ratelimit, withRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export const runtime = 'edge';

const settingsSchema = z.object({
  agentEnabled: z.boolean(),
  aggressivenessLevel: z.number().min(0).max(1).default(0.5),
  autoAcceptThreshold: z.number().min(0.8).max(1).default(0.95),
  minAcceptableRatio: z.number().min(0.5).max(0.9).default(0.75),
  responseDelayMinutes: z.number().min(0).max(60).default(0),
});

/**
 * Get seller agent settings
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create agent profile
    const { data: initialProfile, error: profileError } = await supabase
      .from('seller_agent_profile')
      .select('*')
      .eq('seller_id', user.id)
      .single();
    
    let agentProfile = initialProfile;

    // If no profile exists, create one with defaults
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from('seller_agent_profile')
        .insert({
          seller_id: user.id,
          agent_enabled: true,
          aggressiveness_level: 0.5,
          auto_accept_threshold: 0.95,
          min_acceptable_ratio: 0.75,
          response_delay_minutes: 0,
        })
        .select()
        .single();

      if (createError) {
        return Response.json({ 
          error: 'Failed to create agent profile',
          details: createError.message 
        }, { status: 500 });
      }

      agentProfile = newProfile;
    } else if (profileError) {
      return Response.json({ 
        error: 'Failed to get agent profile',
        details: profileError.message 
      }, { status: 500 });
    }

    // Get agent statistics
    const { data: stats } = await supabase
      .from('agent_decisions')
      .select('decision_type, created_at')
      .eq('seller_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    const decisionStats = {
      total: stats?.length || 0,
      accepted: stats?.filter(s => s.decision_type === 'ACCEPT').length || 0,
      countered: stats?.filter(s => s.decision_type === 'COUNTER').length || 0,
      declined: stats?.filter(s => s.decision_type === 'DECLINE').length || 0,
    };

    // Get active items count
    const { count: activeItems } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .eq('seller_id', user.id)
      .eq('item_status', 'active');

    return Response.json({
      settings: {
        agentEnabled: agentProfile.agent_enabled,
        aggressivenessLevel: agentProfile.aggressiveness_level,
        autoAcceptThreshold: agentProfile.auto_accept_threshold,
        minAcceptableRatio: agentProfile.min_acceptable_ratio,
        responseDelayMinutes: agentProfile.response_delay_minutes,
      },
      statistics: {
        activeItems: activeItems || 0,
        decisionsLast30Days: decisionStats,
        lastUpdated: agentProfile.updated_at,
      },
      recommendations: {
        aggressivenessLevel: decisionStats.total > 0 ? 
          (decisionStats.accepted / decisionStats.total > 0.7 ? 'Consider being more aggressive' : 
           decisionStats.declined / decisionStats.total > 0.3 ? 'Consider being less aggressive' : 
           'Current settings appear balanced') : 
          'No data yet - try default settings',
      }
    });

  } catch (error) {
    console.error('Agent settings retrieval error:', error);
    return Response.json({
      error: 'Failed to get agent settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update seller agent settings
 */
export async function PUT(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const body = await request.json();
      const settings = settingsSchema.parse(body);

      const supabase = createSupabaseServerClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Update agent profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('seller_agent_profile')
        .upsert({
          seller_id: user.id,
          agent_enabled: settings.agentEnabled,
          aggressiveness_level: settings.aggressivenessLevel,
          auto_accept_threshold: settings.autoAcceptThreshold,
          min_acceptable_ratio: settings.minAcceptableRatio,
          response_delay_minutes: settings.responseDelayMinutes,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (updateError) {
        return Response.json({ 
          error: 'Failed to update agent settings',
          details: updateError.message 
        }, { status: 500 });
      }

      // Agent settings updated - immediate processing enabled

      return Response.json({
        success: true,
        settings: {
          agentEnabled: updatedProfile.agent_enabled,
          aggressivenessLevel: updatedProfile.aggressiveness_level,
          autoAcceptThreshold: updatedProfile.auto_accept_threshold,
          minAcceptableRatio: updatedProfile.min_acceptable_ratio,
          responseDelayMinutes: updatedProfile.response_delay_minutes,
        },
        message: settings.agentEnabled ? 
          'Agent enabled - will automatically handle negotiations' :
          'Agent disabled - negotiations will require manual handling'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json({ 
          error: 'Invalid settings',
          details: error.errors 
        }, { status: 400 });
      }

      console.error('Agent settings update error:', error);
      return Response.json({
        error: 'Update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

/**
 * Reset agent settings to defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset to default settings
    const { data: resetProfile, error: resetError } = await supabase
      .from('seller_agent_profile')
      .upsert({
        seller_id: user.id,
        agent_enabled: true,
        aggressiveness_level: 0.5,
        auto_accept_threshold: 0.95,
        min_acceptable_ratio: 0.75,
        response_delay_minutes: 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (resetError) {
      return Response.json({ 
        error: 'Failed to reset agent settings',
        details: resetError.message 
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      settings: {
        agentEnabled: resetProfile.agent_enabled,
        aggressivenessLevel: resetProfile.aggressiveness_level,
        autoAcceptThreshold: resetProfile.auto_accept_threshold,
        minAcceptableRatio: resetProfile.min_acceptable_ratio,
        responseDelayMinutes: resetProfile.response_delay_minutes,
      },
      message: 'Agent settings reset to defaults'
    });

  } catch (error) {
    console.error('Agent settings reset error:', error);
    return Response.json({
      error: 'Reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}