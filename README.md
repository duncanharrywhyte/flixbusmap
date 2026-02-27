# FlixBus Routes Map

Interactive map explorer for FlixBus GTFS routes, built with React, TypeScript, Vite, and Leaflet.

## Features

- Browse routes on an interactive dark-themed map
- Search by city, station, and country
- Filter routes by selected city, station, or country
- Click routes/stops to inspect route paths and stop lists
- Regenerate map data from GTFS feeds

## Tech Stack

- React + TypeScript
- Vite
- Leaflet + react-leaflet
- PapaParse (GTFS CSV parsing)

## Prerequisites

- Node.js 18+
- npm

## Getting Started

```bash
npm install
npm run dev
```

App runs on: `http://localhost:5175`

## Available Scripts

- `npm run dev` — start development server
- `npm run build` — type-check and build production assets
- `npm run preview` — preview production build locally
- `npm run process:gtfs` — parse GTFS feeds and regenerate route network JSON

## GTFS Data Workflow

The app loads network data from:

- `public/flixbus_network.json`

### 1) Create GTFS input folders

In the project root, create these folders (already gitignored):

- `gtfs_eu/`
- `gtfs_us/`
- `gtfs_gb/`

### 2) Put required GTFS files into each folder

Each region folder must include:

- `stops.txt`
- `routes.txt`
- `trips.txt`
- `stop_times.txt`

### 3) Regenerate network data

```bash
npm run process:gtfs
```

This writes a new output file to:

- `public/flixbus_network.json`

### Notes about IDs

GTFS IDs are namespaced during processing to avoid collisions across regions:

- Stop IDs become `EU:<stop_id>`, `US:<stop_id>`, `GB:<stop_id>`
- Route IDs become `EU:<route_id>`, `US:<route_id>`, `GB:<route_id>`

This prevents cross-region key/selection conflicts in the UI.

## Repository Hygiene

This repo ignores generated and local-only artifacts via `.gitignore`, including:

- `dist/`
- `node_modules/`
- `.vite/` / `node_modules/.vite/`
- `gtfs_eu/`, `gtfs_us/`, `gtfs_gb/`

Only source code and the generated public network file are tracked.

## Troubleshooting

### `npm run process:gtfs` exits with missing file errors

Check that each GTFS folder exists and contains all required `.txt` files.

### Map shows stale data

After regenerating GTFS data:

1. Restart `npm run dev`
2. Hard refresh browser (Ctrl+F5)

### Build issues

Run:

```bash
npm install
npm run build
```

## Project Structure

```text
src/
  components/
    Map.tsx
    Sidebar.tsx
  App.tsx
  main.tsx
  index.css
public/
  flixbus_network.json
process_gtfs.js
```
