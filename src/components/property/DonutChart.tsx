import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { sizes, useTheme } from '@/theme';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: readonly DonutSegment[];
  size?: number;
  strokeWidth?: number;
  /** Содержимое в центре кольца (например, ежемесячный платёж) */
  children?: ReactNode;
  accessibilityLabel?: string;
}

/** Кольцевая диаграмма на react-native-svg: сегменты идут по часовой стрелке от 12 часов. */
export function DonutChart({ segments, size = sizes.donut, strokeWidth = sizes.donutStroke, children, accessibilityLabel }: DonutChartProps) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = total > 0 ? (Math.max(segment.value, 0) / total) * circumference : 0;
    const arc = { key: segment.key, color: segment.color, length, offset };
    offset += length;
    return arc;
  });

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={center} originY={center}>
          <Circle cx={center} cy={center} r={radius} stroke={colors.surfacePressed} strokeWidth={strokeWidth} fill="none" />
          {arcs.map((arc) =>
            arc.length > 0 ? (
              <Circle
                key={arc.key}
                cx={center}
                cy={center}
                r={radius}
                stroke={arc.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                strokeDashoffset={-arc.offset}
              />
            ) : null,
          )}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
