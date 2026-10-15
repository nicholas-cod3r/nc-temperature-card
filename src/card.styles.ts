import { css } from "lit";

export const cardStyles = css`
  :host {
    display: block;
    height: 100%;
  }
  ha-card {
    height: 100%;
    overflow: hidden;
  }
  .wrap {
    position: relative;
    display: flex;
    height: 100%;
    min-height: 100px;
  }
  .chart {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 18%,
      rgb(0 0 0 / 15%) 28%,
      rgb(0 0 0 / 65%) 38%,
      #000 48%
    );
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 18%,
      rgb(0 0 0 / 15%) 28%,
      rgb(0 0 0 / 65%) 38%,
      #000 48%
    );
  }
  .chart svg {
    position: absolute;
    left: 25%;
    display: block;
    width: 75%;
    height: 100%;
  }
  .panel {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex: 0 0 40%;
    flex-direction: column;
    justify-content: space-between;
    width: 40%;
    max-width: 40%;
    min-width: 0;
    padding: 16px 12px;
  }
  .panel-heading {
    min-width: 0;
  }
  .name {
    overflow: hidden;
    font-size: 1.625rem;
    font-weight: 400;
    line-height: 1.2;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .last-seen {
    margin-top: 0.25rem;
    color: var(--secondary-text-color);
    font-size: 1rem;
    line-height: 1.2;
  }
  .last-seen.stale {
    color: var(--error-color, #f44336);
  }
  .chip.panel-battery {
    gap: 6px;
    font-size: 1rem;
    white-space: nowrap;
  }
  .panel-battery ha-icon {
    --mdc-icon-size: 18px;
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
  }
  .chart-wrap {
    position: relative;
    z-index: 1;
    flex: 1 1 60%;
    width: 60%;
    min-width: 0;
  }
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    pointer-events: none;
  }
  .temp,
  .chip {
    color: var(--primary-text-color);
    pointer-events: auto;
    cursor: pointer;
  }
  .temp {
    font-size: 2.8rem;
    font-weight: normal;
    line-height: 1.05;
    text-align: center;
  }
  .temp,
  .humidity-chip {
    text-shadow: 2px 2px 3px #000c;
    text-shadow: 2px 2px 3px
      color-mix(in srgb, var(--primary-background-color, #000) 80%, transparent);
  }
  .unit {
    margin-left: 0.12em;
    font-size: 1.6rem;
    opacity: 0.6;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    line-height: 1.2;
  }
  .humidity-chip {
    gap: 2px;
    font-size: 1.6rem;
    line-height: 1;
    white-space: nowrap;
  }
  .humidity-chip ha-icon {
    --mdc-icon-size: 22px;
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    filter: drop-shadow(2px 2px 3px #000c);
    filter: drop-shadow(
      2px 2px 3px color-mix(in srgb, var(--primary-background-color, #000) 80%, transparent)
    );
  }
  .humidity-chip > span {
    display: inline-flex;
    align-items: baseline;
    gap: 0.12em;
  }
  .humidity-unit {
    font-size: 0.65em;
    opacity: 0.6;
  }
  .graph-extremes {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .graph-extreme {
    position: absolute;
    right: 10px;
    pointer-events: auto;
    padding: 1px 5px;
    border-radius: 6px;
    color: var(--primary-text-color);
    font-size: 14px;
    line-height: 1;
    opacity: 0.85;
    background: color-mix(in srgb, var(--primary-text-color) 14%, transparent);
    text-shadow: 2px 2px 3px #000c;
    text-shadow: 2px 2px 3px
      color-mix(in srgb, var(--primary-background-color, #000) 80%, transparent);
  }
  .graph-extreme.max {
    top: 8px;
  }
  .graph-extreme.min {
    bottom: 8px;
  }
  .extreme-dot {
    stroke: var(--secondary-text-color);
    stroke-width: 1;
    filter: drop-shadow(0 0 2px rgb(0 0 0 / 20%));
  }
  .wrap.dark .extreme-dot {
    stroke: var(--primary-text-color);
    stroke-width: 1.5;
    filter: drop-shadow(0 0 2px rgb(0 0 0 / 25%));
  }
  ha-icon {
    --mdc-icon-size: 14px;
    width: 14px;
    height: 14px;
    color: var(--primary-text-color);
  }
  ha-icon.low-battery {
    color: var(--error-color, #f44336);
  }
`;
