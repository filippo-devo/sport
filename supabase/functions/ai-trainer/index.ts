// AI personal trainer: proxies the in-app chat to the Claude API.
// The Anthropic key lives only in Supabase secrets (ANTHROPIC_API_KEY); the app never sees it.
// Only signed-in users can call it, with a daily message limit per user.
//
// Request:  { lang: 'pl' | 'en', messages: { role: 'user' | 'assistant', content: string }[], context: TrainerContext }
// Response: { text: string, plan: PlanProposal | null } or { error: string }

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const MODEL = 'claude-opus-5-5';
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '40');
const MAX_HISTORY = 30;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type TrainerContext = {
  /** "id|muscle|equipment|tracking|English name" per line: the only exercises a plan may use. */
  catalog: string;
  profile?: { name?: string; units?: string; bodyWeightKg?: number | null; targetWeightKg?: number };
  goals?: Record<string, number>;
  /** The user's current plan, so it can be modified on request. */
  activePlan?: unknown;
  /** Short summary of recent workouts and stats computed by the app from real logs. */
  recent?: unknown;
};

type PlanItem = { exerciseId: string; sets: number; target: string; restSec: number; weightKg?: number };
type PlanDay = { weekday: number; name: string; items: PlanItem[] };
type PlanProposal = { name: string; description: string; replacesPlanId?: string; days: PlanDay[] };

const PROPOSE_PLAN: Anthropic.Beta.BetaTool = {
  name: 'propose_plan',
  description:
    'Show the user a complete weekly training plan they can save in the app with one tap. ' +
    'Use it whenever you create a new plan or change an existing one; always send the whole plan, not a diff. ' +
    'Only use exercise ids from the catalog.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'days'],
    properties: {
      name: { type: 'string', description: 'Short plan name in the user language.' },
      description: { type: 'string', description: 'One or two sentences: goal, split, who it is for.' },
      replacesPlanId: { type: 'string', description: 'Id of the user plan this one modifies, when editing their current plan.' },
      days: {
        type: 'array',
        minItems: 1,
        maxItems: 7,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['weekday', 'name', 'items'],
          properties: {
            weekday: { type: 'integer', minimum: 0, maximum: 6, description: '0 = Monday … 6 = Sunday.' },
            name: { type: 'string', description: 'Workout name, e.g. "Push A".' },
            items: {
              type: 'array',
              minItems: 1,
              maxItems: 12,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['exerciseId', 'sets', 'target', 'restSec'],
                properties: {
                  exerciseId: { type: 'string' },
                  sets: { type: 'integer', minimum: 1, maximum: 10 },
                  target: { type: 'string', description: 'Reps like "8-10" for weight/reps exercises, seconds like "45" for timed ones.' },
                  restSec: { type: 'integer', minimum: 30, maximum: 300 },
                  weightKg: { type: 'number', minimum: 0, description: 'Suggested working weight in kg, only when the logs give a basis for it.' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You are the AI personal trainer inside GameChanger, a training and nutrition tracking app.
Coach like an experienced, practical strength coach: specific, encouraging, brief. Answer in the user's language.

What you can do:
- Build personalised weekly plans and change existing ones. Present every plan through the propose_plan tool (the app shows it as a card the user can save), and keep the chat text to a short explanation.
- Give recommendations based on the user's logged data in the context: progression (add load or reps when targets were hit), balance between muscle groups, regularity versus their weekly goal, recovery, protein versus goal.
- Answer training, technique and nutrition questions in general terms.

Rules:
- Use only exercise ids from the catalog. Match the user's equipment and level; ask one short question if a key fact (days per week, equipment, goal) is missing and cannot be inferred.
- Base numbers on the logs in the context. Never invent past workouts or results; if there is not enough data, say so.
- You do not count calories from photos and do not analyse exercise videos. For pain, injury or medical conditions, advise seeing a professional.
- Plain text only, no markdown tables.`;

function sanitizePlan(input: unknown, catalogIds: Set<string>): PlanProposal | null {
  const p = input as PlanProposal;
  if (!p || typeof p.name !== 'string' || !Array.isArray(p.days)) return null;
  const days: PlanDay[] = [];
  const used = new Set<number>();
  for (const d of p.days) {
    if (!d || typeof d.weekday !== 'number' || d.weekday < 0 || d.weekday > 6 || used.has(d.weekday) || !Array.isArray(d.items)) continue;
    const items = d.items
      .filter((i) => i && catalogIds.has(i.exerciseId))
      .slice(0, 12)
      .map((i) => ({
        exerciseId: i.exerciseId,
        sets: Math.min(10, Math.max(1, Math.round(Number(i.sets) || 3))),
        target: String(i.target ?? '10').slice(0, 12),
        restSec: Math.min(300, Math.max(30, Math.round(Number(i.restSec) || 90))),
        ...(typeof i.weightKg === 'number' && i.weightKg > 0 ? { weightKg: Math.round(i.weightKg * 2) / 2 } : {}),
      }));
    if (items.length === 0) continue;
    used.add(d.weekday);
    days.push({ weekday: d.weekday, name: String(d.name ?? '').slice(0, 40) || `Day ${d.weekday + 1}`, items });
  }
  if (days.length === 0) return null;
  return {
    name: p.name.slice(0, 50),
    description: String(p.description ?? '').slice(0, 300),
    ...(typeof p.replacesPlanId === 'string' && p.replacesPlanId ? { replacesPlanId: p.replacesPlanId } : {}),
    days: days.sort((a, b) => a.weekday - b.weekday),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  // Signed-in users only (the anon key alone is not enough).
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth?.user) return json({ error: 'sign_in_required' }, 401);

  // Daily limit, counted with the service role so users can't reset it.
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: used, error: usageError } = await admin.rpc('bump_ai_usage', { p_user: auth.user.id, p_limit: DAILY_LIMIT });
  if (usageError) return json({ error: 'usage_check_failed' }, 500);
  if (used === -1) return json({ error: 'daily_limit' }, 429);

  let body: { lang?: string; messages?: ChatTurn[]; context?: TrainerContext };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  // The API needs the conversation to start with the user.
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400);

  const ctx = body.context ?? ({ catalog: '' } as TrainerContext);
  const catalog = String(ctx.catalog ?? '').slice(0, 20000);
  const catalogIds = new Set(catalog.split('\n').map((l) => l.split('|')[0]).filter(Boolean));
  const userData = JSON.stringify({ lang: body.lang === 'pl' ? 'pl' : 'en', profile: ctx.profile, goals: ctx.goals, activePlan: ctx.activePlan, recent: ctx.recent }).slice(0, 20000);

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // On a safety decline the API retries on a suitable fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: SYSTEM },
        // Static per app version: cached across requests.
        { type: 'text', text: `Exercise catalog (id|muscle|equipment|tracking|name):\n${catalog}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `User data from the app (computed from their real logs):\n${userData}` },
      ],
      tools: [PROPOSE_PLAN],
      tool_choice: { type: 'auto' },
      messages: history,
    });

    if (response.stop_reason === 'refusal') return json({ text: '', plan: null, refused: true });

    let text = '';
    let plan: PlanProposal | null = null;
    for (const block of response.content) {
      if (block.type === 'text') text += block.text;
      else if (block.type === 'tool_use' && block.name === 'propose_plan' && !plan) plan = sanitizePlan(block.input, catalogIds);
    }
    return json({ text: text.trim(), plan });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (e instanceof Anthropic.APIError) {
      console.error('Claude API error', e.status, e.message);
      return json({ error: 'upstream' }, 502);
    }
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
});
