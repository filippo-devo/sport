// Personal-trainer features on Supabase: coach mode, client links, assigned plans, client workouts.

import type { Program, Routine, Session } from '../data/types';
import { getRoutine } from '../store/derived';
import type { CoachPlanPayload, CoachPlanRow } from './sync';
import { supabase } from './supabase';

export type Person = { id: string; name: string; since: string };

function db() {
  if (!supabase) throw new Error('not_configured');
  return supabase;
}

async function me() {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error('sign_in_required');
  return data.user.id;
}

/** Turns coach mode on (returns the invite code) or off. */
export async function setCoachMode(on: boolean): Promise<string | null> {
  const { data, error } = await db().rpc('set_coach', { p_on: on });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function updateDisplayName(name: string) {
  const id = await me();
  const { error } = await db().from('profiles').update({ display_name: name.trim() }).eq('id', id);
  if (error) throw error;
}

/** Client side: connect to a coach with their invite code. */
export async function joinCoach(code: string) {
  const { error } = await db().rpc('join_coach', { p_code: code });
  if (error) throw new Error(error.message.includes('own_code') ? 'own_code' : 'invalid_code');
}

type LinkRow = { coach_id: string; client_id: string; created_at: string; coach?: { display_name: string } | null; client?: { display_name: string } | null };

export async function myCoaches(): Promise<Person[]> {
  const id = await me();
  const { data, error } = await db()
    .from('coach_clients')
    .select('coach_id, client_id, created_at, coach:profiles!coach_clients_coach_id_fkey(display_name)')
    .eq('client_id', id);
  if (error) throw error;
  return ((data ?? []) as unknown as LinkRow[]).map((r) => ({ id: r.coach_id, name: r.coach?.display_name ?? '—', since: r.created_at }));
}

export async function myClients(): Promise<Person[]> {
  const id = await me();
  const { data, error } = await db()
    .from('coach_clients')
    .select('coach_id, client_id, created_at, client:profiles!coach_clients_client_id_fkey(display_name)')
    .eq('coach_id', id);
  if (error) throw error;
  return ((data ?? []) as unknown as LinkRow[]).map((r) => ({ id: r.client_id, name: r.client?.display_name ?? '—', since: r.created_at }));
}

export async function disconnect(coachId: string, clientId: string) {
  const { error } = await db().from('coach_clients').delete().eq('coach_id', coachId).eq('client_id', clientId);
  if (error) throw error;
}

/** Workouts of the given clients since a date, as app Session objects keyed by user. */
export async function clientWorkouts(clientIds: string[], since: Date): Promise<Record<string, Session[]>> {
  const out: Record<string, Session[]> = Object.fromEntries(clientIds.map((c) => [c, []]));
  if (!clientIds.length) return out;
  const { data, error } = await db()
    .from('workouts')
    .select('user_id, payload')
    .in('user_id', clientIds)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  for (const r of (data ?? []) as { user_id: string; payload: Session }[]) out[r.user_id]?.push(r.payload);
  return out;
}

export async function clientPlans(clientId: string): Promise<CoachPlanRow[]> {
  const id = await me();
  const { data, error } = await db().from('coach_plans').select('*').eq('coach_id', id).eq('client_id', clientId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CoachPlanRow[];
}

/**
 * Assigns one of the coach's own plans to a client. Assigning the same plan again updates the
 * client's copy (their app picks the change up live).
 */
export async function assignPlan(clientId: string, program: Program, routines: Routine[], lang: 'en' | 'pl') {
  const coachId = await me();
  const used = program.schedule.map((r) => getRoutine(r, routines)).filter((r): r is Routine => !!r);
  const payload: CoachPlanPayload = { program, routines: used, sourceProgramId: program.id };
  const row = { coach_id: coachId, client_id: clientId, name: program.name[lang], description: program.description[lang], payload, updated_at: new Date().toISOString() };
  const existing = (await clientPlans(clientId)).find((p) => p.payload?.sourceProgramId === program.id);
  const { error } = existing ? await db().from('coach_plans').update(row).eq('id', existing.id) : await db().from('coach_plans').insert(row);
  if (error) throw error;
}

export async function deleteAssignedPlan(id: string) {
  const { error } = await db().from('coach_plans').delete().eq('id', id);
  if (error) throw error;
}
