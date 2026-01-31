/**
 * Google Maps TypeScript Declarations
 * Minimal declarations for the features we use
 */

declare global {
  interface Window {
    google?: typeof google
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: MapOptions)
      setCenter(latLng: LatLng | LatLngLiteral): void
      setZoom(zoom: number): void
      panTo(latLng: LatLng | LatLngLiteral): void
      addListener(eventName: string, handler: (e: any) => void): void
    }

    class Marker {
      constructor(options: MarkerOptions)
      setPosition(latLng: LatLng | LatLngLiteral): void
      getPosition(): LatLng | undefined
      addListener(eventName: string, handler: () => void): void
    }

    interface MapOptions {
      center: LatLng | LatLngLiteral
      zoom: number
      mapTypeControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
      zoomControl?: boolean
      gestureHandling?: string
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral
      map: Map
      draggable?: boolean
      title?: string
    }

    interface LatLng {
      lat(): number
      lng(): number
    }

    interface LatLngLiteral {
      lat: number
      lng: number
    }

    interface MapMouseEvent {
      latLng: LatLng | null
    }

    namespace places {
      class AutocompleteService {
        getPlacePredictions(
          request: AutocompletionRequest,
          callback: (
            predictions: AutocompletePrediction[] | null,
            status: PlacesServiceStatus
          ) => void
        ): void
      }

      class PlacesService {
        constructor(map: Map)
        getDetails(
          request: PlaceDetailsRequest,
          callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void
        ): void
      }

      interface AutocompletionRequest {
        input: string
        componentRestrictions?: { country: string | string[] }
      }

      interface AutocompletePrediction {
        place_id: string
        description: string
        structured_formatting: {
          main_text: string
          secondary_text: string
        }
      }

      interface PlaceDetailsRequest {
        placeId: string
        fields: string[]
      }

      interface PlaceResult {
        geometry?: {
          location: LatLng
        }
        name?: string
      }

      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        INVALID_REQUEST = 'INVALID_REQUEST',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }
    }
  }
}

export {}
