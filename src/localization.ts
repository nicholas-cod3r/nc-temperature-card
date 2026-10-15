import en from "./locales/en.json";
import hu from "./locales/hu.json";
import type { HomeAssistant } from "./types.js";

type LocalizedShape<T> = {
  [Key in keyof T]: T[Key] extends string ? string : LocalizedShape<T[Key]>;
};

export type LocalizedMessages = LocalizedShape<typeof en>;

const dictionaries: Record<string, LocalizedMessages> = { en, hu };

export function getLocalize(hass: HomeAssistant | undefined): LocalizedMessages {
  const language = hass?.locale?.language
    ?.trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .split("-")[0];

  return dictionaries[language ?? ""] ?? dictionaries.en;
}
