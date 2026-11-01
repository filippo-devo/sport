import { useMemo } from 'react';

import { PROGRAMS, ROUTINES } from '../data/programs';
import type { Program, Routine } from '../data/types';
import { findProgram, getProgram, getRoutine } from './derived';
import { useStore } from './index';

// Built-in and user-made workouts/plans behind one lookup.

export function useRoutine(id: string | undefined): Routine | undefined {
  const custom = useStore((s) => s.routines);
  return getRoutine(id, custom);
}

export function useProgramById(id: string | undefined): Program | undefined {
  const custom = useStore((s) => s.programs);
  return findProgram(id, custom);
}

export function useActiveProgram(): Program {
  const id = useStore((s) => s.activeProgramId);
  const custom = useStore((s) => s.programs);
  return useMemo(() => getProgram(id, custom), [id, custom]);
}

/** Every routine the user can put into a plan: their own first, then the built-in ones. */
export function useAllRoutines(): Routine[] {
  const custom = useStore((s) => s.routines);
  return useMemo(() => [...custom, ...ROUTINES], [custom]);
}

export function useAllPrograms(): { mine: Program[]; builtin: Program[] } {
  const custom = useStore((s) => s.programs);
  return useMemo(() => ({ mine: custom, builtin: PROGRAMS }), [custom]);
}
