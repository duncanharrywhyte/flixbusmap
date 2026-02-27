import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import { Route, Stop } from '../types'
import L from 'leaflet'

// Custom dot icon for stops
const dotIcon = (selected: boolean) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:${selected ? '#72bf44' : '#666'}; width:8px; height:8px; border-radius:50%; border:1px solid white;"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

interface MapProps {
  routes: Route[];
  selectedRoute: Route | null;
  stopsMap: { [id: string]: Stop };
  onSelectRoute: (route: Route | null) => void;
  onSelectStop: (id: string) => void;
}

const MapEffect: React.FC<{ selectedRoute: Route | null, stopsMap: { [id: string]: Stop } }> = ({ selectedRoute, stopsMap }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedRoute && selectedRoute.stops.length > 0) {
      const points = selectedRoute.stops
        .map(id => stopsMap[id])
        .filter(s => !!s)
        .map(s => [s.lat, s.lon] as [number, number]);
      
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [selectedRoute, stopsMap, map]);

  return null;
}

const Map: React.FC<MapProps> = ({ routes, selectedRoute, stopsMap, onSelectRoute, onSelectStop }) => {
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
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      {routes.map((route, index) => {
        const positions = route.stops
          .map(id => stopsMap[id])
          .filter(s => !!s)
          .map(s => [s.lat, s.lon] as [number, number]);
        
        if (positions.length < 2) return null;

        const isSelected = selectedRoute?.id === route.id;
        const routeKey = `${route.id}-${route.stops[0] || ''}-${route.stops[route.stops.length - 1] || ''}-${route.stops.length}-${index}`;

        return (
          <React.Fragment key={routeKey}>
            <Polyline
              positions={positions}
              eventHandlers={{
                click: () => onSelectRoute(route)
              }}
              pathOptions={{
                color: '#72bf44',
                weight: isSelected ? 16 : 12,
                opacity: 0.01,
                lineJoin: 'round'
              }}
            />
            <Polyline
              positions={positions}
              interactive={false}
              pathOptions={{
                color: '#72bf44',
                weight: isSelected ? 6 : (selectedRoute ? 0.8 : 2.2),
                opacity: isSelected ? 1 : (selectedRoute ? 0.15 : 0.5),
                lineJoin: 'round'
              }}
            />
          </React.Fragment>
        );
      })}

      {selectedRoute?.stops.map(stopId => {
        const stop = stopsMap[stopId];
        if (!stop) return null;
        return (
          <Marker 
            key={stopId} 
            position={[stop.lat, stop.lon]} 
            icon={dotIcon(true)}
            eventHandlers={{
                click: () => onSelectStop(stopId)
            }}
          >
            <Popup>{stop.name}</Popup>
          </Marker>
        );
      })}

      <MapEffect selectedRoute={selectedRoute} stopsMap={stopsMap} />
    </MapContainer>
  );
};

export default Map;
