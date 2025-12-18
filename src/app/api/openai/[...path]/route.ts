import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * Generic proxy handler for OpenAI API requests.
 * Forwards requests to OpenAI, substituting the server-side API key.
 */
async function proxyToOpenAI(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const openaiPath = path.join('/');
  const openaiUrl = `${OPENAI_API_BASE}/${openaiPath}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: 'Server API key not configured' } },
      { status: 500 }
    );
  }

  // Optional: Validate oauth-proxy headers if you want defense-in-depth
  // Uncomment if your oauth-proxy injects user headers:
  // const forwardedUser = request.headers.get("X-Forwarded-User");
  // if (!forwardedUser) {
  //   return NextResponse.json(
  //     { error: { message: "Unauthorized - missing auth headers" } },
  //     { status: 401 }
  //   );
  // }

  // Clone headers from original request, excluding host
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'authorization') {
      headers.set(key, value);
    }
  });

  // Set the server-side API key
  headers.set('Authorization', `Bearer ${apiKey}`);

  try {
    // Forward the request body for methods that support it
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(request.method);
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const response = await fetch(openaiUrl, {
      method: request.method,
      headers,
      body,
    });

    // Handle streaming responses (for chat completions with stream: true)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Handle regular JSON responses
    const data = await response.arrayBuffer();
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (
        !['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())
      ) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('OpenAI proxy error:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Proxy error',
        },
      },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = proxyToOpenAI;
export const POST = proxyToOpenAI;
export const PUT = proxyToOpenAI;
export const PATCH = proxyToOpenAI;
export const DELETE = proxyToOpenAI;
