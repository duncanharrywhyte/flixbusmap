import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import { Route, Stop } from '../types'
import L from 'leaflet'

const FLIX_GREEN = '#72bf44'
const HOVER_HIGHLIGHT = '#ffd166'

// Custom dot icon for stops
const dotIcon = (isHovered: boolean) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:${isHovered ? HOVER_HIGHLIGHT : FLIX_GREEN}; width:8px; height:8px; border-radius:50%; border:1px solid white;"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

interface MapProps {
  routes: Route[];
  selectedRoute: Route | null;
  hoveredRoute: Route | null;
  hoveredStopId: string | null;
  hoveredCityStopIds: Set<string>;
  sidebarHidden: boolean;
  stopsMap: { [id: string]: Stop };
  onSelectRoute: (route: Route | null) => void;
  onSelectStop: (id: string) => void;
  onHoverRoute: (route: Route | null) => void;
  onHoverStop: (id: string | null) => void;
}

const MapEffect: React.FC<{ selectedRoute: Route | null, stopsMap: { [id: string]: Stop }, sidebarHidden: boolean }> = ({ selectedRoute, stopsMap, sidebarHidden }) => {
  const map = useMap();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize({ pan: false, animate: false });
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [sidebarHidden, map]);
  
  useEffect(() => {
    if (selectedRoute && selectedRoute.stops.length > 0) {
      const points = selectedRoute.stops
        .map(id => stopsMap[id])
        .filter(s => !!s)
        .map(s => [s.lat, s.lon] as [number, number]);
      
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
        if (isMobileViewport) {
          const targetZoom = Math.max(map.getBoundsZoom(bounds, false, L.point(80, 80)) - 0.35, 3.6);
          map.setView(bounds.getCenter(), targetZoom, {
            animate: true,
            duration: 0.8,
            easeLinearity: 0.2
          });
        } else {
          map.fitBounds(bounds, {
            padding: [120, 120],
            maxZoom: 9,
            animate: true,
            duration: 0.8,
            easeLinearity: 0.2
          });
        }
      }
    }
  }, [selectedRoute, stopsMap, map]);

  return null;
}

const Map: React.FC<MapProps> = ({ routes, selectedRoute, hoveredRoute, hoveredStopId, hoveredCityStopIds, sidebarHidden, stopsMap, onSelectRoute, onSelectStop, onHoverRoute, onHoverStop }) => {
  return (
    <MapContainer 
      center={[50.0, 10.0]} 
      zoom={5} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      preferCanvas={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        opacity={1}
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
        opacity={0.6}
      />
      
      {routes.map((route, index) => {
        const positions = route.stops
          .map(id => stopsMap[id])
          .filter(s => !!s)
          .map(s => [s.lat, s.lon] as [number, number]);
        
        if (positions.length < 2) return null;

        const isSelected = selectedRoute === route;
        const isHoveredRoute = hoveredRoute === route;
        const isHovered = isHoveredRoute;
        const routeKey = `${route.id}-${route.stops[0] || ''}-${route.stops[route.stops.length - 1] || ''}-${route.stops.length}-${index}`;

        return (
          <React.Fragment key={routeKey}>
            <Polyline
              positions={positions}
              eventHandlers={{
                click: () => onSelectRoute(route),
                mouseover: () => onHoverRoute(route),
                mouseout: () => onHoverRoute(null)
              }}
              pathOptions={{
                color: FLIX_GREEN,
                weight: isSelected ? 16 : 12,
                opacity: 0,
                lineJoin: 'round'
              }}
            />
            <Polyline
              positions={positions}
              interactive={false}
              pathOptions={{
                color: isSelected ? FLIX_GREEN : (isHovered ? HOVER_HIGHLIGHT : FLIX_GREEN),
                weight: isSelected ? 6 : (isHovered ? 3.2 : (selectedRoute ? 0.6 : 1)),
                opacity: isSelected ? 1 : (isHovered ? 1 : (selectedRoute ? 0.12 : 0.42)),
                lineJoin: 'round'
              }}
            />
          </React.Fragment>
        );
      })}

      {selectedRoute?.stops.map(stopId => {
        const stop = stopsMap[stopId];
        if (!stop) return null;
        const isHoveredStop = hoveredStopId === stopId;
        return (
          <Marker 
            key={stopId} 
            position={[stop.lat, stop.lon]} 
            icon={dotIcon(isHoveredStop)}
            eventHandlers={{
                click: () => onSelectStop(stopId),
                mouseover: () => onHoverStop(stopId),
                mouseout: () => onHoverStop(null)
            }}
          >
            <Popup>{stop.name}</Popup>
          </Marker>
        );
      })}

      {Array.from(hoveredCityStopIds).map((stopId) => {
        const stop = stopsMap[stopId];
        if (!stop) return null;
        if (hoveredStopId === stopId) return null;
        if (selectedRoute?.stops.includes(stopId)) return null;

        return (
          <Marker
            key={`hover-city-${stopId}`}
            position={[stop.lat, stop.lon]}
            icon={dotIcon(true)}
            eventHandlers={{
              click: () => onSelectStop(stopId),
              mouseover: () => onHoverStop(stopId),
              mouseout: () => onHoverStop(null)
            }}
          >
            <Popup>{stop.name}</Popup>
          </Marker>
        );
      })}

      {hoveredStopId && (!selectedRoute || !selectedRoute.stops.includes(hoveredStopId)) && stopsMap[hoveredStopId] && (
        <Marker
          key={`hovered-${hoveredStopId}`}
          position={[stopsMap[hoveredStopId].lat, stopsMap[hoveredStopId].lon]}
          icon={dotIcon(true)}
          eventHandlers={{
            click: () => onSelectStop(hoveredStopId),
            mouseover: () => onHoverStop(hoveredStopId),
            mouseout: () => onHoverStop(null)
          }}
        >
          <Popup>{stopsMap[hoveredStopId].name}</Popup>
        </Marker>
      )}

      <MapEffect selectedRoute={selectedRoute} stopsMap={stopsMap} sidebarHidden={sidebarHidden} />
    </MapContainer>
  );
};

export default Map;
