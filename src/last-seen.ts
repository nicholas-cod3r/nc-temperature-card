import type { CardConfig, HomeAssistant } from "./types.js";
import { getLocalize } from "./localization.js";
import { cardDefaults } from "./config.js";

const MINUTE_MS = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * 60;

export interface LastSeenInfo {
  text: string;
  status: "fresh" | "stale" | "unknown" | "unavailable";
}

export function lastSeenInfo(
  hass: HomeAssistant | undefined,
  config: CardConfig,
  now: number,
): LastSeenInfo | null {
  const mode = config.last_seen_mode ?? cardDefaults.lastSeenMode;
  if (mode === "off") {
    return null;
  }
  const localize = getLocalize(hass);

  const configuredEntities = mode === "temperature"
    ? [config.temperature]
    : [
      config.temperature,
      config.humidity,
      config.battery,
      ...(config.last_seen_entities ?? []),
    ];
  const entityIds = [...new Set(configuredEntities.filter((id): id is string => Boolean(id)))];
  const temperatureState = hass?.states?.[config.temperature];
  if (temperatureState?.state === "unavailable") {
    return { text: localize.lastSeen.unavailable, status: "unavailable" };
  }
  if (temperatureState?.state === "unknown") {
    return { text: localize.lastSeen.unknown, status: "unknown" };
  }

  const entities = entityIds.map((entityId) => hass?.states?.[entityId]);
  if (entities.length > 0 && entities.every((entity) => entity?.state === "unavailable")) {
    return { text: localize.lastSeen.unavailable, status: "unavailable" };
  }

  let latest: number | undefined;
  for (const entity of entities) {
    if (!entity || entity.state === "unavailable" || entity.state === "unknown") {
      continue;
    }
    const lastUpdated = entity.last_updated;
    if (typeof lastUpdated !== "string") {
      continue;
    }
    const timestamp = Date.parse(lastUpdated.trim());
    if (Number.isFinite(timestamp) && (latest == null || timestamp > latest)) {
      latest = timestamp;
    }
  }

  if (latest == null) {
    return { text: localize.lastSeen.unknown, status: "unknown" };
  }

  const elapsedMs = Math.max(0, now - latest);
  const minutes = Math.floor(elapsedMs / MINUTE_MS);
  const text = minutes < 1
    ? localize.lastSeen.lessThanMinute
    : minutes < MINUTES_PER_HOUR
      ? localize.lastSeen.minutesAgo.replace("{count}", String(minutes))
      : minutes < MINUTES_PER_DAY
        ? localize.lastSeen.hoursAgo.replace("{count}", String(Math.round(minutes / MINUTES_PER_HOUR)))
        : localize.lastSeen.daysAgo.replace("{count}", String(Math.floor(minutes / MINUTES_PER_DAY)));
  return {
    text,
    status: elapsedMs >= (config.last_seen_alert_minutes ?? cardDefaults.lastSeenAlertMinutes) * MINUTE_MS
      ? "stale"
      : "fresh",
  };
}
