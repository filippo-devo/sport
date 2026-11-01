// Coach <-> client sync (only when signed in and connected to at least one coach):
//  - the client's logged workouts are mirrored to `workouts` so coaches see live stats;
//  - plans coaches assign (`coach_plans`) are kept as local plans and follow the coach's edits.
// Everything else stays on the device.

import { useEffect } from 'react';

import { applyPlan } from '../ai/apply';
import type { PlanProposal } from '../ai/types';
import type { Program, Routine, Session } from '../data/types';
import { useStore } from '../store';
import { doneSets, sessionVolume } from '../store/derived';
import { useSession } from './auth';
import { supabase } from './supabase';

export type CoachPlanPayload = { program: Program; routines: Routine[]; sourceProgramId?: string };
export type CoachPlanRow = { id: string; coach_id: string; client_id: string; name: string; description: string; payload: CoachPlanPayload; updated_at: string };

/** Converts a coach plan (app Program + Routines) into a proposal the local store can apply. */
export function payloadToProposal(row: CoachPlanRow): PlanProposal {
  const byId = new Map(row.payload.routines.map((r) => [r.id, r]));
  return {
    name: row.name,
    description: row.description,
    days: row.payload.program.schedule
      .map((rid, weekday) => {
        const r = rid ? byId.get(rid) : undefined;
        return r ? { weekday, name: r.name.en || r.name.pl, items: r.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets, target: i.target, restSec: i.restSec, ...(i.weight ? { weightKg: i.weight } : {}) })) } : null;
      })
      .filter((d): d is NonNullable<typeof d> => !!d),
  };
}

const workoutRow = (userId: string, s: Session) => ({
  id: s.id,
  user_id: userId,
  started_at: new Date(s.startedAt).toISOString(),
  ended_at: new Date(s.endedAt).toISOString(),
  name: s.name.en || s.name.pl,
  volume_kg: Math.round(sessionVolume(s)),
  sets_done: doneSets(s.exercises),
  payload: s,
});

async function hasCoach(userId: string) {
  const { count } = await supabase!.from('coach_clients').select('coach_id', { count: 'exact', head: true }).eq('client_id', userId);
  return (count ?? 0) > 0;
}

/** Uploads workouts missing on the server and removes ones deleted on the phone. */
export async function syncWorkouts(userId: string) {
  if (!supabase || !(await hasCoach(userId))) return;
  const local = useStore.getState().sessions;
  const { data, error } = await supabase.from('workouts').select('id').eq('user_id', userId);
  if (error) return;
  const remote = new Set((data ?? []).map((r: { id: string }) => r.id));
  const localIds = new Set(local.map((s) => s.id));
  const missing = local.filter((s) => !remote.has(s.id)).map((s) => workoutRow(userId, s));
  for (let i = 0; i < missing.length; i += 100) await supabase.from('workouts').upsert(missing.slice(i, i + 100));
  const gone = [...remote].filter((id) => !localIds.has(id));
  if (gone.length) await supabase.from('workouts').delete().eq('user_id', userId).in('id', gone);
}

/** Mirrors the plans coaches assigned to this user into local plans (source 'coach'). */
export async function syncCoachPlans(userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from('coach_plans').select('*').eq('client_id', userId);
  if (error) return;
  const rows = (data ?? []) as CoachPlanRow[];
  const s = useStore.getState();
  const links = { ...s.coachPlanLinks };
  for (const row of rows) {
    const link = links[row.id];
    const localExists = link && s.programs.some((p) => p.id === link.localId);
    if (localExists && link.updatedAt === row.updated_at) continue;
    const localId = applyPlan(payloadToProposal(row), { source: 'coach', activate: false, existingId: localExists ? link.localId : undefined });
    links[row.id] = { localId, updatedAt: row.updated_at };
  }
  // Plans the coach removed disappear locally too.
  for (const [remoteId, link] of Object.entries(links)) {
    if (rows.some((r) => r.id === remoteId)) continue;
    if (useStore.getState().programs.some((p) => p.id === link.localId)) useStore.getState().deleteProgram(link.localId);
    delete links[remoteId];
  }
  useStore.getState().setCoachPlanLinks(links);
}

/** Mounted once at the root. */
export function useCoachSync() {
  const { session } = useSession();
  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        syncWorkouts(userId).catch(() => {});
        syncCoachPlans(userId).catch(() => {});
      }, 1500);
    };
    run();
    const unsub = useStore.subscribe((st, prev) => {
      if (st.sessions !== prev.sessions) run();
    });
    const channel = supabase
      .channel(`client-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_plans', filter: `client_id=eq.${userId}` }, run)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_clients', filter: `client_id=eq.${userId}` }, run)
      .subscribe();
    return () => {
      clearTimeout(timer);
      unsub();
      supabase!.removeChannel(channel);
    };
  }, [userId]);
}
