export interface MapTileConfig {
  url: string
  attribution: string
  maxZoom: number
}

/**
 * Single seam behind which the tile provider lives. We ship with
 * OpenStreetMap's free, key-less tile server — the right call for a
 * zero-friction weekend demo — but swapping in Mapbox (or any other vector
 * tile provider) later is a one-line change to this export, not a rewrite
 * of `PropertyMap`.
 */
export const activeMapTiles: MapTileConfig = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}
