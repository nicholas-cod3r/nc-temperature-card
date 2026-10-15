import type { ReactiveController, ReactiveControllerHost } from "lit";
import { hoursOf } from "./config.js";
import { loadGraphData } from "./graph-data.js";
import type { CardConfig, GraphPoint, HomeAssistant } from "./types.js";

const REFRESH_MS = 5 * 60 * 1000;

interface GraphHistoryInputs {
  hass?: HomeAssistant;
  config?: CardConfig;
}

interface GraphHistoryHost extends ReactiveControllerHost {
  isConnected: boolean;
}

interface GraphHistorySnapshot {
  config: CardConfig;
  temperatureState?: string;
}

export class GraphHistoryController implements ReactiveController {
  private _snapshot?: GraphHistorySnapshot;
  private _timer?: number;
  private _requestId = 0;
  private _inputGeneration = 0;
  private _loading = false;
  private _reload = false;

  constructor(
    private readonly _host: GraphHistoryHost,
    private readonly _getInputs: () => GraphHistoryInputs,
    private readonly _setPoints: (points: GraphPoint[]) => void,
  ) {
    this._host.addController(this);
  }

  hostConnected(): void {
    this._snapshot = undefined;
    window.clearInterval(this._timer);
    this._timer = window.setInterval(() => this._loadHistory(), REFRESH_MS);
    this._syncInputs();
  }

  hostDisconnected(): void {
    window.clearInterval(this._timer);
    this._timer = undefined;
    this._requestId += 1;
    this._inputGeneration += 1;
    this._loading = false;
    this._reload = false;
    this._snapshot = undefined;
  }

  hostUpdated(): void {
    this._syncInputs();
  }

  private _syncInputs(): void {
    if (!this._host.isConnected) {
      return;
    }
    const { hass, config } = this._getInputs();
    if (!config) {
      return;
    }

    const snapshot: GraphHistorySnapshot = {
      config,
      temperatureState: hass?.states?.[config.temperature]?.state,
    };
    const previous = this._snapshot;
    this._snapshot = snapshot;
    if (!previous || this._historyConfigChanged(previous.config, config)
      || previous.temperatureState !== snapshot.temperatureState) {
      this._loadHistory();
    }
  }

  private _historyConfigChanged(previous: CardConfig, next: CardConfig): boolean {
    return previous.temperature !== next.temperature
      || hoursOf(previous) !== hoursOf(next)
      || previous.mock_history !== next.mock_history;
  }

  private _loadHistory(): void {
    const { hass, config } = this._getInputs();
    if (!this._host.isConnected || !hass?.callWS || !config) {
      return;
    }
    if (this._loading) {
      this._reload = true;
      this._inputGeneration += 1;
      return;
    }

    this._loading = true;
    const requestId = this._requestId + 1;
    this._requestId = requestId;
    const inputGeneration = this._inputGeneration;
    void this._fetchHistory(hass, config, requestId, inputGeneration).finally(() => {
      if (this._requestId !== requestId) {
        return;
      }
      this._loading = false;
      if (this._reload && this._host.isConnected) {
        this._reload = false;
        this._loadHistory();
      }
    });
  }

  private async _fetchHistory(
    hass: HomeAssistant,
    config: CardConfig,
    requestId: number,
    inputGeneration: number,
  ): Promise<void> {
    const isCurrent = () => this._host.isConnected
      && this._requestId === requestId
      && this._inputGeneration === inputGeneration;
    const points = await loadGraphData(hass, config, isCurrent);
    if (!isCurrent() || points == null) {
      return;
    }
    this._setPoints(points);
  }
}
