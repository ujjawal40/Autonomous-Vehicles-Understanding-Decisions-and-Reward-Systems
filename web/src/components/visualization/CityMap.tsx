/**
 * City Map Visualization
 *
 * Real map integration for cities like London, NYC, Tokyo using Leaflet.
 */

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';

interface CityConfig {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

const CITY_CONFIGS: Record<string, CityConfig> = {
  london: {
    id: 'london',
    name: 'London',
    center: [51.5137, -0.1337], // Soho
    zoom: 16,
  },
  nyc: {
    id: 'nyc',
    name: 'New York',
    center: [40.758, -73.9855], // Times Square
    zoom: 16,
  },
  tokyo: {
    id: 'tokyo',
    name: 'Tokyo',
    center: [35.6595, 139.7004], // Shibuya
    zoom: 16,
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    center: [19.076, 72.8777], // CST
    zoom: 16,
  },
};

interface VehiclePosition {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
}

interface CityMapProps {
  city: string;
  vehicle?: VehiclePosition;
  destination?: Waypoint;
  route?: [number, number][];
  isSimulating?: boolean;
  onPositionClick?: (lat: number, lng: number) => void;
}

export function CityMap({
  city,
  vehicle,
  destination,
  route = [],
  isSimulating = false,
  onPositionClick,
}: CityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = CITY_CONFIGS[city] || CITY_CONFIGS.london;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dynamic import of Leaflet
    const loadLeaflet = async () => {
      try {
        // Check if Leaflet is available
        const L = (window as any).L;
        if (!L) {
          // Load Leaflet from CDN
          await new Promise<void>((resolve, reject) => {
            // CSS
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);

            // JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
          });
        }

        const leaflet = (window as any).L;

        // Create map
        mapRef.current = leaflet.map(mapContainerRef.current, {
          center: config.center,
          zoom: config.zoom,
          zoomControl: false,
          attributionControl: false,
        });

        // Dark theme tiles (CartoDB Dark Matter)
        leaflet
          .tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          })
          .addTo(mapRef.current);

        // Add zoom control to bottom right
        leaflet.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

        // Click handler
        if (onPositionClick) {
          mapRef.current.on('click', (e: any) => {
            onPositionClick(e.latlng.lat, e.latlng.lng);
          });
        }

        setMapLoaded(true);
      } catch (err) {
        setError('Failed to load map');
        console.error(err);
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [config, onPositionClick]);

  // Update map center when city changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setView(config.center, config.zoom);
    }
  }, [city, config, mapLoaded]);

  // Update vehicle marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !vehicle) return;

    const L = (window as any).L;

    // Create custom vehicle icon
    const vehicleIcon = L.divIcon({
      className: 'vehicle-marker',
      html: `
        <div style="
          transform: rotate(${vehicle.heading}deg);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg viewBox="0 0 100 100" width="40" height="40">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path d="M50 10 L70 40 L70 80 Q70 90 50 90 Q30 90 30 80 L30 40 Z"
                  fill="#00d4ff" filter="url(#glow)"/>
            <circle cx="50" cy="30" r="8" fill="rgba(255,255,255,0.5)"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([vehicle.lat, vehicle.lng]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    } else {
      vehicleMarkerRef.current = L.marker([vehicle.lat, vehicle.lng], {
        icon: vehicleIcon,
      }).addTo(mapRef.current);
    }

    // Center map on vehicle if simulating
    if (isSimulating) {
      mapRef.current.panTo([vehicle.lat, vehicle.lng], { animate: true, duration: 0.5 });
    }
  }, [vehicle, mapLoaded, isSimulating]);

  // Draw route
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || route.length === 0) return;

    const L = (window as any).L;

    // Remove existing route
    mapRef.current.eachLayer((layer: any) => {
      if (layer.options?.className === 'route-line') {
        mapRef.current.removeLayer(layer);
      }
    });

    // Draw new route
    L.polyline(route, {
      color: '#00ff88',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10',
      className: 'route-line',
    }).addTo(mapRef.current);
  }, [route, mapLoaded]);

  // Draw destination marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !destination) return;

    const L = (window as any).L;

    const destIcon = L.divIcon({
      className: 'dest-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: #00ff88;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    L.marker([destination.lat, destination.lng], { icon: destIcon })
      .bindPopup(destination.name)
      .addTo(mapRef.current);
  }, [destination, mapLoaded]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0f]">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading state */}
      {!mapLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-white/50">Loading {config.name} map...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
          <div className="flex flex-col items-center gap-3 text-[#ff3366]">
            <AlertTriangle size={32} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* City info overlay */}
      <div className="absolute top-4 left-4 px-4 py-2 bg-black/80 backdrop-blur rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[#00ff88]" />
          <span className="text-sm font-medium">{config.name}</span>
        </div>
        {vehicle && (
          <div className="text-xs text-white/50 mt-1">
            {vehicle.speed.toFixed(0)} km/h • {vehicle.heading.toFixed(0)}°
          </div>
        )}
      </div>

      {/* Destination info */}
      {destination && (
        <div className="absolute top-4 right-4 px-4 py-2 bg-black/80 backdrop-blur rounded-lg border border-[#00ff88]/30">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-[#00ff88]" />
            <span className="text-sm text-[#00ff88]">{destination.name}</span>
          </div>
        </div>
      )}

      {/* Custom styles for Leaflet */}
      <style>{`
        .leaflet-container {
          background: #0a0a0f;
          font-family: 'Space Grotesk', sans-serif;
        }
        .leaflet-control-zoom a {
          background: rgba(0, 0, 0, 0.8) !important;
          color: #00d4ff !important;
          border: 1px solid rgba(0, 212, 255, 0.3) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(0, 212, 255, 0.2) !important;
        }
        .vehicle-marker, .dest-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
