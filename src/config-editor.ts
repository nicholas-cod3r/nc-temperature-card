import { LitElement, css, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { cardDefaults } from "./config.js";
import { getLocalize } from "./localization.js";
import type { HomeAssistant } from "./types.js";

export const CARD_EDITOR_TAG = "nc-temperature-card-editor";

declare const __CARD_VERSION__: string;

interface FormSchema {
  name: string;
  selector: Record<string, unknown>;
}

type CardEditorConfig = Record<string, unknown>;

export class NcTemperatureCardEditor extends LitElement {
  static styles = css`
    .version {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-xs, 12px);
      line-height: 1.5;
      padding-top: 8px;
      text-align: right;
    }
  `;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: CardEditorConfig;

  setConfig(config: CardEditorConfig): void {
    this._config = {
      ...config,
      hours_to_show: config.hours_to_show ?? cardDefaults.hoursToShow,
      show_min_max: config.show_min_max ?? cardDefaults.showMinMax,
      last_seen_mode: config.last_seen_mode ?? cardDefaults.lastSeenMode,
      last_seen_alert_minutes: config.last_seen_alert_minutes ?? cardDefaults.lastSeenAlertMinutes,
      last_seen_entities: config.last_seen_entities ?? [],
    };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html`${nothing}`;
    }

    const localize = getLocalize(this.hass);
    const labels = {
      name: localize.form.name,
      temperature: localize.form.temperature,
      humidity: localize.form.humidity,
      battery: localize.form.battery,
      last_seen_entities: localize.form.lastSeenEntities,
      hours_to_show: localize.form.hoursToShow,
      graph_color: localize.form.graphColor,
      show_min_max: localize.form.showMinMax,
      last_seen_mode: localize.form.lastSeenMode,
      last_seen_alert_minutes: localize.form.lastSeenAlertMinutes,
    };
    const schema: FormSchema[] = [
      { name: "name", selector: { text: {} } },
      { name: "temperature", selector: { entity: { device_class: "temperature" } } },
      { name: "humidity", selector: { entity: { device_class: "humidity" } } },
      { name: "battery", selector: { entity: { device_class: "battery" } } },
      {
        name: "hours_to_show",
        selector: { number: { min: 1, max: 168, step: 1, mode: "slider", unit_of_measurement: "h" } },
      },
      {
        name: "graph_color",
        selector: { ui_color: { default_color: cardDefaults.graphColor } },
      },
      {
        name: "show_min_max",
        selector: { boolean: {} },
      },
      {
        name: "last_seen_mode",
        selector: {
          select: {
            options: [
              { label: localize.form.options.off, value: "off" },
              { label: localize.form.options.temperature, value: "temperature" },
              { label: localize.form.options.configured, value: "configured" },
            ],
            mode: "dropdown",
          },
        },
      },
      ...(this._config.last_seen_mode === "configured"
        ? [{ name: "last_seen_entities", selector: { entity: { multiple: true } } }]
        : []),
      {
        name: "last_seen_alert_minutes",
        selector: { number: { min: 1, step: 1, mode: "box", unit_of_measurement: localize.form.minutesUnit } },
      },
    ];
    const computeLabel = (field: FormSchema) => labels[field.name as keyof typeof labels];
    const computeHelper = (field: FormSchema) => field.name === "graph_color"
      ? localize.form.graphColorHelper
      : field.name === "show_min_max"
        ? localize.form.showMinMaxHelper
        : field.name === "last_seen_entities"
          ? localize.form.lastSeenEntitiesHelper
          : undefined;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${computeLabel}
        .computeHelper=${computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="version">v${__CARD_VERSION__}</div>
    `;
  }

  private _valueChanged(event: CustomEvent<{ value: CardEditorConfig }>): void {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      detail: { config: event.detail.value },
    }));
  }
}
