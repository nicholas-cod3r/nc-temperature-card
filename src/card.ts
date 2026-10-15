import { LitElement, html, nothing, svg } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { property, state } from "lit/decorators.js";
import { cardDefaults, isEntityId, validateConfig } from "./config.js";
import { cardStyles } from "./card.styles.js";
import { CARD_EDITOR_TAG } from "./config-editor.js";
import { GraphHistoryController } from "./graph-history-controller.js";
import { graphRange } from "./graph-data.js";
import { graphLayout } from "./graph-renderer.js";
import type { GraphExtreme, GraphSegment } from "./graph-renderer.js";
import { lastSeenInfo } from "./last-seen.js";
import { batteryIcon, batteryLevel, entityName, entityState, formatEntity } from "./sensors.js";
import type { CardConfig, GraphPoint, HomeAssistant } from "./types.js";

const LAST_SEEN_REFRESH_MS = 60 * 1000;

export class NcTemperatureCard extends LitElement {
  static styles = cardStyles;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: CardConfig;
  @state() private _points?: GraphPoint[];
  @state() private _size = { width: 0, height: 0 };
  @state() private _lastSeenTick = 0;

  private _lastSeenTimer?: number;
  private _resizeObserver?: ResizeObserver;
  private _displaySnapshot?: { name: string; values: Map<string, string>; language?: string };

  constructor() {
    super();
    new GraphHistoryController(
      this,
      () => ({ hass: this.hass, config: this._config }),
      (points) => {
        this._points = points;
      },
    );
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const states = hass?.states || {};
    const temperature = Object.keys(states).find((entityId) => {
      return states[entityId]?.attributes?.device_class === "temperature" && isEntityId(entityId);
    });
    return {
      temperature: temperature || "sensor.temperature",
      ...cardDefaults.toConfig(),
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement(CARD_EDITOR_TAG);
  }

  setConfig(config: unknown): void {
    validateConfig(config);
    this._config = config;
  }

  getCardSize(): number {
    return 2;
  }

  getGridOptions() {
    return {
      rows: 2,
      columns: 12,
      min_rows: 2,
      min_columns: 5,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._watchSize();
    this._syncLastSeenTimer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._lastSeenTimer);
    this._lastSeenTimer = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  protected shouldUpdate(changedProperties: PropertyValues<this>): boolean {
    const changed = changedProperties as unknown as ReadonlyMap<PropertyKey, unknown>;
    if (changed.has("_config") || changed.has("_lastSeenTick")
      || changed.has("_points") || changed.has("_size")) {
      return true;
    }
    if (!changed.has("hass")) {
      return false;
    }
    const previousHass = changed.get("hass") as HomeAssistant | undefined;
    const config = this._config;
    if (!previousHass || !config || previousHass.locale !== this.hass?.locale
      || previousHass.locale?.language !== this.hass?.locale?.language
      || Boolean(previousHass.themes?.darkMode) !== Boolean(this.hass?.themes?.darkMode)
      || Boolean(previousHass.formatEntityState) !== Boolean(this.hass?.formatEntityState)) {
      return true;
    }
    const entityIds = [
      config.temperature,
      config.humidity,
      config.battery,
      ...(config.last_seen_entities ?? []),
    ];
    if (entityIds.some((entityId) => entityId && previousHass.states?.[entityId] !== this.hass?.states?.[entityId])) {
      return true;
    }
    const snapshot = this._displaySnapshot;
    return !snapshot
      || snapshot.language !== this.hass?.locale?.language
      || snapshot.name !== entityName(this.hass, config)
      || entityIds.some((entityId) => entityId && snapshot.values.get(entityId) !== formatEntity(this.hass, entityId));
  }

  protected updated(): void {
    this._watchSize();
    const config = this._config;
    if (config) {
      const values = new Map<string, string>();
      for (const entityId of [config.temperature, config.humidity, config.battery]) {
        if (entityId) {
          values.set(entityId, formatEntity(this.hass, entityId));
        }
      }
      this._displaySnapshot = {
        name: entityName(this.hass, config),
        values,
        language: this.hass?.locale?.language,
      };
    } else {
      this._displaySnapshot = undefined;
    }
    this._syncLastSeenTimer();
  }

  protected render(): TemplateResult {
    const config = this._config;
    if (!config) {
      return html`${nothing}`;
    }

    const hass = this.hass;
    const temperatureState = entityState(hass, config.temperature);
    const formattedTemperature = formatEntity(hass, config.temperature);
    const temperatureUnit = temperatureState?.attributes?.unit_of_measurement;
    const level = batteryLevel(hass, config);
    const lastSeen = lastSeenInfo(hass, config, Date.now());
    const lastSeenAlert = lastSeen?.status === "stale" || lastSeen?.status === "unavailable";
    const configuredGraphColor = config.graph_color ?? cardDefaults.graphColor;
    const graphColor = `var(--${configuredGraphColor.toLowerCase()}-color)`;
    const { segments, min, max } = graphLayout(
      this._size.width,
      this._size.height,
      this._points,
      graphRange(config, Date.now()),
    );
    const showMinMax = config.show_min_max ?? cardDefaults.showMinMax;

    return html`
      <ha-card>
        <div class=${classMap({ wrap: true, dark: Boolean(hass?.themes?.darkMode) })}>
          <div class="chart">
            <svg viewBox=${`0 0 ${this._size.width} ${this._size.height}`} preserveAspectRatio="none">
              <defs>
                <linearGradient
                  id="graph-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2=${this._size.height}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stop-color=${graphColor} stop-opacity="0.3"></stop>
                  <stop offset="100%" stop-color=${graphColor} stop-opacity="0"></stop>
                </linearGradient>
              </defs>
              ${segments.map((segment) => this._renderGraphSegment(segment, graphColor))}
              ${showMinMax ? this._renderExtremeDots(min, max, graphColor) : nothing}
            </svg>
          </div>
          <div class="panel">
            <div class="panel-heading">
              <div class="name">${entityName(hass, config)}</div>
              ${lastSeen
                ? html`<div class="last-seen ${lastSeenAlert ? "stale" : ""}">${lastSeen.text}</div>`
                : nothing}
            </div>
            ${config.battery
              ? html`
                  <div class="chip panel-battery" @click=${() => this._openMoreInfo(config.battery)}>
                    <ha-icon
                      class=${level != null && level < 5 ? "low-battery" : ""}
                      .icon=${batteryIcon(level)}
                      .hass=${hass}
                    ></ha-icon>
                    <span>${formatEntity(hass, config.battery)}</span>
                  </div>
                `
              : nothing}
          </div>
          <div class="chart-wrap">
            <div class="overlay">
              <div class="temp" @click=${() => this._openMoreInfo(config.temperature)}>
                ${this._renderValue(formattedTemperature, temperatureUnit, "unit")}
              </div>
              <div class="chips">
                ${config.humidity
                  ? html`
                      <div class="chip humidity-chip" @click=${() => this._openMoreInfo(config.humidity)}>
                        <ha-icon .icon=${"mdi:water-percent"} .hass=${hass}></ha-icon>
                        <span>
                          ${this._renderValue(
                            formatEntity(hass, config.humidity),
                            entityState(hass, config.humidity)?.attributes?.unit_of_measurement,
                            "humidity-unit",
                          )}
                        </span>
                      </div>
                    `
                  : nothing}
              </div>
            </div>
          </div>
          ${showMinMax && min && max
            ? html`
                <div class="graph-extremes">
                  <span class="graph-extreme max">${max.value.toFixed(1)}</span>
                  <span class="graph-extreme min">${min.value.toFixed(1)}</span>
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _renderValue(formatted: string, unit: string | undefined, unitClass: string): TemplateResult | string {
    const unitStart = unit ? formatted.lastIndexOf(unit) : -1;
    if (unit && unitStart >= 0 && !formatted.slice(unitStart + unit.length).trim()) {
      return html`
        <span>${formatted.slice(0, unitStart).trimEnd()}</span>
        <span class=${unitClass}>${unit}</span>
      `;
    }
    return formatted;
  }

  private _renderGraphSegment(segment: GraphSegment, color: string): TemplateResult {
    if (segment.dot) {
      return svg`
        <circle
          cx=${segment.dot.x.toFixed(2)}
          cy=${segment.dot.y.toFixed(2)}
          r="1.5"
          fill=${color}
        ></circle>
      `;
    }
    return svg`
      <path d=${segment.fillPath || ""} fill="url(#graph-fill)" stroke="none"></path>
      <path
        d=${segment.linePath || ""}
        fill="none"
        stroke=${color}
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      ></path>
    `;
  }

  private _renderExtremeDots(
    min: GraphExtreme | undefined,
    max: GraphExtreme | undefined,
    color: string,
  ): TemplateResult | typeof nothing {
    if (!min || !max) {
      return nothing;
    }
    return svg`
      <circle
        class="extreme-dot"
        cx=${min.x.toFixed(2)}
        cy=${min.y.toFixed(2)}
        r="3"
        fill=${color}
      ></circle>
      <circle
        class="extreme-dot"
        cx=${max.x.toFixed(2)}
        cy=${max.y.toFixed(2)}
        r="3"
        fill=${color}
      ></circle>
    `;
  }

  private _watchSize(): void {
    if (this._resizeObserver) {
      return;
    }
    const graph = this.renderRoot.querySelector<SVGSVGElement>(".chart svg");
    if (!graph) {
      return;
    }
    this._resizeObserver = new ResizeObserver(() => {
      const bounds = graph.getBoundingClientRect();
      const size = { width: bounds.width, height: bounds.height };
      if (size.width !== this._size.width || size.height !== this._size.height) {
        this._size = size;
      }
    });
    this._resizeObserver.observe(graph);
  }

  private _syncLastSeenTimer(): void {
    const enabled = this.isConnected
      && this._config != null
      && (this._config.last_seen_mode ?? cardDefaults.lastSeenMode) !== "off";
    if (enabled && this._lastSeenTimer == null) {
      this._lastSeenTimer = window.setInterval(() => {
        this._lastSeenTick += 1;
      }, LAST_SEEN_REFRESH_MS);
    } else if (!enabled && this._lastSeenTimer != null) {
      window.clearInterval(this._lastSeenTimer);
      this._lastSeenTimer = undefined;
    }
  }

  private _openMoreInfo(entityId: string | null | undefined): void {
    if (!entityId) {
      return;
    }
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }));
  }

}
