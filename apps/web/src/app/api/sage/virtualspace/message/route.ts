/**
 * POST /api/sage/virtualspace/message
 *
 * Send a message to Sage in a VirtualSpace session.
 * Looks up the sage_session, then proxies the request to the existing
 * /api/sage/stream SSE handler with the correct sessionId, subject, and level.
 *
 * Response: Server-Sent Events stream (same format as /api/sage/stream)
 *
 * @module api/sage/virtualspace/message
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { sageSessionId, message, conversationHistory } = body as {
      sageSessionId?: string;
      message?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!sageSessionId || !message) {
      return new Response(
        JSON.stringify({ error: 'sageSessionId and message are required', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Look up the sage_session to get subject/level context
    const { data: sageSession, error: sessionError } = await supabase
      .from('sage_sessions')
      .select('id, user_id, subject, level, status')
      .eq('id', sageSessionId)
      .single();

    if (sessionError || !sageSession) {
      return new Response(
        JSON.stringify({ error: 'Sage session not found', code: 'SESSION_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sageSession.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied', code: 'FORBIDDEN' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (sageSession.status === 'ended') {
      return new Response(
        JSON.stringify({ error: 'Sage session has ended', code: 'SESSION_ENDED' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Canvas writing instructions — injected into the system prompt so Sage can
    // stamp shapes on the whiteboard by emitting [CANVAS]{...}[/CANVAS] blocks.
    const CANVAS_INSTRUCTIONS = `## Canvas Writing
You can draw shapes on the whiteboard. When a visual aid would genuinely help the student understand, include a [CANVAS] block. The JSON MUST have exactly two keys: "type" and "props".

Example (graph axes):
[CANVAS]
{"type":"graph-axes","props":{"xMin":-1,"xMax":5,"yMin":-1,"yMax":4,"showGrid":true}}
[/CANVAS]

Example (circle):
[CANVAS]
{"type":"geo","props":{"geo":"ellipse","w":120,"h":120}}
[/CANVAS]

## Maths diagrams
- "math-equation": {"latex":"x^2+y^2=r^2","displayMode":true}
- "number-line": {"min":0,"max":10,"step":1,"label":""}
- "fraction-bar": {"numerator":1,"denominator":4,"showLabel":true}
- "graph-axes": {"xMin":-10,"xMax":10,"yMin":-10,"yMax":10,"showGrid":true}
- "line-segment": {"x1":0,"y1":0,"x2":4,"y2":3,"labelA":"A","labelB":"B","label":"","showGrid":true,"color":"#3b82f6"}
- "pythagoras": {"sideA":3,"sideB":4,"showWorking":true}
- "protractor": {"angle":45,"showDegrees":true}
- "unit-circle": {"showAngles":true,"showCoordinates":true,"highlightAngle":0}
- "function-plot": {"xMin":-5,"xMax":5,"yMin":-5,"yMax":5,"functions":"[{\\"expr\\":\\"x^2\\",\\"color\\":\\"#3b82f6\\",\\"label\\":\\"y=x²\\"}]"}
- "trig-triangle": {"angleDeg":30,"hypotenuse":5,"showWorking":true,"showLabels":true}
- "probability-tree": {"title":"Probability Tree","branches":"[{\\"label\\":\\"Head\\",\\"prob\\":\\"1/2\\",\\"children\\":[{\\"label\\":\\"H\\",\\"prob\\":\\"1/2\\"},{\\"label\\":\\"T\\",\\"prob\\":\\"1/2\\"}]}]"}
- "venn-diagram": {"leftLabel":"A","rightLabel":"B","leftContent":"item1, item2","centerContent":"shared","rightContent":"item3","title":""}
- "pie-chart": {"segments":"[{\\"label\\":\\"A\\",\\"value\\":50,\\"color\\":\\"#3b82f6\\"}]","title":""}
- "bar-chart": {"bars":"[{\\"label\\":\\"A\\",\\"value\\":10,\\"color\\":\\"#3b82f6\\"}]","title":"","xLabel":"","yLabel":""}

## Science diagrams
- "chemical-equation": {"reactants":"2H₂ + O₂","products":"2H₂O","type":"combustion","reversible":false,"showState":true}
- "wave-diagram": {"amplitude":40,"frequency":2,"waveType":"transverse","showLabels":true,"color":"#3b82f6"}
- "forces-diagram": {"bodyLabel":"Object","forces":"[{\\"label\\":\\"Weight\\",\\"magnitude\\":10,\\"direction\\":\\"down\\",\\"color\\":\\"#ef4444\\"}]"}
- "bohr-atom": {"symbol":"C","protons":6,"neutrons":6,"shells":"[2,4]","showLabels":true}
- "circuit-component": {"componentType":"resistor","label":"R1","value":"10Ω","showLabel":true}

## Technology / Computing diagrams
- "flowchart": {"steps":"[{\\"id\\":\\"1\\",\\"type\\":\\"start\\",\\"text\\":\\"Start\\"},{\\"id\\":\\"2\\",\\"type\\":\\"process\\",\\"text\\":\\"Step\\"},{\\"id\\":\\"3\\",\\"type\\":\\"end\\",\\"text\\":\\"End\\"}]","title":""}

## English / Humanities diagrams
- "story-mountain": {"title":"Story Mountain","stages":"[{\\"label\\":\\"Exposition\\",\\"description\\":\\"Setting the scene\\"},{\\"label\\":\\"Rising Action\\",\\"description\\":\\"Tension builds\\"},{\\"label\\":\\"Climax\\",\\"description\\":\\"Peak moment\\"},{\\"label\\":\\"Falling Action\\",\\"description\\":\\"Aftermath\\"},{\\"label\\":\\"Resolution\\",\\"description\\":\\"Conclusion\\"}]"}
- "annotation": {"text":"...","annotationType":"comment","label":"","showBadge":false}
- "timeline": {"events":"[{\\"label\\":\\"Event\\",\\"date\\":\\"1066\\",\\"color\\":\\"#3b82f6\\"}]","title":""}

## General shapes (use "geo" type, set "geo" prop to one of the variants)
- Circle / oval: {"type":"geo","props":{"geo":"ellipse","w":120,"h":120}}
- Rectangle / square: {"type":"geo","props":{"geo":"rectangle","w":150,"h":100}}
- Triangle: {"type":"geo","props":{"geo":"triangle","w":120,"h":120}}
- Diamond / rhombus: {"type":"geo","props":{"geo":"diamond","w":120,"h":100}}
- Star: {"type":"geo","props":{"geo":"star","w":120,"h":120}}
- Pentagon: {"type":"geo","props":{"geo":"pentagon","w":120,"h":120}}
- Hexagon: {"type":"geo","props":{"geo":"hexagon","w":140,"h":120}}
- Octagon: {"type":"geo","props":{"geo":"octagon","w":120,"h":120}}
- Right arrow: {"type":"geo","props":{"geo":"arrow-right","w":140,"h":80}}
- Left arrow: {"type":"geo","props":{"geo":"arrow-left","w":140,"h":80}}
- Up arrow: {"type":"geo","props":{"geo":"arrow-up","w":80,"h":140}}
- Down arrow: {"type":"geo","props":{"geo":"arrow-down","w":80,"h":140}}
- Cloud / thought bubble: {"type":"geo","props":{"geo":"cloud","w":160,"h":100}}
- Trapezoid: {"type":"geo","props":{"geo":"trapezoid","w":140,"h":80}}
- Heart: {"type":"geo","props":{"geo":"heart","w":120,"h":120}}

Rules:
- The JSON must be exactly: {"type":"<type>","props":{<the props>}} — never flatten props to the top level.
- Only add a canvas shape when it genuinely aids understanding.
- Put [CANVAS] on its own line — never inside a markdown code fence.
- At most one [CANVAS] block per response.
- Valid JSON only — no comments, no trailing commas.
- For "functions", "branches", "segments", "bars", "events", "steps", "forces", "stages" fields: value must be a JSON array serialised as a string (use escaped quotes as shown in examples).`;

    // Forward to the existing /api/sage/stream endpoint.
    // We reconstruct the request with the correct sessionId, subject, level
    // so all the existing safety, RAG, curriculum, and streaming logic runs as-is.
    const streamPayload = {
      sessionId: sageSessionId,
      message,
      subject: sageSession.subject,
      level: sageSession.level,
      conversationHistory: conversationHistory ?? [],
      extraSystemContext: CANVAS_INSTRUCTIONS,
    };

    // Build a new Request object targeting the stream route
    const streamUrl = new URL('/api/sage/stream', request.url);
    const streamRequest = new Request(streamUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for auth re-verification inside the stream route
        cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify(streamPayload),
    });

    // Dynamically import the stream route handler to avoid duplication
    const { POST: streamHandler } = await import('@/app/api/sage/stream/route');
    return streamHandler(streamRequest as NextRequest);

  } catch (error) {
    console.error('[Sage Virtualspace Message] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
