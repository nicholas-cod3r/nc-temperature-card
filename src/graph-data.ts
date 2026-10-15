import { hoursOf } from "./config.js";
import { mockHistoryEnabled, mockStatistics } from "./mock.js";
import { numericValue } from "./values.js";
import type { CardConfig, GraphPoint, HomeAssistant } from "./types.js";

export const HISTORY_LIMIT = 300;
export const GAP_MS = 15 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTime(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value !== "string") {
    return NaN;
  }
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function rowsFor(result: unknown, entityId: string): unknown[] {
  if (!result) {
    return [];
  }
  if (Array.isArray(result)) {
    if (result.length && Array.isArray(result[0])) {
      const match = result.find((row: unknown[]) => row.some((item) => isRecord(item) && item.entity_id === entityId));
      return match || result[0] || [];
    }
    return result;
  }
  if (isRecord(result)) {
    if (Array.isArray(result[entityId])) {
      return result[entityId];
    }
    const values = Object.values(result);
    if (values.length === 1 && Array.isArray(values[0])) {
      return values[0];
    }
  }
  return [];
}

function normalizeStatistics(result: unknown, entityId: string): GraphPoint[] {
  const points: GraphPoint[] = [];
  for (const row of rowsFor(result, entityId)) {
    if (!isRecord(row)) {
      continue;
    }
    const value = numericValue(row.mean);
    const time = parseTime(row.start ?? row.start_time);
    if (value == null || !Number.isFinite(time)) {
      continue;
    }
    points.push({ time, value });
  }
  points.sort((a, b) => a.time - b.time);
  return points;
}

function normalizeHistory(result: unknown, entityId: string): GraphPoint[] {
  const points: GraphPoint[] = [];
  for (const row of rowsFor(result, entityId)) {
    if (!isRecord(row)) {
      continue;
    }
    if (row.entity_id && row.entity_id !== entityId) {
      continue;
    }
    const value = numericValue(row.s ?? row.state);
    const time = parseTime(row.lu ?? row.last_updated ?? row.last_changed ?? row.lc);
    if (value == null || !Number.isFinite(time)) {
      continue;
    }
    points.push({ time, value });
  }
  points.sort((a, b) => a.time - b.time);
  return points;
}

function thinPoints(points: GraphPoint[]): GraphPoint[] {
  if (points.length <= HISTORY_LIMIT) {
    return points;
  }
  const must = new Set([0, points.length - 1]);
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].time - points[index - 1].time > GAP_MS) {
      must.add(index - 1);
      must.add(index);
    }
  }
  const chosen = new Set(must);
  const optional = [];
  for (let index = 0; index < points.length; index += 1) {
    if (!must.has(index)) {
      optional.push(index);
    }
  }
  const budget = Math.max(0, HISTORY_LIMIT - must.size);
  if (optional.length <= budget) {
    optional.forEach((index) => chosen.add(index));
  } else if (budget > 0) {
    const step = (optional.length - 1) / (budget - 1 || 1);
    for (let index = 0; index < budget; index += 1) {
      chosen.add(optional[Math.round(index * step)]);
    }
  }
  return [...chosen]
    .sort((a, b) => a - b)
    .slice(0, HISTORY_LIMIT)
    .map((index) => points[index]);
}

export function graphRange(config: CardConfig | undefined, now: number): { start: number; end: number } {
  const duration = hoursOf(config) * 60 * 60 * 1000;
  if (typeof config?.mock_history === "number") {
    const date = new Date(now);
    date.setHours(config.mock_history, 0, 0, 0);
    const start = date.getTime();
    return { start, end: start + duration };
  }
  return { start: now - duration, end: now };
}

export async function loadGraphData(
  hass: HomeAssistant,
  config: CardConfig,
  isCurrent: () => boolean,
): Promise<GraphPoint[] | null> {
  const entityId = config.temperature;
  const range = graphRange(config, Date.now());
  const start = new Date(range.start);
  const end = new Date(range.end);
  let points: GraphPoint[] | null = null;
  if (mockHistoryEnabled(config)) {
    points = normalizeStatistics(mockStatistics(entityId, range.start, hoursOf(config)), entityId);
  } else {
    const callWS = hass.callWS;
    if (!callWS) {
      return null;
    }
    try {
      const statistics = await callWS.call(hass, {
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: [entityId],
        period: "5minute",
        types: ["mean"],
      });
      if (!isCurrent()) {
        return null;
      }
      points = normalizeStatistics(statistics, entityId);
    } catch {
      points = null;
    }
    if (!points || !points.length) {
      try {
        const history = await callWS.call(hass, {
          type: "history/history_during_period",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          entity_ids: [entityId],
          minimal_response: true,
          no_attributes: true,
        });
        if (!isCurrent()) {
          return null;
        }
        points = thinPoints(normalizeHistory(history, entityId));
      } catch {
        if (!isCurrent() || (points && points.length)) {
          return null;
        }
        return null;
      }
    }
  }
  return isCurrent() ? points : null;
}
