import { isValidMockHistory } from "./mock.js";
import type { CardConfig } from "./types.js";

export const cardDefaults = {
  hoursToShow: 24,
  graphColor: "orange",
  showMinMax: true,
  lastSeenMode: "configured" as const,
  lastSeenAlertMinutes: 180,
  toConfig() {
    return {
      hours_to_show: this.hoursToShow,
      graph_color: this.graphColor,
      show_min_max: this.showMinMax,
      last_seen_mode: this.lastSeenMode,
      last_seen_alert_minutes: this.lastSeenAlertMinutes,
    };
  },
} as const;

export function isEntityId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z0-9_]+$/.test(value);
}

export function hoursOf(config: Pick<CardConfig, "hours_to_show"> | undefined): number {
  if (config?.hours_to_show == null) {
    return cardDefaults.hoursToShow;
  }
  return Number(config.hours_to_show);
}

export function validateConfig(config: unknown): asserts config is CardConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Configuration is required");
  }
  const value = config as Record<string, unknown>;
  if (!isEntityId(value.temperature)) {
    throw new Error("A temperature entity is required");
  }
  const humidity = typeof value.humidity === "string" && value.humidity.trim() !== "" ? value.humidity : (value.humidity || null);
  if (humidity != null && !isEntityId(humidity)) {
    throw new Error("humidity must be an entity id");
  }
  const battery = typeof value.battery === "string" && value.battery.trim() !== "" ? value.battery : (value.battery || null);
  if (battery != null && !isEntityId(battery)) {
    throw new Error("battery must be an entity id");
  }
  if (value.last_seen_entities != null
    && (!Array.isArray(value.last_seen_entities) || !value.last_seen_entities.every(isEntityId))) {
    throw new Error("last_seen_entities must be an array of entity ids");
  }
  if (value.hours_to_show != null) {
    const hours = typeof value.hours_to_show === "number"
      ? value.hours_to_show
      : typeof value.hours_to_show === "string" && value.hours_to_show.trim() !== ""
        ? Number(value.hours_to_show)
        : NaN;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
      throw new Error("hours_to_show must be greater than 0 and at most 168");
    }
  }
  if (value.graph_color != null
    && (typeof value.graph_color !== "string" || value.graph_color.trim() === "")) {
    throw new Error("graph_color must be a non-empty string");
  }
  if (value.show_min_max != null && typeof value.show_min_max !== "boolean") {
    throw new Error("show_min_max must be a boolean");
  }
  if (value.last_seen_mode != null && value.last_seen_mode !== "off"
    && value.last_seen_mode !== "temperature" && value.last_seen_mode !== "configured") {
    throw new Error("last_seen_mode must be off, temperature, or configured");
  }
  if (value.last_seen_alert_minutes != null
    && (typeof value.last_seen_alert_minutes !== "number"
      || !Number.isInteger(value.last_seen_alert_minutes)
      || value.last_seen_alert_minutes < 1)) {
    throw new Error("last_seen_alert_minutes must be a positive whole number");
  }
  if (value.mock_history != null && !isValidMockHistory(value.mock_history)) {
    throw new Error("mock_history must be true, false, or an hour from 0 to 23");
  }
}
