import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { activeMapTiles } from '../lib/map-provider'

// Leaflet's default marker icon paths are computed relative to the CSS
// file's own location, which breaks once Vite bundles/hashes the image
// assets — point Leaflet at the resolved asset URLs explicitly instead.
// This is the one common gotcha with Leaflet + Vite; without it, pins
// silently render as broken images.
const markerIconInstance = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export interface PropertyMapProps {
  lat: number
  lon: number
  label: string
}

export function PropertyMap({ lat, lon, label }: PropertyMapProps) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: 200, width: '100%', borderRadius: 'var(--radius-lg)' }}
    >
      <TileLayer url={activeMapTiles.url} attribution={activeMapTiles.attribution} maxZoom={activeMapTiles.maxZoom} />
      <Marker position={[lat, lon]} icon={markerIconInstance}>
        <Popup>{label}</Popup>
      </Marker>
      <RecenterOnChange lat={lat} lon={lon} />
    </MapContainer>
  )
}

/** react-leaflet's <MapContainer> only reads `center` on first mount, so recentering on a new property needs an imperative `setView`. */
function RecenterOnChange({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon])
  }, [lat, lon, map])
  return null
}
