export interface CardConfig {
  temperature: string;
  name?: string;
  humidity?: string | null;
  battery?: string | null;
  last_seen_entities?: string[];
  hours_to_show?: number | string;
  graph_color?: string;
  show_min_max?: boolean;
  last_seen_mode?: "off" | "temperature" | "configured";
  last_seen_alert_minutes?: number;
  mock_history?: boolean | number;
}

export interface HassEntity {
  entity_id?: string;
  state: string;
  last_updated?: string;
  attributes?: {
    device_class?: string;
    friendly_name?: string;
    unit_of_measurement?: string;
    [key: string]: unknown;
  };
}

export interface HomeAssistant {
  states?: Record<string, HassEntity | undefined>;
  locale?: {
    language?: string;
  };
  themes?: {
    darkMode?: boolean;
    [key: string]: unknown;
  };
  formatEntityState?: (entity: HassEntity) => string;
  callWS?: (message: Record<string, unknown>) => Promise<unknown>;
}

export interface GraphPoint {
  time: number;
  value: number;
}
