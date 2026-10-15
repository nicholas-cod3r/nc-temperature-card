import { NcTemperatureCard } from "./card.js";
import { CARD_EDITOR_TAG, NcTemperatureCardEditor } from "./config-editor.js";
import { cardDefaults } from "./config.js";
import type { HomeAssistant } from "./types.js";

const CARD_TYPE = "nc-temperature-card";

if (!customElements.get(CARD_EDITOR_TAG)) {
  customElements.define(CARD_EDITOR_TAG, NcTemperatureCardEditor);
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, NcTemperatureCard);
}

type CustomCardEntry = {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  getEntitySuggestion?: (hass: HomeAssistant, entityId: string) => { config: Record<string, unknown> } | null;
};

const cardWindow = window as Window & { customCards?: CustomCardEntry[] };
cardWindow.customCards = cardWindow.customCards || [];
if (!cardWindow.customCards.some((card) => card.type === CARD_TYPE)) {
  cardWindow.customCards.push({
    type: CARD_TYPE,
    name: "NC Temperature",
    description: "Temperature graph with humidity and battery.",
    preview: true,
    getEntitySuggestion: (hass, entityId) => {
      if (hass.states?.[entityId]?.attributes?.device_class !== "temperature") {
        return null;
      }

      return {
        config: {
          type: `custom:${CARD_TYPE}`,
          temperature: entityId,
          ...cardDefaults.toConfig(),
        },
      };
    },
  });
}
