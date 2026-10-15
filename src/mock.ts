const MOCK_INTERVAL_MS = 5 * 60 * 1000;
const MOCK_DAY_MS = 24 * 60 * 60 * 1000;
const MOCK_VARIATION_INTERVAL_MS = 4 * 60 * 60 * 1000;

function mockRandom(seed: number): number {
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = (seed ^ (seed >>> 16)) >>> 0;
  return seed / 0xffffffff;
}

function mockVariation(slot: number): number {
  return (mockRandom(slot) * 2 - 1) * 0.4;
}

function mockDrift(time: number): number {
  const position = time / MOCK_VARIATION_INTERVAL_MS;
  const slot = Math.floor(position);
  const progress = position - slot;
  const progressSquared = progress * progress;
  const progressCubed = progressSquared * progress;
  const previous = mockVariation(slot - 1);
  const current = mockVariation(slot);
  const next = mockVariation(slot + 1);
  const following = mockVariation(slot + 2);
  return 0.5 * (
    2 * current
    + (-previous + next) * progress
    + (2 * previous - 5 * current + 4 * next - following) * progressSquared
    + (-previous + 3 * current - 3 * next + following) * progressCubed
  );
}

function mockLocalHour(time: number): number {
  const date = new Date(time);
  return date.getHours()
    + date.getMinutes() / 60
    + date.getSeconds() / 3600
    + date.getMilliseconds() / 3600000;
}

function mockDailyTemperature(time: number): number {
  const hour = mockLocalHour(time);
  const warming = hour >= 5 && hour < 15;
  const progress = warming ? (hour - 5) / 10 : (hour >= 15 ? hour - 15 : hour + 9) / 14;
  const cycle = warming
    ? (1 - Math.cos(Math.PI * progress)) / 2
    : (1 + Math.cos(Math.PI * progress)) / 2;
  return 20 + (cycle * 2 - 1) * 3;
}

function mockWeather(time: number): number {
  const date = new Date(time);
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MOCK_DAY_MS);
  const hour = mockLocalHour(time);
  let effect = 0;
  for (let index = 0; index < 3; index += 1) {
    const seed = day * 31 + index * 7;
    const center = index === 0
      ? 8 + mockRandom(seed + 1) * 5
      : index === 1
        ? 13 + mockRandom(seed + 1) * 5
        : 8 + mockRandom(seed + 1) * 10;
    const width = 0.6 + mockRandom(seed + 2) * 0.9;
    const strength = 0.35 + mockRandom(seed + 3) * 0.55;
    const sunny = index === 0 || (index === 2 && mockRandom(seed + 4) >= 0.5);
    const distance = (hour - center) / width;
    effect += (sunny ? 1 : -1) * strength * Math.exp(-0.5 * distance * distance);
  }
  return effect;
}

export function mockStatistics(entityId: string, startTime: number, hours: number): Record<string, Array<{ start: string; mean: number }>> {
  const windowMs = hours * 60 * 60 * 1000;
  const endTime = startTime + windowMs;
  const pointCount = Math.ceil(windowMs / MOCK_INTERVAL_MS);
  const rows = [];
  for (let index = 0; index <= pointCount; index += 1) {
    const time = Math.min(startTime + index * MOCK_INTERVAL_MS, endTime);
    rows.push({
      start: new Date(time).toISOString(),
      mean: mockDailyTemperature(time) + mockDrift(time) + mockWeather(time),
    });
  }
  return { [entityId]: rows };
}

export function mockHistoryEnabled(config: CardConfig | undefined): boolean {
  return config?.mock_history === true || typeof config?.mock_history === "number";
}

export function isValidMockHistory(value: unknown): boolean {
  return typeof value === "boolean"
    || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23);
}
import type { CardConfig } from "./types.js";
