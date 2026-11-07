import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { BodyPart } from 'react-native-body-highlighter';
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFemaleBack } from 'react-native-body-highlighter/dist/assets/bodyFemaleBack';
import { bodyFemaleFront } from 'react-native-body-highlighter/dist/assets/bodyFemaleFront';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';

import type { BodySex, Muscle } from '../../data/types';
import { useStore } from '../../store';
import { colors } from '../../theme/tokens';

// Anatomical figures (male/female, front/back) from react-native-body-highlighter (MIT).
// We only use its path data and draw it ourselves, so we can crop and colour it.

type View2 = 'front' | 'back';
type Slug = NonNullable<BodyPart['slug']>;

const FIGURES: Record<BodySex, Record<View2, { parts: BodyPart[]; full: string; upper: string; lower: string }>> = {
  male: {
    front: { parts: bodyFront, full: '0 60 724 1320', upper: '54 90 620 620', lower: '-1 615 730 730' },
    back: { parts: bodyBack, full: '724 60 724 1320', upper: '773 90 620 620', lower: '718 615 730 730' },
  },
  female: {
    front: { parts: bodyFemaleFront, full: '-40 -10 724 1460', upper: '-5 30 650 650', lower: '-45 600 730 730' },
    back: { parts: bodyFemaleBack, full: '780 -10 724 1460', upper: '817 30 650 650', lower: '777 600 730 730' },
  },
};

/** Our muscle groups -> the figure's regions. */
const SLUGS: Record<Muscle, Slug[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  core: ['abs', 'obliques'],
  quads: ['quadriceps', 'adductors'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
};

/** Head, hands, joints: never highlighted, drawn a shade darker than idle muscles. */
const BASE: Slug[] = ['head', 'hair', 'neck', 'hands', 'feet', 'ankles', 'knees'];

const TONE = {
  off: '#3A4855',
  base: '#26323D',
  primary: colors.accent,
  secondary: 'rgba(210,254,8,0.45)',
};

/** Muscles shown from behind: the small ring turns the figure round for these. */
const BACK_VIEW: Muscle[] = ['back', 'triceps', 'glutes', 'hamstrings', 'calves'];
const LOWER_BODY: Muscle[] = ['quads', 'glutes', 'hamstrings', 'calves'];

type Hit = { primary: Muscle; secondary: Muscle[] };

function fillMap({ primary, secondary }: Hit) {
  const m = new Map<Slug, string>();
  secondary.forEach((s) => SLUGS[s].forEach((slug) => m.set(slug, TONE.secondary)));
  SLUGS[primary].forEach((slug) => m.set(slug, TONE.primary));
  return m;
}

function Figure({ sex, view, hit }: { sex: BodySex; view: View2; hit: Hit }) {
  const fills = fillMap(hit);
  return (
    <G>
      {FIGURES[sex][view].parts.map((part) => {
        const slug = part.slug!;
        const fill = fills.get(slug) ?? (BASE.includes(slug) ? TONE.base : TONE.off);
        const paths = [...(part.path?.common ?? []), ...(part.path?.left ?? []), ...(part.path?.right ?? [])];
        return paths.map((d, i) => (
          <Path key={`${slug}-${i}`} d={d} fill={fill} stroke={colors.bg} strokeWidth={3} strokeLinejoin="round" />
        ));
      })}
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
  const w = height * 0.52;
  return (
    <View style={styles.pair}>
      {(['front', 'back'] as const).map((v) => (
        <Svg key={v} width={w} height={height} viewBox={FIGURES[sex][v].full} preserveAspectRatio="xMidYMid meet">
          <Figure sex={sex} view={v} hit={hit} />
        </Svg>
      ))}
    </View>
  );
}

/**
 * Small round badge: one side of the figure, zoomed on the upper or lower body,
 * whichever holds the primary muscle.
 */
export function MuscleRing({ primary, secondary, size }: Hit & { size: number }) {
  const sex = useBodySex();
  const view: View2 = BACK_VIEW.includes(primary) ? 'back' : 'front';
  const fig = FIGURES[sex][view];
  const inner = size - 4;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={inner} height={inner} viewBox={LOWER_BODY.includes(primary) ? fig.lower : fig.upper}>
        <Figure sex={sex} view={view} hit={{ primary, secondary }} />
      </Svg>
    </View>
  );
}

export const MUSCLE_TONE = TONE;

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 4 },
  ring: {
    backgroundColor: 'rgba(9,16,23,0.85)',
    borderWidth: 1.5,
    borderColor: colors.accentStroke,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
