import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '../../theme/tokens';

export type Point = { x: number; y: number };

type AxisLabel = { x: number; label: string };

function useWidth(initial = 300) {
  const [w, setW] = useState(initial);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
}

function niceRange(min: number, max: number) {
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.15;
  return [min - pad, max + pad];
}

type LineProps = {
  points: Point[];
  height?: number;
  color?: string;
  xLabels?: AxisLabel[];
  format?: (v: number) => string;
  /** Optional horizontal reference (e.g. goal weight). */
  reference?: { y: number; label: string };
  id: string;
};

/** Line + area chart: faint grid, min/max labels, emphasised last point. */
export function LineChart({ points, height = 150, color = colors.accent, xLabels = [], format = (v) => String(Math.round(v)), reference, id }: LineProps) {
  const [width, onLayout] = useWidth();
  const padL = 4;
  const padR = 44;
  const padT = 12;
  const padB = 22;
  if (points.length < 2) return <View style={{ height }} onLayout={onLayout} />;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y).concat(reference ? [reference.y] : []);
  const [y0, y1] = niceRange(Math.min(...ys), Math.max(...ys));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const sx = (x: number) => padL + ((x - x0) / (x1 - x0 || 1)) * (width - padL - padR);
  const sy = (y: number) => padT + (1 - (y - y0) / (y1 - y0)) * (height - padT - padB);

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${sx(x1).toFixed(1)},${height - padB} L${sx(x0).toFixed(1)},${height - padB} Z`;
  const last = points[points.length - 1];
  const gridYs = [y0 + (y1 - y0) * 0.2, y0 + (y1 - y0) * 0.5, y0 + (y1 - y0) * 0.8];

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {gridYs.map((gy) => (
          <Line key={gy} x1={padL} x2={width - padR} y1={sy(gy)} y2={sy(gy)} stroke={colors.hairline} strokeWidth={1} />
        ))}
        {gridYs.map((gy) => (
          <SvgText key={`l${gy}`} x={width - padR + 6} y={sy(gy) + 4} fill={colors.textSecondary} fontSize={11} fontFamily={fonts.medium}>
            {format(gy)}
          </SvgText>
        ))}
        {reference && (
          <>
            <Line x1={padL} x2={width - padR} y1={sy(reference.y)} y2={sy(reference.y)} stroke={colors.success} strokeDasharray="4 4" strokeWidth={1.2} />
            <SvgText x={padL + 2} y={sy(reference.y) - 5} fill={colors.success} fontSize={11} fontFamily={fonts.semibold}>
              {reference.label}
            </SvgText>
          </>
        )}
        <Path d={area} fill={`url(#area-${id})`} />
        <Path d={d} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={sx(last.x)} cy={sy(last.y)} r={5} fill={colors.bg} stroke={color} strokeWidth={2.5} />
        {xLabels.map((l) => (
          <SvgText
            key={l.x}
            x={Math.min(Math.max(sx(l.x), padL + 12), width - padR - 12)}
            y={height - 5}
            fill={colors.textSecondary}
            fontSize={11}
            fontFamily={fonts.medium}
            textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

type BarProps = {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  /** Bars at or above the goal use `color`; below use a muted tone. Draws a dashed goal line. */
  goal?: number;
  highlightLast?: boolean;
  format?: (v: number) => string;
};

export function BarChart({ values, labels = [], height = 140, color = colors.accent, goal, highlightLast = true, format = (v) => String(Math.round(v)) }: BarProps) {
  const [width, onLayout] = useWidth();
  const padR = 40;
  const padT = 10;
  const padB = labels.length ? 22 : 4;
  const max = Math.max(...values, goal ?? 0, 1) * 1.1;
  const n = values.length;
  const slot = (width - padR) / Math.max(n, 1);
  const barW = Math.max(4, Math.min(22, slot * 0.58));
  const sy = (v: number) => padT + (1 - v / max) * (height - padT - padB);
  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={width} height={height}>
        {[0.5, 1].map((f) => (
          <Line key={f} x1={0} x2={width - padR} y1={sy(max * f / 1.1)} y2={sy(max * f / 1.1)} stroke={colors.hairline} />
        ))}
        <SvgText x={width - padR + 6} y={sy(max / 1.1) + 4} fill={colors.textSecondary} fontSize={11} fontFamily={fonts.medium}>
          {format(max / 1.1)}
        </SvgText>
        {values.map((v, i) => {
          const x = i * slot + (slot - barW) / 2;
          const muted = goal != null ? v < goal * 0.9 || v > goal * 1.1 : highlightLast && i !== n - 1;
          const fill = v === 0 ? colors.track : muted ? 'rgba(219,253,82,0.38)' : color;
          const h = Math.max(v > 0 ? 3 : 2, height - padB - sy(v));
          return <Rect key={i} x={x} y={height - padB - h} width={barW} height={h} rx={Math.min(4, barW / 2)} fill={fill} />;
        })}
        {goal != null && (
          <Line x1={0} x2={width - padR} y1={sy(goal)} y2={sy(goal)} stroke={colors.success} strokeDasharray="4 4" strokeWidth={1.2} />
        )}
        {labels.map((l, i) =>
          l ? (
            <SvgText key={i} x={i * slot + slot / 2} y={height - 5} fill={colors.textSecondary} fontSize={11} fontFamily={fonts.medium} textAnchor="middle">
              {l}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

/** Headline number + caption shown above a chart. */
export function ChartHeadline({ value, caption, delta, deltaGood }: { value: string; caption?: string; delta?: string; deltaGood?: boolean }) {
  return (
    <View style={styles.headline}>
      <Text style={styles.value}>{value}</Text>
      {delta ? <Text style={[styles.delta, { color: deltaGood ? colors.success : colors.textSecondary }]}>{delta}</Text> : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8 },
  value: { fontFamily: fonts.bold, fontSize: 26, color: colors.textPrimary },
  delta: { fontFamily: fonts.semibold, fontSize: 14 },
  caption: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, width: '100%' },
});
