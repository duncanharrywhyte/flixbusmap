export interface Stop {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  country: string;
}

export interface Route {
  id: string;
  shortName: string;
  longName: string;
  stops: string[]; // List of stop IDs
}

export interface Network {
  stops: { [id: string]: Stop };
  routes: Route[];
}

export interface AppState {
  requestCount: number;
}
