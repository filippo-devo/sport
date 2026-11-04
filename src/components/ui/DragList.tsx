import * as Haptics from 'expo-haptics';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type HostInstance } from 'react-native';

import { useStore } from '../../store';
import { colors } from '../../theme/tokens';

const HOLD_MS = 280;
const SLOP = 8;
/** Width of the drag handle at the row's left edge. */
const HANDLE = 52;
/** Width of the trailing control (switch) that must stay tappable. */
const CONTROL = 76;

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  /** Every row has this height, so the drop position follows from the drag distance. */
  rowHeight: number;
  renderRow: (item: T, dragging: boolean) => ReactNode;
  onReorder: (items: T[]) => void;
  /** Called with true while a row is lifted, so the parent can stop its scroll view. */
  onDragChange?: (dragging: boolean) => void;
};

/**
 * Press-and-hold to lift a row, then drag it to a new place (iOS list reordering).
 * Built on PanResponder + Animated, so it needs no extra native module and ships over the air.
 */
export function DragList<T>({ items, keyOf, rowHeight, renderRow, onReorder, onDragChange }: Props<T>) {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const shift = (i: number) => {
    if (active == null || hover == null || i === active) return 0;
    if (active < i && i <= hover) return -rowHeight;
    if (hover <= i && i < active) return rowHeight;
    return 0;
  };

  return (
    <View>
      {items.map((item, i) => (
        <Row
          key={keyOf(item)}
          index={i}
          count={items.length}
          rowHeight={rowHeight}
          shift={shift(i)}
          animate={active != null}
          lifted={active === i}
          onLift={() => {
            setActive(i);
            setHover(i);
            onDragChange?.(true);
          }}
          onHover={setHover}
          onDrop={(to) => {
            setActive(null);
            setHover(null);
            onDragChange?.(false);
            if (to !== i) {
              const next = [...items];
              const [moved] = next.splice(i, 1);
              next.splice(to, 0, moved);
              onReorder(next);
            }
          }}
        >
          {renderRow(item, active === i)}
        </Row>
      ))}
    </View>
  );
}

type RowProps = {
  index: number;
  count: number;
  rowHeight: number;
  shift: number;
  animate: boolean;
  lifted: boolean;
  onLift: () => void;
  onHover: (i: number) => void;
  onDrop: (to: number) => void;
  children: ReactNode;
};

function Row({ index, count, rowHeight, shift, animate, lifted, onLift, onHover, onDrop, children }: RowProps) {
  const haptics = useStore((s) => s.settings.haptics);
  const [dy] = useState(() => new Animated.Value(0));
  const [offset] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => Animated.add(dy, offset));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liftedRef = useRef(false);
  const target = useRef(index);
  const view = useRef<HostInstance>(null);
  const left = useRef(0);
  const width = useRef(0);
  const onHandle = (pageX: number) => pageX - left.current <= HANDLE;
  // The switch sits at the right edge: touches there toggle it and never start a drag.
  const onControl = (pageX: number) => width.current > 0 && pageX - left.current >= width.current - CONTROL;

  // Keep the latest props for the responder, which is created once.
  const latest = useRef({ index, count, rowHeight, onLift, onHover, onDrop, haptics });
  useEffect(() => {
    latest.current = { index, count, rowHeight, onLift, onHover, onDrop, haptics };
  });

  useEffect(() => {
    // While a row is lifted, neighbours glide out of the way.
    if (animate) Animated.spring(offset, { toValue: shift, useNativeDriver: false, speed: 26, bounciness: 0 }).start();
  }, [shift, animate, offset]);

  // After the drop the list re-renders in its new order: clear every offset before that frame is painted,
  // so no row is drawn shifted twice (that showed up as gaps and jumping switches).
  useLayoutEffect(() => {
    if (animate) return;
    offset.stopAnimation();
    offset.setValue(0);
    dy.stopAnimation();
    dy.setValue(0);
  }, [index, animate, offset, dy]);

  // The responder is created once; its callbacks read refs only when a touch event fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const release = () => {
      clearTimeout(timer.current);
      if (!liftedRef.current) return;
      liftedRef.current = false;
      const { rowHeight: h } = latest.current;
      const to = target.current;
      Animated.timing(dy, { toValue: (to - latest.current.index) * h, duration: 120, useNativeDriver: false }).start(() => latest.current.onDrop(to));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: (e) => !onControl(e.nativeEvent.pageX),
      onMoveShouldSetPanResponder: () => liftedRef.current,
      // Before the row is lifted, let the scroll view take the gesture.
      onPanResponderTerminationRequest: () => !liftedRef.current,
      // A touch on the handle (left edge) owns the gesture outright, so neither the scroll view
      // nor a native sheet gesture can take it; elsewhere the scroll view keeps working until the row lifts.
      onShouldBlockNativeResponder: (e) => onHandle(e.nativeEvent.pageX),
      onPanResponderGrant: (e) => {
        target.current = latest.current.index;
        const lift = () => {
          liftedRef.current = true;
          latest.current.onLift();
          if (latest.current.haptics && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        };
        if (onHandle(e.nativeEvent.pageX)) lift();
        else timer.current = setTimeout(lift, HOLD_MS);
      },
      onPanResponderMove: (_, g) => {
        if (!liftedRef.current) {
          if (Math.abs(g.dy) > SLOP || Math.abs(g.dx) > SLOP) clearTimeout(timer.current);
          return;
        }
        const { index: i, count: n, rowHeight: h } = latest.current;
        const min = -i * h;
        const max = (n - 1 - i) * h;
        const y = Math.max(min, Math.min(max, g.dy));
        dy.setValue(y);
        const to = Math.max(0, Math.min(n - 1, i + Math.round(y / h)));
        if (to !== target.current) {
          target.current = to;
          latest.current.onHover(to);
          if (latest.current.haptics && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        }
      },
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    });
  });

  return (
    <Animated.View
      ref={view}
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width;
        view.current?.measureInWindow((x) => (left.current = x));
      }}
      {...responder.panHandlers}
      style={[
        { height: rowHeight, justifyContent: 'center', transform: [{ translateY }] },
        lifted && styles.lifted,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lifted: {
    zIndex: 10,
    elevation: 8,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
});
