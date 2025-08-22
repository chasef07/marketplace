import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Cron endpoint for periodic agent monitoring
 * This should be called every 15 seconds via Vercel Cron or external service
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/agent/cron",
 *     "schedule": "* /15 * * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify this is coming from Vercel Cron (optional security)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];
    let processedCount = 0;
    const maxProcessingTime = 25000; // 25 seconds max (leave 5s buffer for Vercel timeout)

    // Process queued offers until we run out of time or queue is empty
    while (Date.now() - startTime < maxProcessingTime) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/agent/monitor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'vercel-cron',
          },
        });

        const result = await response.json();
        
        if (result.queueEmpty) {
          // No more tasks to process
          break;
        }

        if (result.success && result.processed > 0) {
          results.push(result.task);
          processedCount += result.processed;
        } else if (!result.success) {
          console.error('Agent processing failed:', result);
          break; // Stop processing on error
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('Monitor call failed:', error);
        break;
      }
    }

    const executionTime = Date.now() - startTime;

    // Log successful cron run
    console.log(`Agent cron completed: ${processedCount} offers processed in ${executionTime}ms`);

    return Response.json({
      success: true,
      processed: processedCount,
      executionTimeMs: executionTime,
      results: results.slice(0, 10), // Return max 10 results to avoid large responses
      message: processedCount > 0 ? 
        `Processed ${processedCount} offers successfully` :
        'No offers to process'
    });

  } catch (error) {
    console.error('Agent cron error:', error);
    return Response.json({
      success: false,
      error: 'Cron execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

/**
 * Manual trigger for testing (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const maxTasks = body.maxTasks || 5;

    const results = [];
    let processedCount = 0;

    for (let i = 0; i < maxTasks; i++) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/agent/monitor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        
        if (result.queueEmpty) {
          break;
        }

        if (result.success && result.processed > 0) {
          results.push(result.task);
          processedCount += result.processed;
        }

      } catch (error) {
        console.error('Manual trigger error:', error);
        break;
      }
    }

    return Response.json({
      success: true,
      processed: processedCount,
      results,
      message: `Manual trigger processed ${processedCount} offers`
    });

  } catch (error) {
    console.error('Manual trigger failed:', error);
    return Response.json({
      success: false,
      error: 'Manual trigger failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}