import { numericValue } from "./values.js";
import type { CardConfig, HassEntity, HomeAssistant } from "./types.js";

export function entityState(hass: HomeAssistant | undefined, entityId: string | null | undefined): HassEntity | undefined {
  return entityId ? hass?.states?.[entityId] : undefined;
}

export function formatEntity(hass: HomeAssistant | undefined, entityId: string): string {
  const stateObj = hass?.states?.[entityId];
  if (!stateObj || numericValue(stateObj.state) == null) {
    return "—";
  }
  if (typeof hass.formatEntityState === "function") {
    return hass.formatEntityState(stateObj);
  }
  const unit = stateObj.attributes?.unit_of_measurement;
  return unit ? `${stateObj.state} ${unit}` : stateObj.state;
}

export function entityName(hass: HomeAssistant | undefined, config: CardConfig): string {
  const temperature = entityState(hass, config.temperature);
  const friendlyName = temperature?.attributes?.friendly_name;
  return config.name || (typeof friendlyName === "string" ? friendlyName : config.temperature);
}

export function batteryIcon(level: number | null): string {
  if (level == null) {
    return "mdi:battery";
  }
  if (level <= 10) {
    return "mdi:battery-alert";
  }
  if (level <= 20) {
    return "mdi:battery-20";
  }
  if (level <= 50) {
    return "mdi:battery-50";
  }
  if (level <= 80) {
    return "mdi:battery-80";
  }
  return "mdi:battery";
}

export function batteryLevel(hass: HomeAssistant | undefined, config: CardConfig): number | null {
  return numericValue(entityState(hass, config.battery)?.state);
}
