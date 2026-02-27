import { useState, useMemo, useEffect } from 'react'
import RoutesMap from './components/Map'
import Sidebar from './components/Sidebar'
import { Network, Route } from './types'

function cleanCityLabel(city: string) {
  const normalized = city.replace(/\s+/g, ' ').trim()
  const regionTagMatch = normalized.match(/\(([A-Z]{2,3})\)\s*$/)
  const regionTag = regionTagMatch ? ` (${regionTagMatch[1]})` : ''
  const withoutRegionTag = regionTagMatch
    ? normalized.replace(/\s*\([A-Z]{2,3}\)\s*$/, '')
    : normalized

  const base = withoutRegionTag.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  return `${base}${regionTag}`.trim()
}

function hasRegionTag(city: string) {
  return /\([A-Z]{2,3}\)$/.test(city)
}

function buildCanonicalCityMap(network: Network) {
  const rawCities = Array.from(new Set(Object.values(network.stops).map((s) => s.city)))
  const cleanedCities = Array.from(new Set(rawCities.map(cleanCityLabel)))
  const sortedCandidates = [...cleanedCities].sort((a, b) => a.length - b.length)

  const canonicalByCleaned = new Map<string, string>()

  cleanedCities.forEach((cleaned) => {
    const cleanedLower = cleaned.toLowerCase()
    let canonical = cleaned

    for (const candidate of sortedCandidates) {
      if (candidate === cleaned) continue
      // Avoid overly short/generic prefixes like "San".
      if (candidate.length < 5) continue
      // Keep explicitly region-tagged cities distinct (e.g. Amsterdam vs Amsterdam (NA)).
      if (hasRegionTag(cleaned) || hasRegionTag(candidate)) continue

      const candidateLower = candidate.toLowerCase()
      if (cleanedLower.startsWith(`${candidateLower} `)) {
        canonical = candidate
        break
      }
    }

    canonicalByCleaned.set(cleaned, canonical)
  })

  const canonicalByRaw = new Map<string, string>()
  rawCities.forEach((raw) => {
    const cleaned = cleanCityLabel(raw)
    canonicalByRaw.set(raw, canonicalByCleaned.get(cleaned) || cleaned)
  })

  return canonicalByRaw
}

function buildCityHoverDetails(network: Network, canonicalCityByRaw: Map<string, string>) {
  const details = new Map<string, { rawCities: Set<string>; stops: Set<string> }>()

  Object.values(network.stops).forEach((stop) => {
    const canonicalCity = canonicalCityByRaw.get(stop.city) || cleanCityLabel(stop.city)
    if (!details.has(canonicalCity)) {
      details.set(canonicalCity, { rawCities: new Set<string>(), stops: new Set<string>() })
    }

    const bucket = details.get(canonicalCity)
    if (!bucket) return

    bucket.rawCities.add(stop.city)
    bucket.stops.add(stop.name)
  })

  const tooltipByCity = new Map<string, string>()
  details.forEach((value, city) => {
    const rawCities = Array.from(value.rawCities).sort()
    const stops = Array.from(value.stops).sort()
    const lines = [
      `Grouped city: ${city}`,
      '',
      `City labels (${rawCities.length}):`,
      ...rawCities.map((c) => `- ${c}`),
      '',
      `Stops (${stops.length}):`,
      ...stops.map((s) => `- ${s}`),
    ]
    tooltipByCity.set(city, lines.join('\n'))
  })

  return tooltipByCity
}

function App() {
  const MOBILE_WARNING_DISMISSED_KEY = 'mobile-warning-dismissed'
  const [network, setNetwork] = useState<Network | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [showMobileWarning, setShowMobileWarning] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [hoveredRoute, setHoveredRoute] = useState<Route | null>(null)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}flixbus_network.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: Network) => setNetwork(data))
      .catch(e => setNetworkError(e.message))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = window.sessionStorage.getItem(MOBILE_WARNING_DISMISSED_KEY) === '1'
    if (dismissed) setShowMobileWarning(false)
  }, [])

  const dismissMobileWarning = () => {
    setShowMobileWarning(false)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(MOBILE_WARNING_DISMISSED_KEY, '1')
    }
  }

  const canonicalCityByRaw = useMemo(() => {
    if (!network) return new Map<string, string>()
    return buildCanonicalCityMap(network)
  }, [network])

  const cityHoverDetails = useMemo(() => {
    if (!network) return new Map<string, string>()
    return buildCityHoverDetails(network, canonicalCityByRaw)
  }, [network, canonicalCityByRaw])

  const handleSearch = (s: string) => {
    if (s !== search) {
      setSearch(s);
    }
  }

  const handleSelectRoute = (route: Route | null) => {
    if (search) setSearch('')
    if (route) {
      setSelectedCity(null)
      setSelectedCountry(null)
      setSelectedStationId(null)
    }
    setSelectedRoute(route);
    setHoveredRoute(null)
    setHoveredCity(null)
    setHoveredStationId(null)
  }

  const clearFilters = () => {
    setSelectedCity(null);
    setSelectedCountry(null);
    setSelectedStationId(null);
    setSelectedRoute(null);
    setHoveredRoute(null)
    setHoveredCity(null)
    setHoveredStationId(null)
  }

  const handleSelectCity = (city: string | null) => {
    if (search) setSearch('')
    clearFilters();
    setSelectedCity(city);
  }

  const handleSelectCountry = (country: string | null) => {
    if (search) setSearch('')
    clearFilters();
    setSelectedCountry(country);
  }

  const handleSelectStation = (id: string | null) => {
    if (search) setSearch('')
    clearFilters();
    setSelectedStationId(id);
  }

  const searchResults = useMemo(() => {
    if (!network || !search || search.length < 2) return { cities: [], countries: [], stations: [], routes: [] };
    
    const lowerSearch = search.toLowerCase();
    const citySet = new Set<string>();
    const countrySet = new Set<string>();
    const stationList: {id: string, name: string}[] = [];

    Object.values(network.stops).forEach(stop => {
      // If the search term matches the city name, add the city
      if (stop.city.toLowerCase().includes(lowerSearch)) {
        const canonicalCity = canonicalCityByRaw.get(stop.city) || cleanCityLabel(stop.city);
        citySet.add(canonicalCity);
      }
      
      // If the search term matches the station name, add the station
      if (stop.name.toLowerCase().includes(lowerSearch)) {
        stationList.push({id: stop.id, name: stop.name});
      }

      const countryLower = stop.country.toLowerCase();
      if (countryLower.includes(lowerSearch) || 
         (lowerSearch === 'us' && countryLower === 'united states') ||
         (lowerSearch === 'usa' && countryLower === 'united states') ||
         (lowerSearch === 'united states' && countryLower === 'united states')) {
        countrySet.add(stop.country);
      }
    });

    // Remove stations that are exactly the same as a found city to avoid duplicates in both lists
    const filteredStations = stationList.filter(s => !citySet.has(s.name));

    return {
      cities: Array.from(citySet).sort((a, b) => a.length - b.length).slice(0, 5),
      countries: Array.from(countrySet).sort().slice(0, 5),
      stations: filteredStations.sort((a, b) => a.name.length - b.name.length).slice(0, 5),
      routes: [] as Route[]
    };
  }, [network, search, canonicalCityByRaw]);

  const filteredRoutes = useMemo(() => {
    if (!network) return [];
    let routes = network.routes;

    if (selectedStationId) {
      routes = routes.filter(r => r.stops.includes(selectedStationId));
    } else if (selectedCity) {
      routes = routes.filter(r => r.stops.some(sid => (canonicalCityByRaw.get(network.stops[sid].city) || cleanCityLabel(network.stops[sid].city)) === selectedCity));
    } else if (selectedCountry) {
      routes = routes.filter(r => r.stops.some(sid => network.stops[sid].country === selectedCountry));
    }

    const seen = new Set<string>()
    const deduped: Route[] = []

    routes.forEach((route) => {
      const signature = `${route.id}|${route.stops.join('>')}`
      if (seen.has(signature)) return
      seen.add(signature)
      deduped.push(route)
    })

    return deduped;
  }, [network, selectedCity, selectedCountry, selectedStationId, canonicalCityByRaw]);

  useEffect(() => {
    if (selectedRoute && !filteredRoutes.includes(selectedRoute)) {
      setSelectedRoute(null)
    }

    if (hoveredRoute && !filteredRoutes.includes(hoveredRoute)) {
      setHoveredRoute(null)
    }
  }, [filteredRoutes, selectedRoute, hoveredRoute])

  const cityStops = useMemo(() => {
    if (!network || !selectedCity) return [];
    return Object.values(network.stops).filter(s => (canonicalCityByRaw.get(s.city) || cleanCityLabel(s.city)) === selectedCity);
  }, [network, selectedCity, canonicalCityByRaw]);

  const hoveredCityStopIds = useMemo(() => {
    if (!network || !hoveredCity) return new Set<string>();
    return new Set(
      Object.values(network.stops)
        .filter(s => (canonicalCityByRaw.get(s.city) || cleanCityLabel(s.city)) === hoveredCity)
        .map(s => s.id)
    );
  }, [network, hoveredCity, canonicalCityByRaw]);

  if (networkError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#e0e0e0', background: '#111', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '1.1rem' }}>Failed to load network data</div>
        <div style={{ color: '#888', fontSize: '0.85rem' }}>{networkError}</div>
      </div>
    )
  }

  if (!network) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#72bf44', background: '#111', fontSize: '1rem' }}>
        Loading network…
      </div>
    )
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {showMobileWarning && (
        <div className="mobile-warning" role="status" aria-live="polite">
          <span>This page is not optimized for small screens yet. For best experience, use a larger display.</span>
          <button className="mobile-warning-close" onClick={dismissMobileWarning} aria-label="Dismiss mobile warning">
            ×
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Sidebar 
          search={search}
          onSearchChange={handleSearch}
          searchResults={searchResults}
          cityHoverDetails={cityHoverDetails}
          filteredRoutes={filteredRoutes}
          selectedRoute={selectedRoute}
          selectedCity={selectedCity}
          cityStops={cityStops}
          selectedCountry={selectedCountry}
          selectedStationId={selectedStationId}
          onSelectRoute={handleSelectRoute}
          onSelectCity={handleSelectCity}
          onSelectCountry={handleSelectCountry}
          onSelectStation={handleSelectStation}
          onHoverRoute={setHoveredRoute}
          onHoverCity={setHoveredCity}
          onHoverStation={setHoveredStationId}
          stopsMap={network.stops}
        />
        <div className="map-container">
          <RoutesMap 
            routes={filteredRoutes}
            selectedRoute={selectedRoute}
            hoveredRoute={hoveredRoute}
            hoveredStopId={hoveredStationId}
            hoveredCityStopIds={hoveredCityStopIds}
            stopsMap={network.stops}
            onSelectRoute={handleSelectRoute}
            onSelectStop={handleSelectStation}
            onHoverRoute={setHoveredRoute}
            onHoverStop={setHoveredStationId}
          />
        </div>
      </div>
    </div>
  )
}

export default App
