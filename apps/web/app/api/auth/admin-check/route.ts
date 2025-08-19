import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * Check if the current user is an admin
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return Response.json({ isAdmin: false });
    }

    // Check if user is admin using database function
    const { data: isAdminResult, error } = await supabase.rpc('is_admin');

    if (error) {
      console.error('Error checking admin status:', error);
      return Response.json({ isAdmin: false });
    }

    return Response.json({ isAdmin: !!isAdminResult });

  } catch (error) {
    console.error('Admin check failed:', error);
    return Response.json({ isAdmin: false });
  }
}