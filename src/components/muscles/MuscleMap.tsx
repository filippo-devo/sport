import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import type { BodySex, Muscle } from '../../data/types';
import { useStore } from '../../store';
import { colors } from '../../theme/tokens';

// Hand-drawn anatomy chart. Each region is one side of the body (x >= 0) on a figure
// centred on x = 0, 200 units tall; the other side is the mirror image. `part` picks
// the width scale: the female figure has narrower shoulders and wider hips.
type Region = [Muscle, string, 'u' | 'l'];

const ARM_UPPER = 'M20,52 C26,52 28,62 26,73 C23,75 20,73 19,69 C18,62 18,56 20,52 Z';
const ARM_LOWER = 'M19,77 C26,77 28,88 25,103 L21,103 C19,94 18,86 19,77 Z';
const DELT = 'M14,33 C22,31 28,37 27,50 C24,50 20,47 15,44 C13,40 13,36 14,33 Z';

const FRONT: Region[] = [
  ['shoulders', DELT, 'u'],
  ['chest', 'M2,36 L14,36 C19,40 19,50 15,55 C10,58 4,57 2,55 Z', 'u'],
  ['biceps', ARM_UPPER, 'u'],
  ['forearms', ARM_LOWER, 'u'],
  ['core', 'M1.2,59 L7.5,59 L7.5,69 L1.2,69 Z M1.2,71 L7.5,71 L7.5,81 L1.2,81 Z M1.2,83 L7.5,83 L7.5,95 L1.2,97 Z', 'u'],
  ['core', 'M9.5,59 C14,61 16,70 15,82 C14.5,90 12,96 9.5,98 Z', 'u'],
  ['quads', 'M3,104 C10,101 17,103 17,112 C18,126 16,140 13,150 L7,150 C4,140 2,124 3,104 Z', 'l'],
  ['calves', 'M6,160 C10,158 15,160 14,172 C13,182 12,189 11,193 L8,193 C6,186 5,172 6,160 Z', 'l'],
];

const BACK: Region[] = [
  ['back', 'M0.8,26 L5,27 L15,34 L10,40 L5,50 L0.8,62 Z', 'u'],
  ['shoulders', DELT, 'u'],
  ['back', 'M6.5,52 L11.5,41.5 C16,44 18,50 17,60 C15,70 11,78 3,84 L2.5,66 Z', 'u'],
  ['back', 'M1,86 L7,82 L8.5,97 L1,98 Z', 'u'],
  ['triceps', ARM_UPPER, 'u'],
  ['forearms', ARM_LOWER, 'u'],
  ['glutes', 'M1,100 C10,98 17,102 17,112 C17,120 12,124 6,124 C3,124 1,122 1,120 Z', 'l'],
  ['hamstrings', 'M3,126 C9,126 16,126 16,132 C16,142 14,150 12,154 L6,154 C4,146 3,136 3,126 Z', 'l'],
  ['calves', 'M5,158 C11,156 16,160 15,172 C14,180 12,186 11,190 L7,190 C5,180 4,168 5,158 Z', 'l'],
];

// Neck, hands, knees and feet: never highlighted.
const JOINTS: [string, 'n' | 'u' | 'l'][] = [
  ['M3.5,24 L3.5,32 L-3.5,32 L-3.5,24 Z', 'n'],
  ['M23,104 C26,104 27,110 25,115 C23,117 21,115 20.5,111 C20.5,107 21,104 23,104 Z', 'u'],
  ['M7,152 C11,151 14,153 13,157 C12,159 8,159 7,157 Z', 'l'],
  ['M8,195 C11,194 14,196 13,198.5 C11,200 8,200 7,198.5 Z', 'l'],
];

const HAIR: Record<BodySex, string> = {
  male: 'M-8.5,11 C-8.5,3 8.5,3 8.5,11 C6,8 -6,8 -8.5,11 Z',
  female: 'M-9,12 C-9,2 9,2 9,12 C10,20 9,26 12,30 C6,30 4,26 4,22 L-4,22 C-4,26 -6,30 -12,30 C-9,26 -10,20 -9,12 Z',
};

const SCALE: Record<BodySex, { n: number; u: number; l: number }> = {
  male: { n: 1, u: 1, l: 1 },
  female: { n: 1, u: 0.88, l: 1.1 },
};

const TONE = {
  off: '#2A3540',
  joint: '#1E2832',
  primary: colors.accent,
  secondary: 'rgba(210,254,8,0.42)',
};

/** Muscles shown from behind: the small ring turns the figure round for these. */
const BACK_VIEW: Muscle[] = ['back', 'triceps', 'glutes', 'hamstrings', 'calves'];
const LOWER_BODY: Muscle[] = ['quads', 'glutes', 'hamstrings', 'calves'];

type Hit = { primary: Muscle; secondary: Muscle[] };

function fillFor(m: Muscle, hit: Hit) {
  if (m === hit.primary) return TONE.primary;
  if (hit.secondary.includes(m)) return TONE.secondary;
  return TONE.off;
}

function Figure({ view, sex, hit }: { view: 'front' | 'back'; sex: BodySex; hit: Hit }) {
  const k = SCALE[sex];
  const regions = view === 'front' ? FRONT : BACK;
  return (
    <G>
      <Ellipse cx={0} cy={13} rx={8} ry={10} fill={TONE.off} />
      <Path d={HAIR[sex]} fill={TONE.joint} />
      {[1, -1].map((dir) => (
        <G key={dir}>
          {regions.map(([m, d, part], i) => (
            <Path key={i} d={d} fill={fillFor(m, hit)} transform={`scale(${dir * k[part]},1)`} />
          ))}
          {JOINTS.map(([d, part], i) => (
            <Path key={`j${i}`} d={d} fill={TONE.joint} transform={`scale(${dir * k[part]},1)`} />
          ))}
        </G>
      ))}
    </G>
  );
}

/** The user's pick in Profile settings; male until they choose. */
export function useBodySex(): BodySex {
  return useStore((s) => s.settings.bodySex ?? 'male');
}

/** Front and back side by side, for the exercise detail screen. */
export function MuscleBody({ primary, secondary, height }: Hit & { height: number }) {
  const sex = useBodySex();
  const hit = { primary, secondary };
  return (
    <Svg width={(height * 140) / 204} height={height} viewBox="0 0 140 204">
      <G transform="translate(35,2)">
        <Figure view="front" sex={sex} hit={hit} />
      </G>
      <G transform="translate(105,2)">
        <Figure view="back" sex={sex} hit={hit} />
      </G>
    </Svg>
  );
}

/**
 * Small round badge: one side of the figure, zoomed on the upper or lower body,
 * whichever holds the primary muscle.
 */
export function MuscleRing({ primary, secondary, size }: Hit & { size: number }) {
  const sex = useBodySex();
  const view = BACK_VIEW.includes(primary) ? 'back' : 'front';
  const viewBox = LOWER_BODY.includes(primary) ? '-50 98 100 100' : '-50 4 100 100';
  const inner = size - 4;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={inner} height={inner} viewBox={viewBox}>
        <Figure view={view} sex={sex} hit={{ primary, secondary }} />
      </Svg>
    </View>
  );
}

export const MUSCLE_TONE = TONE;

const styles = StyleSheet.create({
  ring: {
    backgroundColor: 'rgba(9,16,23,0.85)',
    borderWidth: 1.5,
    borderColor: colors.accentStroke,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
