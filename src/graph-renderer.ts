import { GAP_MS } from "./graph-data.js";
import type { GraphPoint } from "./types.js";

export interface GraphSegment {
  dot?: { x: number; y: number };
  fillPath?: string;
  linePath?: string;
}

export interface GraphExtreme {
  value: number;
  x: number;
  y: number;
}

export interface GraphLayout {
  segments: GraphSegment[];
  min?: GraphExtreme;
  max?: GraphExtreme;
}

export function graphLayout(
  width: number,
  height: number,
  points: GraphPoint[] | undefined,
  range: { start: number; end: number },
): GraphLayout {
  if (!points?.length || width < 20 || height < 20) {
    return { segments: [] };
  }

  const pad = 8;
  const { start, end } = range;
  const span = end - start || 1;
  const visible = points.filter((point) => point.time >= start && point.time <= end);
  if (!visible.length) {
    return { segments: [] };
  }

  let minPoint = visible[0];
  let maxPoint = visible[0];
  for (const point of visible) {
    if (point.value < minPoint.value) {
      minPoint = point;
    }
    if (point.value > maxPoint.value) {
      maxPoint = point;
    }
  }

  let min = minPoint.value;
  let max = maxPoint.value;
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  } else {
    const padding = (max - min) * 0.12;
    min -= padding;
    max += padding;
  }
  const ySpan = max - min || 1;
  const xOf = (time: number) => ((time - start) / span) * width;
  const yOf = (value: number) => pad + (1 - (value - min) / ySpan) * (height - pad * 2);

  const parts: GraphPoint[][] = [];
  let part: GraphPoint[] = [];
  for (const point of visible) {
    if (part.length && point.time - part[part.length - 1].time > GAP_MS) {
      parts.push(part);
      part = [];
    }
    part.push(point);
  }
  if (part.length) {
    parts.push(part);
  }

  const segments = parts.map((segment, index) => {
    if (segment.length === 1) {
      return { dot: { x: xOf(segment[0].time), y: yOf(segment[0].value) } };
    }

    let linePath = "";
    let fillPath = "";
    segment.forEach((point, pointIndex) => {
      const command = pointIndex === 0 ? "M" : "L";
      const pair = `${xOf(point.time).toFixed(2)} ${yOf(point.value).toFixed(2)}`;
      linePath += `${command}${pair}`;
      fillPath += `${command}${pair}`;
    });
    const x0 = xOf(segment[0].time).toFixed(2);
    const x1 = xOf(segment[segment.length - 1].time).toFixed(2);
    const lastPoint = segment[segment.length - 1];
    const extendsToRight = index === parts.length - 1 && end - lastPoint.time <= GAP_MS;
    const fillRight = width + 1;
    const fillBottom = height + 1;
    if (extendsToRight) {
      fillPath += `L${fillRight} ${yOf(lastPoint.value).toFixed(2)}L${fillRight} ${fillBottom}`;
    } else {
      fillPath += `L${x1} ${fillBottom}`;
    }
    fillPath += `L${x0} ${fillBottom}Z`;
    return { fillPath, linePath };
  });

  return {
    segments,
    min: { value: minPoint.value, x: xOf(minPoint.time), y: yOf(minPoint.value) },
    max: { value: maxPoint.value, x: xOf(maxPoint.time), y: yOf(maxPoint.value) },
  };
}
