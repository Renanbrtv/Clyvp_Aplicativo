import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { theme, useThemeMode, createThemedStyles } from '../../../shared/theme';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

/**
 * Mini grafico do card de destaque.
 * Recebe os totais reais por semana vindos da API - se o mes ainda nao teve
 * venda, a linha fica reta na base, que e a informacao correta.
 */
export function Sparkline({
  values,
  width = 130,
  height = 56,
  color = theme.colors.onPrimary,
  fillOpacity = 0.22,
}: SparklineProps) {
  useThemeMode();
  const series = values.length >= 2 ? values : [0, 0];
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;

  const stepX = width / (series.length - 1);
  const points = series.map((value, index) => {
    const x = index * stepX;
    const y = height - ((value - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  // Curva suave usando Bezier entre os pontos.
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const controlX = (previous.x + current.x) / 2;
    line += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
  }

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <View pointerEvents="none">
      <Svg width={width} height={height}>
        <Path d={area} fill={color} fillOpacity={fillOpacity} />
        <Path d={line} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}
