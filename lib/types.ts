export type RiskLevel = "low" | "medium" | "high";

export type Ventilation = "poor" | "moderate" | "good";

export type FoundationType = "slab-on-grade" | "basement" | "crawl-space" | "pier-and-beam";

export interface ZoneBoundary {
  /** [lat, lng][] outer ring, matching react-leaflet Polygon `positions` shape */
  positions: [number, number][];
}

export interface Zone {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  /** 0-100 aggregate zone risk score, used for choropleth shading intensity */
  aggregateScore: number;
  geology: string;
  buildingCount: number;
  boundary: ZoneBoundary;
  center: [number, number];
}

export interface SensorReading {
  date: string; // ISO date
  radonPCiL: number; // pCi/L reading
}

export interface Building {
  id: string;
  address: string;
  pincode: string;
  zoneId: string;
  lat: number;
  lng: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  drivingFactors: string[];
  ventilation: Ventilation;
  floorLevel: string;
  constructionYear: number;
  foundation: FoundationType;
  lastUpdated: string; // ISO date
  sensorHistory: SensorReading[];
}

export interface MitigationAction {
  factor: string;
  actions: string[];
}
