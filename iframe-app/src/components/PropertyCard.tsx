import { Bookmark, BookmarkCheck, Building2, Map as MapIcon, MapPin, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@parceliq/ui'
import type { PropertyResult } from '@parceliq/embed-sdk'

import { PropertyMap } from './PropertyMap'
import { StatRow } from './StatRow'

export interface PropertyCardProps {
  property: PropertyResult
  isSaved: boolean
  isSaving: boolean
  isFlagging: boolean
  isFlagged: boolean
  onSave: () => void
  onUnsave: () => void
  onFlag: () => void
}

export function PropertyCard({
  property,
  isSaved,
  isSaving,
  isFlagging,
  isFlagged,
  onSave,
  onUnsave,
  onFlag,
}: PropertyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-base">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{property.address}</span>
        </CardTitle>
        {isFlagged ? (
          <Badge variant="destructive" className="w-fit">
            <TriangleAlert className="size-3" />
            Flagged as distressed
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PropertyMap lat={property.lat} lon={property.lon} label={property.address} />

        <div className="flex flex-col">
          <StatRow icon={<Building2 className="size-3.5" aria-hidden="true" />} label="County" value={property.county ?? 'Unknown'} />
          <StatRow label="State" value={property.state ?? 'Unknown'} />
          <StatRow icon={<MapIcon className="size-3.5" aria-hidden="true" />} label="Place type" value={property.placeType} />
          <StatRow label="Coordinates" value={`${property.lat.toFixed(4)}, ${property.lon.toFixed(4)}`} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={isSaved ? 'secondary' : 'outline'} size="sm" disabled={isSaving} onClick={isSaved ? onUnsave : onSave}>
            {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {isSaved ? 'Saved to watchlist' : 'Save to watchlist'}
          </Button>
          <Button variant="destructive" size="sm" disabled={isFlagging || isFlagged} onClick={onFlag}>
            <TriangleAlert className="size-4" />
            {isFlagged ? 'Distress flag sent' : 'Flag as Distressed'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
