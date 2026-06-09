import { Client } from '@googlemaps/google-maps-services-js'

/**
 * Shared Google Maps Services client. The API key is read per-request from the
 * environment so callers can detect a missing key and fall back to mocks.
 */
const client = new Client({})

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY
}

export interface NormalizedPlace {
  externalId: string
  name: string
  address1: string
  city: string
  state: string
  zip: string
  lat: number | null
  lon: number | null
  placeType: string
}

/**
 * Geocode a postal address into latitude/longitude. Returns nulls when the key
 * is missing or the address cannot be resolved.
 */
export async function geocodeAddress(
  address1: string,
  city: string,
  state: string,
  zip: string
): Promise<{ lat: number | null; lon: number | null }> {
  const key = getGoogleMapsApiKey()
  if (!key) {
    console.warn('⚠️ GOOGLE_PLACES_API_KEY is not set. Skipping geocoding API call.')
    return { lat: null, lon: null }
  }

  const address = `${address1}, ${city}, ${state} ${zip}`

  try {
    const response = await client.geocode({ params: { address, key } })
    const location = response.data.results?.[0]?.geometry?.location
    if (location) {
      return { lat: location.lat, lon: location.lng }
    }
    console.warn(`Geocoding status was: ${response.data.status}`)
  } catch (error: any) {
    console.warn('Geocoding address failed:', error?.message || error)
  }
  return { lat: null, lon: null }
}

/**
 * Parse a Google `formatted_address` string into our internal address fields.
 */
function parseFormattedAddress(formatted: string, fallbackName: string): {
  address1: string
  city: string
  state: string
  zip: string
} {
  const parts = formatted.split(',').map((p) => p.trim())

  const address1 = parts[0] || fallbackName
  const city = parts[1] || ''
  let state = ''
  let zip = ''

  const stateZip = parts[2] || ''
  if (stateZip) {
    const szParts = stateZip.trim().split(/\s+/)
    state = szParts[0] || ''
    zip = szParts[1] || ''
  }

  if (!zip && parts.length > 3) {
    state = parts[2] || ''
    zip = (parts[3] || '').trim().split(/\s+/)[0] || ''
  }

  return {
    address1,
    city: city || 'Unknown City',
    state: state || '',
    zip: zip || '',
  }
}

/**
 * Search venues via Google Places Text Search and normalize the results.
 * Throws if the key is missing or the API errors so callers can fall back.
 */
export async function searchPlaces(query: string): Promise<NormalizedPlace[]> {
  const key = getGoogleMapsApiKey()
  if (!key) {
    throw new Error('Google Places API key is not configured.')
  }

  const response = await client.textSearch({ params: { query, key } })
  const status = response.data.status

  if (status !== 'OK' && status !== 'ZERO_RESULTS') {
    throw new Error(
      `Google Places API error: ${status} - ${response.data.error_message || 'Unknown error'}`
    )
  }

  return (response.data.results || []).map((place) => {
    const parsed = parseFormattedAddress(place.formatted_address || '', place.name || '')
    return {
      externalId: place.place_id || '',
      name: place.name || parsed.address1,
      address1: parsed.address1,
      city: parsed.city,
      state: parsed.state || 'TX',
      zip: parsed.zip || '78701',
      lat: place.geometry?.location?.lat ?? null,
      lon: place.geometry?.location?.lng ?? null,
      placeType: place.types?.[0] || 'bar',
    }
  })
}
