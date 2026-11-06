import * as Haptics from 'expo-haptics';
import { createContext, useContext, type ComponentRef, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { CaretDoubleRightIcon, CheckIcon, LightningIcon } from '../components/icons';
import { useStore } from '../store';
import { colors, fonts, radius, space, type } from '../theme/tokens';

// ---------- haptics ----------

export function useHaptics() {
  const on = useStore((s) => s.settings.haptics) && Platform.OS !== 'web';
  return {
    select: () => on && Haptics.selectionAsync().catch(() => {}),
    tap: () => on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
    success: () => on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  };
}

// ---------- particles ----------

type Seed = { a: number; d: number; s: number; c: string };
type Burst = { id: number; x: number; y: number; v: Animated.Value; seeds: Seed[] };

const BurstContext = createContext<(x: number, y: number, big?: boolean) => void>(() => {});

/** Fire a particle burst at window coordinates (pageX / pageY of a press). */
export const useBurst = () => useContext(BurstContext);

export const burstAt = (fire: (x: number, y: number, big?: boolean) => void, e: GestureResponderEvent, big?: boolean) =>
  fire(e.nativeEvent.pageX, e.nativeEvent.pageY, big);

/** Full-screen overlay that draws short-lived lime particle bursts above everything. */
export function BurstLayer({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const fire = (x: number, y: number, big = false) => {
    const n = big ? 28 : 12;
    const seeds = Array.from({ length: n }, (_, i) => ({
      a: (i / n) * Math.PI * 2 + Math.random() * 0.6,
      d: (big ? 70 : 34) + Math.random() * (big ? 110 : 40),
      s: (big ? 5 : 3) + Math.random() * (big ? 6 : 4),
      c: Math.random() < 0.75 ? colors.accent : colors.textPrimary,
    }));
    const v = new Animated.Value(0);
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, x, y, v, seeds }]);
    Animated.timing(v, { toValue: 1, duration: big ? 900 : 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() =>
      setBursts((b) => b.filter((z) => z.id !== id)),
    );
  };
  return (
    <BurstContext.Provider value={fire}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bursts.map((b) =>
          b.seeds.map((p, i) => (
            <Animated.View
              key={`${b.id}-${i}`}
              style={{
                position: 'absolute',
                left: b.x - p.s / 2,
                top: b.y - p.s / 2,
                width: p.s,
                height: p.s,
                borderRadius: p.s / 2,
                backgroundColor: p.c,
                opacity: b.v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.85, 0] }),
                transform: [
                  { translateX: b.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) },
                  { translateY: b.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.d + 12] }) },
                  { scale: b.v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
                ],
              }}
            />
          )),
        )}
      </View>
    </BurstContext.Provider>
  );
}

// ---------- CTA that unlocks after a short read time ----------

/**
 * Primary button that "charges up" for `lockMs` after each new step (fill sweeps across),
 * so steps can't be tapped through blindly. Fires particles and a haptic on press.
 */
export function ChargeButton({
  label,
  onPress,
  disabled,
  lockMs = 1100,
  resetKey,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  lockMs?: number;
  resetKey: string;
}) {
  const fire = useBurst();
  const h = useHaptics();
  const [fill] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));
  // Ready once the fill for the current step has finished.
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [w, setW] = useState(0);
  const ready = readyKey === resetKey;

  useEffect(() => {
    fill.setValue(0);
    const anim = Animated.timing(fill, { toValue: 1, duration: lockMs, easing: Easing.inOut(Easing.quad), useNativeDriver: false });
    anim.start(({ finished }) => {
      if (!finished) return;
      setReadyKey(resetKey);
      Animated.sequence([
        Animated.timing(press, { toValue: 1.04, duration: 120, useNativeDriver: true }),
        Animated.spring(press, { toValue: 1, damping: 9, stiffness: 220, useNativeDriver: true }),
      ]).start();
    });
    return () => anim.stop();
  }, [fill, press, lockMs, resetKey]);

  const active = ready && !disabled;
  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !active }}
        disabled={!active}
        onPressIn={() => Animated.spring(press, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true, damping: 10 }).start()}
        onPress={(e) => {
          burstAt(fire, e);
          h.tap();
          onPress();
        }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={[styles.cta, disabled && ready && { opacity: 0.4 }]}
      >
        {/* Light label on the empty track; the dark one is revealed as the fill sweeps over it. */}
        <Text style={[styles.ctaLabel, { color: colors.textPrimary, opacity: 0.7 }]}>{label}</Text>
        <Animated.View
          style={[styles.ctaFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        >
          <View style={[styles.ctaInner, { width: w }]}>
            <Text style={styles.ctaLabel}>{label}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ---------- hold to commit ----------

const HOLD_SIZE = 112;

/** Press and hold the circle; the ring fills, then it bursts and calls onDone (Flo / Alma pattern). */
export function HoldToCommit({ label, onDone }: { label: string; onDone: () => void }) {
  const fire = useBurst();
  const h = useHaptics();
  const [p] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const center = useRef<ComponentRef<typeof View>>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = p.addListener(({ value }) => setPct(value));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      p.removeListener(id);
      loop.stop();
      if (tick.current) clearInterval(tick.current);
    };
  }, [p, pulse]);

  const start = () => {
    if (done) return;
    h.select();
    tick.current = setInterval(() => h.select(), 260);
    Animated.timing(p, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (tick.current) clearInterval(tick.current);
      if (!finished) return;
      setDone(true);
      h.success();
      center.current?.measureInWindow((x, y, w, hh) => fire(x + w / 2, y + hh / 2, true));
      setTimeout(onDone, 750);
    });
  };
  const cancel = () => {
    if (done) return;
    if (tick.current) clearInterval(tick.current);
    p.stopAnimation();
    Animated.timing(p, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  };

  const r = (HOLD_SIZE - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.holdWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.holdPulse,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={start}
        onPressOut={cancel}
        style={{ width: HOLD_SIZE, height: HOLD_SIZE, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={HOLD_SIZE} height={HOLD_SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={HOLD_SIZE / 2} cy={HOLD_SIZE / 2} r={r} stroke={colors.track} strokeWidth={6} fill="none" />
          <Circle
            cx={HOLD_SIZE / 2}
            cy={HOLD_SIZE / 2}
            r={r}
            stroke={colors.accent}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - pct)}
            transform={`rotate(-90 ${HOLD_SIZE / 2} ${HOLD_SIZE / 2})`}
          />
        </Svg>
        <View ref={center} style={styles.holdCenter}>
        <Animated.View
          style={[
            styles.holdCore,
            { transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }] },
            done && { backgroundColor: colors.success },
          ]}
        >
          {done ? (
            <CheckIcon size={44} color={colors.textOnAccent} weight="bold" />
          ) : (
            <LightningIcon size={44} color={colors.textOnAccent} weight="fill" />
          )}
        </Animated.View>
        </View>
      </Pressable>
      <Text style={styles.holdLabel}>{label}</Text>
    </View>
  );
}

// ---------- slide to continue ----------

const KNOB = 52;

/** Drag the knob to the end to continue; springs back if released early. */
export function SlideToContinue({ label, onDone }: { label: string; onDone: () => void }) {
  const fire = useBurst();
  const h = useHaptics();
  const [x] = useState(() => new Animated.Value(0));
  const [shimmer] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const max = Math.max(0, width - KNOB - 8);
  const track = useRef<ComponentRef<typeof View>>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // JS driver on purpose: the label opacity multiplies this with the knob position (`x`, JS-driven),
    // and one native animation in that graph would move `x` to native and crash the drag on device.
    const loop = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const startX = useRef(0);
  const maxRef = useRef(max);
  useEffect(() => {
    maxRef.current = max;
  }, [max]);

  function finish(dx: number) {
    if (doneRef.current) return;
    const m = maxRef.current;
    if (m > 0 && dx >= m * 0.82) {
      doneRef.current = true;
      Animated.timing(x, { toValue: m, duration: 120, useNativeDriver: false }).start(() => {
        h.success();
        track.current?.measureInWindow((tx, ty, tw, th) => fire(tx + tw - KNOB / 2 - 4, ty + th / 2, true));
        setTimeout(() => onDoneRef.current(), 380);
      });
    } else {
      Animated.spring(x, { toValue: 0, damping: 14, stiffness: 180, useNativeDriver: false }).start();
    }
  }

  const clamped = max > 0 ? x.interpolate({ inputRange: [0, max], outputRange: [0, max], extrapolate: 'clamp' }) : x;
  return (
    <View ref={track} style={styles.slideTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[styles.slideFill, { width: Animated.add(clamped, KNOB + 4) }]}
      />
      <Animated.Text
        style={[
          styles.slideLabel,
          {
            opacity: Animated.multiply(
              shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] }),
              max > 0 ? x.interpolate({ inputRange: [0, max * 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) : 1,
            ),
          },
        ]}
      >
        {label}
      </Animated.Text>
      <Animated.View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          startX.current = e.nativeEvent.pageX;
          h.select();
        }}
        onResponderMove={(e) => x.setValue(Math.max(0, e.nativeEvent.pageX - startX.current))}
        onResponderRelease={(e) => finish(e.nativeEvent.pageX - startX.current)}
        onResponderTerminate={(e) => finish(e.nativeEvent.pageX - startX.current)}
        style={[styles.knob, { transform: [{ translateX: clamped }] }]}>
        <CaretDoubleRightIcon size={24} color={colors.textOnAccent} weight="bold" />
      </Animated.View>
    </View>
  );
}

// ---------- welcome hero: crossfading photos with a slow zoom ----------

export function HeroSlides({ photos, interval = 4200 }: { photos: ImageSourcePropType[]; interval?: number }) {
  const [vals] = useState(() => photos.map((_, i) => ({ o: new Animated.Value(i === 0 ? 1 : 0), s: new Animated.Value(1) })));
  const [active, setActive] = useState(0);

  useEffect(() => {
    const zoom = Animated.timing(vals[active].s, { toValue: 1.14, duration: interval + 1400, easing: Easing.linear, useNativeDriver: true });
    vals[active].s.setValue(1);
    zoom.start();
    const t = setTimeout(() => {
      const next = (active + 1) % photos.length;
      vals[next].s.setValue(1);
      Animated.parallel([
        Animated.timing(vals[active].o, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(vals[next].o, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
      setActive(next);
    }, interval);
    return () => clearTimeout(t);
  }, [active, vals, interval, photos.length]);

  return (
    <>
      {photos.map((src, i) => (
        <Animated.Image
          key={i}
          source={src}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: vals[i].o, transform: [{ scale: vals[i].s }] }]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cta: {
    height: 56,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(210,254,8,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.accent, overflow: 'hidden' },
  ctaInner: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { ...type.button, color: colors.textOnAccent },

  holdWrap: { alignItems: 'center', gap: space.sm, paddingTop: space.md },
  holdPulse: {
    position: 'absolute',
    top: space.md,
    width: HOLD_SIZE,
    height: HOLD_SIZE,
    borderRadius: HOLD_SIZE / 2,
    backgroundColor: colors.accent,
  },
  holdCore: {
    width: HOLD_SIZE - 28,
    height: HOLD_SIZE - 28,
    borderRadius: (HOLD_SIZE - 28) / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdCenter: { alignItems: 'center', justifyContent: 'center' },
  holdLabel: { ...type.body, color: colors.textSecondary },

  slideTrack: {
    height: KNOB + 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill, backgroundColor: 'rgba(210,254,8,0.16)' },
  slideLabel: { ...type.button, fontFamily: fonts.medium, color: colors.textPrimary, textAlign: 'center', paddingLeft: KNOB },
  knob: {
    position: 'absolute',
    left: 4,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
