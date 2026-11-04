import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type HostInstance } from 'react-native';

import { useStore } from '../../store';
import { colors } from '../../theme/tokens';

const HOLD_MS = 280;
const SLOP = 8;
/** Width of the drag handle at the row's left edge. */
const HANDLE = 52;

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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liftedRef = useRef(false);
  const target = useRef(index);
  const view = useRef<HostInstance>(null);
  const left = useRef(0);
  const onHandle = (pageX: number) => pageX - left.current <= HANDLE;

  // Keep the latest props for the responder, which is created once.
  const latest = useRef({ index, count, rowHeight, onLift, onHover, onDrop, haptics });
  useEffect(() => {
    latest.current = { index, count, rowHeight, onLift, onHover, onDrop, haptics };
  });

  useEffect(() => {
    // While dragging, neighbours glide out of the way; after the drop the list re-renders in its new order, so snap.
    if (animate) Animated.spring(offset, { toValue: shift, useNativeDriver: true, speed: 24, bounciness: 4 }).start();
    else offset.setValue(0);
  }, [shift, animate, offset]);

  // The responder is created once; its callbacks read refs only when a touch event fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const release = () => {
      clearTimeout(timer.current);
      if (!liftedRef.current) return;
      liftedRef.current = false;
      const { rowHeight: h } = latest.current;
      const to = target.current;
      Animated.spring(dy, { toValue: (to - latest.current.index) * h, useNativeDriver: true, speed: 28, bounciness: 0 }).start(() => {
        latest.current.onDrop(to);
        dy.setValue(0);
      });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
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
      onLayout={() => view.current?.measureInWindow((x) => (left.current = x))}
      {...responder.panHandlers}
      style={[
        { height: rowHeight, transform: [{ translateY: Animated.add(dy, offset) }, { scale: lifted ? 1.03 : 1 }] },
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
