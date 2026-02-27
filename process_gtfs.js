import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

const EU_DIR = 'gtfs_eu';
const US_DIR = 'gtfs_us';
const GB_DIR = 'gtfs_gb';
const REQUIRED_GTFS_FILES = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];

const tzMap = {
    'Europe/Berlin': 'Germany',
    'Europe/Amsterdam': 'Netherlands',
    'Europe/Copenhagen': 'Denmark',
    'Europe/Paris': 'France',
    'Europe/Prague': 'Czech Republic',
    'Europe/Brussels': 'Belgium',
    'Europe/Warsaw': 'Poland',
    'Europe/Vienna': 'Austria',
    'Europe/Zurich': 'Switzerland',
    'Europe/Rome': 'Italy',
    'Europe/Madrid': 'Spain',
    'Europe/London': 'United Kingdom',
    'Europe/Istanbul': 'Turkey',
    'Europe/Lisbon': 'Portugal',
    'Europe/Stockholm': 'Sweden',
    'Europe/Oslo': 'Norway',
    'Europe/Helsinki': 'Finland',
    'Europe/Budapest': 'Hungary',
    'Europe/Dublin': 'Ireland',
    'Europe/Bucharest': 'Romania',
    'Europe/Sofia': 'Bulgaria',
    'Europe/Belgrade': 'Serbia',
    'Europe/Zagreb': 'Croatia',
    'Europe/Ljubljana': 'Slovenia',
    'Europe/Bratislava': 'Slovakia',
    'America/New_York': 'United States',
    'America/Chicago': 'United States',
    'America/Denver': 'United States',
    'America/Los_Angeles': 'United States',
    'America/Phoenix': 'United States'
};

const stationWords = [
    'Central Station', 'Station', 'Bus Station', 'Busstation', 'Railway Station', 'Train Station',
    'Airport', 'Hbf', 'ZOB', 'Gare', 'Stazione', 'Terminal', 'Stop', 'Coach Station', 'Coach'
];

function cleanCityName(name) {
    // 1. Split by common separators
    let city = name.split('(')[0].split(',')[0].split(' - ')[0].split(':')[0].trim();
    
    // 2. Strip specific station names if they follow the city name directly without a separator
    // e.g. "Amsterdam Sloterdijk" -> "Amsterdam"
    // We only do this if it leaves at least one word.
    const words = city.split(' ');
    if (words.length > 1) {
        // Common FlixBus suffixes that are often part of the first part
        const subLocations = ['Sloterdijk', 'Bijlmer', 'Amstel', 'Schiphol', 'Victoria', 'Bercy', 'Esenler', 'Alibeyköy', 'Dudullu', 'Ataşehir'];
        if (subLocations.includes(words[words.length - 1])) {
            return words.slice(0, -1).join(' ').trim();
        }
    }

    return city;
}

function scopedId(regionCode, rawId) {
    return `${regionCode}:${rawId}`;
}

function processGtfsDir(dir, regionCode, regionTag) {
    console.log(`Processing ${dir}...`);
    if (!fs.existsSync(dir)) {
        console.warn(`Skipped ${dir}: directory does not exist.`);
        return { stops: {}, routes: [] };
    }

    const missingFiles = REQUIRED_GTFS_FILES.filter((fileName) => !fs.existsSync(path.join(dir, fileName)));
    if (missingFiles.length > 0) {
        console.warn(`Skipped ${dir}: missing required files: ${missingFiles.join(', ')}`);
        return { stops: {}, routes: [] };
    }

    const STOPS_FILE = path.join(dir, 'stops.txt');
    const ROUTES_FILE = path.join(dir, 'routes.txt');
    const TRIPS_FILE = path.join(dir, 'trips.txt');
    const STOP_TIMES_FILE = path.join(dir, 'stop_times.txt');

    const stopsData = fs.readFileSync(STOPS_FILE, 'utf8');
    const stopsRaw = Papa.parse(stopsData, { header: true }).data;
    const stopsMap = {};
    
    stopsRaw.forEach(s => {
        if (s.stop_id) {
            const stopId = scopedId(regionCode, s.stop_id);
            let country = tzMap[s.stop_timezone];
            if (!country) {
                if (s.stop_timezone?.includes('Europe')) country = 'Germany'; // Default
                else if (regionTag === '(NA)') country = 'United States';
                else if (regionTag === '(UK)') country = 'United Kingdom';
                else country = s.stop_timezone?.split('/')[1] || 'Unknown';
            }

            let cityName = cleanCityName(s.stop_name);
            let stopName = s.stop_name;

            if (regionTag) {
                cityName = cityName + " " + regionTag;
                stopName = stopName + " " + regionTag;
            }

            stopsMap[stopId] = {
                id: stopId,
                name: stopName,
                city: cityName,
                lat: parseFloat(s.stop_lat),
                lon: parseFloat(s.stop_lon),
                country: country
            };
        }
    });

    const routesData = fs.readFileSync(ROUTES_FILE, 'utf8');
    const routesRaw = Papa.parse(routesData, { header: true }).data;
    const routesMap = {};
    routesRaw.forEach(r => {
        if (r.route_id) {
            const routeId = scopedId(regionCode, r.route_id);
            routesMap[routeId] = {
                id: routeId,
                shortName: r.route_short_name,
                longName: r.route_long_name,
                stops: []
            };
        }
    });

    const tripsData = fs.readFileSync(TRIPS_FILE, 'utf8');
    const tripsRaw = Papa.parse(tripsData, { header: true }).data;
    const routeToTrip = {};
    tripsRaw.forEach(t => {
        if (t.trip_id && t.route_id && !routeToTrip[t.route_id]) {
            const routeId = scopedId(regionCode, t.route_id);
            if (!routeToTrip[routeId]) {
                routeToTrip[routeId] = t.trip_id;
            }
        }
    });

    const stopTimesData = fs.readFileSync(STOP_TIMES_FILE, 'utf8');
    const stopTimesRaw = Papa.parse(stopTimesData, { header: true }).data;
    const tripStops = {};
    stopTimesRaw.forEach(st => {
        if (st.trip_id && st.stop_id) {
            if (!tripStops[st.trip_id]) tripStops[st.trip_id] = [];
            tripStops[st.trip_id].push({
                stop_id: scopedId(regionCode, st.stop_id),
                sequence: parseInt(st.stop_sequence)
            });
        }
    });

    Object.keys(routeToTrip).forEach(routeId => {
        const tripId = routeToTrip[routeId];
        if (tripStops[tripId]) {
            const sortedStops = tripStops[tripId]
                .sort((a, b) => a.sequence - b.sequence)
                .map(s => s.stop_id);
            routesMap[routeId].stops = sortedStops;
        }
    });

    return { stops: stopsMap, routes: Object.values(routesMap).filter(r => r.stops.length > 0) };
}

const euNetwork = processGtfsDir(EU_DIR, 'EU', '');
const usNetwork = processGtfsDir(US_DIR, 'US', '(NA)');
const gbNetwork = processGtfsDir(GB_DIR, 'GB', ''); // UK usually doesn't need a tag unless the user wants one, but the user complained about london (NA) only.

const combinedStops = { ...euNetwork.stops, ...usNetwork.stops, ...gbNetwork.stops };
const combinedRoutes = [...euNetwork.routes, ...usNetwork.routes, ...gbNetwork.routes];

const output = {
    stops: combinedStops,
    routes: combinedRoutes
};

if (Object.keys(output.stops).length === 0 || output.routes.length === 0) {
    console.error('No GTFS data was processed. Add GTFS data folders (gtfs_eu, gtfs_us, gtfs_gb) with stops.txt, routes.txt, trips.txt, and stop_times.txt.');
    process.exit(1);
}

const outputPath = path.join('public', 'flixbus_network.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output));
console.log(`Done! Wrote ${output.routes.length} routes and ${Object.keys(output.stops).length} stops to ${outputPath}`);
