import React from 'react'
import { Route, Stop } from '../types'
import { ArrowLeft, Search, MapPin, Globe, Map as MapIcon } from 'lucide-react'

interface SidebarProps {
  search: string;
  onSearchChange: (s: string) => void;
  searchResults: { cities: string[], countries: string[], stations: {id: string, name: string}[], routes: Route[] };
  cityHoverDetails: Map<string, string>;
  filteredRoutes: Route[];
  selectedRoute: Route | null;
  selectedCity: string | null;
  cityStops: Stop[];
  selectedCountry: string | null;
  selectedStationId: string | null;
  onSelectRoute: (route: Route | null) => void;
  onSelectCity: (city: string | null) => void;
  onSelectCountry: (country: string | null) => void;
  onSelectStation: (id: string | null) => void;
  stopsMap: { [id: string]: Stop };
}

const Sidebar: React.FC<SidebarProps> = ({ 
  search, 
  onSearchChange, 
  searchResults,
  cityHoverDetails,
  filteredRoutes, 
  selectedRoute,
  selectedCity,
  cityStops,
  selectedCountry,
  selectedStationId,
  onSelectRoute,
  onSelectCity,
  onSelectCountry,
  onSelectStation,
  stopsMap
}) => {
  const isFiltering = selectedCity || selectedCountry || selectedStationId;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {(!selectedRoute && !isFiltering) ? (
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', right: 12, top: 12, color: '#666' }} 
            />
            <input 
              type="text" 
              placeholder="Search city, station or country..." 
              className="search-input"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        ) : (
          <button 
            className="back-button"
            onClick={() => {
              onSelectRoute(null);
              onSelectCity(null);
              onSelectCountry(null);
              onSelectStation(null);
            }}
          >
            <ArrowLeft size={16} /> Back to All Routes
          </button>
        )}

        {isFiltering && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ color: '#72bf44', fontWeight: 'bold', fontSize: '0.9rem' }} title={selectedCity ? cityHoverDetails.get(selectedCity) : undefined}>
              {selectedCity && `City: ${selectedCity}`}
              {selectedCountry && `Country: ${selectedCountry}`}
              {selectedStationId && `Station: ${stopsMap[selectedStationId]?.name}`}
            </div>

          </div>
        )}
      </div>

      <div className="sidebar-content">
        {search && !selectedRoute && !isFiltering && (
          <div className="search-results">
            {searchResults.countries.length > 0 && (
              <div className="search-section">
                <div className="section-title">Countries</div>
                {searchResults.countries.map(c => (
                  <div key={c} className="search-item" onClick={() => onSelectCountry(c)}>
                    <Globe size={14} /> {c}
                  </div>
                ))}
              </div>
            )}
            {searchResults.cities.length > 0 && (
              <div className="search-section">
                <div className="section-title">Cities</div>
                {searchResults.cities.map(c => (
                  <div key={c} className="search-item" title={cityHoverDetails.get(c)} onClick={() => onSelectCity(c)}>
                    <MapIcon size={14} /> {c}
                  </div>
                ))}
              </div>
            )}
            {searchResults.stations.length > 0 && (
              <div className="search-section">
                <div className="section-title">Stations</div>
                {searchResults.stations.map(s => (
                  <div key={s.id} className="search-item" onClick={() => onSelectStation(s.id)}>
                    <MapPin size={14} /> {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedCity && !selectedRoute && cityStops.length > 0 && (
          <div className="city-stops-list" style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid #333' }}>
            <div className="section-title" style={{ padding: '10px 0' }}>Stops in {selectedCity}</div>
            {cityStops.map(stop => (
              <div 
                key={stop.id} 
                className="search-item" 
                style={{ fontSize: '0.8rem' }}
                onClick={() => onSelectStation(stop.id)}
              >
                <MapPin size={12} /> {stop.name}
              </div>
            ))}
          </div>
        )}

        {!selectedRoute ? (
          <div className="route-list">
            <div className="section-title" style={{ padding: '10px 20px' }}>
              {isFiltering ? 'Available Routes' : (search ? 'Route Matches' : 'All Routes')}
            </div>
            {filteredRoutes.slice(0, 100).map(route => {
              const firstStop = stopsMap[route.stops[0]];
              const lastStop = stopsMap[route.stops[route.stops.length - 1]];
              
              return (
                <div 
                  key={`${route.id}-${route.stops[0] || ''}-${route.stops[route.stops.length - 1] || ''}-${route.stops.length}`}
                  className="route-card"
                  onClick={() => onSelectRoute(route)}
                >
                  <div className="route-name">
                    {route.shortName ? `${route.shortName}: ` : ''}
                    {firstStop?.name} → {lastStop?.name}
                  </div>
                  <div className="route-details">
                    {route.stops.length} stops • {route.longName}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="stop-list">
            <div style={{ padding: '0 20px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                {selectedRoute.longName}
              </h2>

            </div>
            {selectedRoute.stops.map(stopId => {
              const stop = stopsMap[stopId];
              return (
                <div 
                  key={stopId} 
                  className="stop-item" 
                  style={{ padding: '10px 20px', cursor: 'pointer' }}
                  onClick={() => onSelectStation(stopId)}
                >
                  <div className="stop-dot"></div>
                  <div className="stop-line"></div>
                  <div className="stop-name">{stop?.name}</div>
                </div>
              );
            })}
          </div>
        )}
        
        {!selectedRoute && filteredRoutes.length > 100 && (
          <div style={{ padding: '15px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
            Showing top 100 of {filteredRoutes.length} results
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
