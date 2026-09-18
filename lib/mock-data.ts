import type { Building, MitigationAction, Zone } from "./types";

/**
 * MOCK DATA — Ashford County pilot region.
 *
 * TODO(supabase): replace every export in this file with live queries once
 * the schema is provisioned, e.g.:
 *   const { data: zones } = await supabase.from("zones").select("*");
 *   const { data: buildings } = await supabase.from("buildings").select("*, sensor_readings(*)");
 * Keep the shapes in `lib/types.ts` as the contract between mock and live data
 * so pages don't need to change when the swap happens.
 */

export const zones: Zone[] = [
  {
    id: "z1",
    name: "Old Quarry District",
    riskLevel: "high",
    aggregateScore: 84,
    geology: "Fractured uranium-bearing granite, shallow bedrock",
    buildingCount: 6,
    center: [40.732, -75.812],
    boundary: {
      positions: [
        [40.741, -75.828],
        [40.744, -75.803],
        [40.726, -75.798],
        [40.722, -75.822],
      ],
    },
  },
  {
    id: "z2",
    name: "Slate Ridge",
    riskLevel: "high",
    aggregateScore: 78,
    geology: "Black shale outcrops, elevated soil permeability",
    buildingCount: 5,
    center: [40.756, -75.774],
    boundary: {
      positions: [
        [40.765, -75.790],
        [40.768, -75.762],
        [40.749, -75.756],
        [40.746, -75.784],
      ],
    },
  },
  {
    id: "z3",
    name: "Hilltop Terrace",
    riskLevel: "medium",
    aggregateScore: 54,
    geology: "Mixed till over granite gneiss",
    buildingCount: 5,
    center: [40.712, -75.771],
    boundary: {
      positions: [
        [40.721, -75.787],
        [40.723, -75.760],
        [40.703, -75.755],
        [40.701, -75.781],
      ],
    },
  },
  {
    id: "z4",
    name: "North Industrial Belt",
    riskLevel: "medium",
    aggregateScore: 47,
    geology: "Reclaimed phosphate processing land, variable fill soil",
    buildingCount: 5,
    center: [40.774, -75.828],
    boundary: {
      positions: [
        [40.784, -75.845],
        [40.787, -75.818],
        [40.767, -75.812],
        [40.764, -75.839],
      ],
    },
  },
  {
    id: "z5",
    name: "Riverside Flats",
    riskLevel: "low",
    aggregateScore: 21,
    geology: "Alluvial sediment, low bedrock permeability",
    buildingCount: 4,
    center: [40.701, -75.812],
    boundary: {
      positions: [
        [40.710, -75.828],
        [40.712, -75.800],
        [40.693, -75.796],
        [40.690, -75.820],
      ],
    },
  },
  {
    id: "z6",
    name: "Greenwood Heights",
    riskLevel: "low",
    aggregateScore: 17,
    geology: "Clay-rich topsoil over limestone",
    buildingCount: 4,
    center: [40.745, -75.741],
    boundary: {
      positions: [
        [40.754, -75.757],
        [40.756, -75.729],
        [40.737, -75.724],
        [40.734, -75.750],
      ],
    },
  },
];

const factorPool = {
  high: [
    "Elevated sub-slab radon concentration",
    "Uranium-bearing bedrock proximity",
    "Cracked foundation slab",
    "No active soil depressurization system",
    "Poor basement ventilation",
    "High soil gas permeability",
  ],
  medium: [
    "Moderate sub-slab radon concentration",
    "Basement used as living space",
    "Ventilation below recommended air changes/hour",
    "Older construction, unsealed foundation joints",
    "Sump pit uncovered",
  ],
  low: [
    "Trace sub-slab radon concentration",
    "Slab-on-grade foundation with sealed joints",
    "Good cross-ventilation",
    "Newer construction with vapor barrier",
  ],
};

function pick<T>(arr: T[], seed: number, n: number): T[] {
  const shuffled = [...arr].sort((a, b) => ((seed * arr.indexOf(a as any) + 1) % 7) - ((seed * arr.indexOf(b as any) + 1) % 7));
  return shuffled.slice(0, n);
}

function scoreToLevel(score: number): "low" | "medium" | "high" {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function readingsFor(base: number, trend: number): { date: string; radonPCiL: number }[] {
  const months = ["2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01"];
  return months.map((date, i) => ({
    date,
    radonPCiL: Math.max(0.2, Number((base + trend * i + (i % 2 === 0 ? 0.15 : -0.1)).toFixed(2))),
  }));
}

interface Seed {
  id: string;
  address: string;
  pincode: string;
  zoneId: string;
  lat: number;
  lng: number;
  score: number;
  ventilation: "poor" | "moderate" | "good";
  floorLevel: string;
  constructionYear: number;
  foundation: Building["foundation"];
  base: number;
  trend: number;
  updated: string;
}

const seeds: Seed[] = [
  // Old Quarry District — high risk
  { id: "B001", address: "12 Quarry Ridge Rd", pincode: "18401", zoneId: "z1", lat: 40.735, lng: -75.820, score: 91, ventilation: "poor", floorLevel: "Basement", constructionYear: 1968, foundation: "basement", base: 5.8, trend: 0.15, updated: "2025-08-28" },
  { id: "B002", address: "27 Millstone Ave", pincode: "18401", zoneId: "z1", lat: 40.738, lng: -75.815, score: 87, ventilation: "poor", floorLevel: "Basement", constructionYear: 1972, foundation: "basement", base: 5.1, trend: 0.1, updated: "2025-08-30" },
  { id: "B003", address: "4 Feldspar Ct", pincode: "18401", zoneId: "z1", lat: 40.731, lng: -75.809, score: 82, ventilation: "moderate", floorLevel: "Ground Floor", constructionYear: 1981, foundation: "crawl-space", base: 4.6, trend: 0.08, updated: "2025-08-25" },
  { id: "B004", address: "9 Bedrock Ln", pincode: "18402", zoneId: "z1", lat: 40.728, lng: -75.804, score: 79, ventilation: "poor", floorLevel: "Basement", constructionYear: 1965, foundation: "basement", base: 4.3, trend: 0.12, updated: "2025-08-22" },
  { id: "B005", address: "61 Granite Hollow", pincode: "18402", zoneId: "z1", lat: 40.726, lng: -75.812, score: 74, ventilation: "moderate", floorLevel: "1st Floor", constructionYear: 1990, foundation: "slab-on-grade", base: 3.9, trend: 0.05, updated: "2025-08-19" },
  { id: "B006", address: "15 Shaft House Rd", pincode: "18402", zoneId: "z1", lat: 40.740, lng: -75.808, score: 88, ventilation: "poor", floorLevel: "Basement", constructionYear: 1959, foundation: "basement", base: 5.4, trend: 0.14, updated: "2025-09-02" },

  // Slate Ridge — high risk
  { id: "B007", address: "3 Shale Crest Dr", pincode: "18403", zoneId: "z2", lat: 40.760, lng: -75.780, score: 85, ventilation: "poor", floorLevel: "Basement", constructionYear: 1975, foundation: "basement", base: 4.9, trend: 0.11, updated: "2025-08-27" },
  { id: "B008", address: "44 Blackrock Ave", pincode: "18403", zoneId: "z2", lat: 40.757, lng: -75.775, score: 80, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1983, foundation: "basement", base: 4.4, trend: 0.09, updated: "2025-08-21" },
  { id: "B009", address: "18 Outcrop Way", pincode: "18403", zoneId: "z2", lat: 40.753, lng: -75.768, score: 76, ventilation: "poor", floorLevel: "Ground Floor", constructionYear: 1970, foundation: "crawl-space", base: 4.1, trend: 0.1, updated: "2025-08-15" },
  { id: "B010", address: "22 Slate Hollow Rd", pincode: "18404", zoneId: "z2", lat: 40.751, lng: -75.774, score: 71, ventilation: "moderate", floorLevel: "1st Floor", constructionYear: 1994, foundation: "slab-on-grade", base: 3.7, trend: 0.06, updated: "2025-08-11" },
  { id: "B011", address: "7 Fault Line Ct", pincode: "18404", zoneId: "z2", lat: 40.762, lng: -75.766, score: 68, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1988, foundation: "basement", base: 3.5, trend: 0.07, updated: "2025-08-09" },

  // Hilltop Terrace — medium
  { id: "B012", address: "31 Summit View Dr", pincode: "18405", zoneId: "z3", lat: 40.715, lng: -75.777, score: 58, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1992, foundation: "basement", base: 2.9, trend: 0.04, updated: "2025-08-14" },
  { id: "B013", address: "6 Overlook Pl", pincode: "18405", zoneId: "z3", lat: 40.718, lng: -75.769, score: 51, ventilation: "moderate", floorLevel: "Ground Floor", constructionYear: 1997, foundation: "crawl-space", base: 2.6, trend: 0.03, updated: "2025-08-06" },
  { id: "B014", address: "58 Terrace Hill Rd", pincode: "18405", zoneId: "z3", lat: 40.709, lng: -75.763, score: 47, ventilation: "good", floorLevel: "1st Floor", constructionYear: 2004, foundation: "slab-on-grade", base: 2.2, trend: 0.02, updated: "2025-08-02" },
  { id: "B015", address: "14 Ridgeline Ave", pincode: "18406", zoneId: "z3", lat: 40.706, lng: -75.774, score: 55, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1989, foundation: "basement", base: 2.8, trend: 0.05, updated: "2025-08-18" },
  { id: "B016", address: "39 Vista Ct", pincode: "18406", zoneId: "z3", lat: 40.712, lng: -75.760, score: 42, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2010, foundation: "slab-on-grade", base: 1.9, trend: 0.01, updated: "2025-07-29" },

  // North Industrial Belt — medium
  { id: "B017", address: "88 Foundry St", pincode: "18407", zoneId: "z4", lat: 40.778, lng: -75.831, score: 62, ventilation: "poor", floorLevel: "Ground Floor", constructionYear: 1978, foundation: "slab-on-grade", base: 3.1, trend: 0.06, updated: "2025-08-20" },
  { id: "B018", address: "16 Mill Yard Rd", pincode: "18407", zoneId: "z4", lat: 40.775, lng: -75.824, score: 49, ventilation: "moderate", floorLevel: "1st Floor", constructionYear: 1995, foundation: "slab-on-grade", base: 2.3, trend: 0.03, updated: "2025-08-10" },
  { id: "B019", address: "5 Processing Ln", pincode: "18408", zoneId: "z4", lat: 40.771, lng: -75.819, score: 56, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1986, foundation: "basement", base: 2.9, trend: 0.05, updated: "2025-08-13" },
  { id: "B020", address: "72 Reclaim Ave", pincode: "18408", zoneId: "z4", lat: 40.780, lng: -75.816, score: 44, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2001, foundation: "slab-on-grade", base: 2.0, trend: 0.02, updated: "2025-07-31" },
  { id: "B021", address: "3 Tailings Ct", pincode: "18408", zoneId: "z4", lat: 40.783, lng: -75.822, score: 65, ventilation: "poor", floorLevel: "Basement", constructionYear: 1974, foundation: "basement", base: 3.3, trend: 0.07, updated: "2025-08-24" },

  // Riverside Flats — low
  { id: "B022", address: "21 Riverbank Dr", pincode: "18409", zoneId: "z5", lat: 40.704, lng: -75.814, score: 18, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2012, foundation: "slab-on-grade", base: 0.8, trend: 0.0, updated: "2025-07-20" },
  { id: "B023", address: "9 Floodplain Rd", pincode: "18409", zoneId: "z5", lat: 40.699, lng: -75.808, score: 24, ventilation: "good", floorLevel: "1st Floor", constructionYear: 2008, foundation: "slab-on-grade", base: 1.0, trend: 0.01, updated: "2025-07-22" },
  { id: "B024", address: "44 Delta View Ct", pincode: "18409", zoneId: "z5", lat: 40.696, lng: -75.804, score: 15, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2015, foundation: "slab-on-grade", base: 0.7, trend: 0.0, updated: "2025-07-18" },

  // Greenwood Heights — low
  { id: "B025", address: "10 Greenwood Ln", pincode: "18410", zoneId: "z6", lat: 40.748, lng: -75.740, score: 20, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2006, foundation: "slab-on-grade", base: 0.9, trend: 0.0, updated: "2025-07-15" },
  { id: "B026", address: "27 Limestone Way", pincode: "18410", zoneId: "z6", lat: 40.751, lng: -75.735, score: 26, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1999, foundation: "basement", base: 1.1, trend: 0.01, updated: "2025-07-25" },
];

export const buildings: Building[] = seeds.map((s, idx) => {
  const riskLevel = scoreToLevel(s.score);
  const factors = pick(factorPool[riskLevel], idx + 1, riskLevel === "low" ? 2 : 3);
  return {
    id: s.id,
    address: s.address,
    pincode: s.pincode,
    zoneId: s.zoneId,
    lat: s.lat,
    lng: s.lng,
    riskLevel,
    riskScore: s.score,
    drivingFactors: factors,
    ventilation: s.ventilation,
    floorLevel: s.floorLevel,
    constructionYear: s.constructionYear,
    foundation: s.foundation,
    lastUpdated: s.updated,
    sensorHistory: readingsFor(s.base, s.trend),
  };
});

export const mitigationLibrary: MitigationAction[] = [
  {
    factor: "Elevated sub-slab radon concentration",
    actions: [
      "Install an active soil depressurization (ASD) system",
      "Schedule a follow-up long-term radon test after mitigation",
    ],
  },
  {
    factor: "Uranium-bearing bedrock proximity",
    actions: [
      "Prioritize for municipal mitigation subsidy program",
      "Recommend annual retesting given geological baseline",
    ],
  },
  {
    factor: "Cracked foundation slab",
    actions: ["Seal foundation cracks and penetrations with polyurethane caulk", "Re-inspect slab integrity after sealing"],
  },
  {
    factor: "No active soil depressurization system",
    actions: ["Install ASD system with exterior vent stack", "Add manometer for system monitoring"],
  },
  {
    factor: "Poor basement ventilation",
    actions: ["Increase mechanical ventilation / air changes per hour", "Install a heat-recovery ventilator (HRV)"],
  },
  {
    factor: "High soil gas permeability",
    actions: ["Install a sub-slab vapor barrier", "Extend ASD suction points to cover full slab area"],
  },
  {
    factor: "Moderate sub-slab radon concentration",
    actions: ["Retest in 90 days to confirm trend", "Improve sub-slab ventilation as a precaution"],
  },
  {
    factor: "Basement used as living space",
    actions: ["Recommend short-term mitigation until ASD is installed", "Advise limiting extended occupancy until retested"],
  },
  {
    factor: "Ventilation below recommended air changes/hour",
    actions: ["Add trickle vents or an exhaust fan", "Educate occupants on regular natural ventilation"],
  },
  {
    factor: "Older construction, unsealed foundation joints",
    actions: ["Seal foundation-wall joints and utility penetrations", "Inspect sump pit and cover if open"],
  },
  {
    factor: "Sump pit uncovered",
    actions: ["Install an airtight sump pit cover with vent tie-in", "Route sump discharge to ASD stack if present"],
  },
  {
    factor: "Trace sub-slab radon concentration",
    actions: ["No action required beyond routine monitoring", "Retest at standard 3-year interval"],
  },
  {
    factor: "Slab-on-grade foundation with sealed joints",
    actions: ["Maintain current sealing; no further action needed"],
  },
  {
    factor: "Good cross-ventilation",
    actions: ["Maintain current ventilation practices"],
  },
  {
    factor: "Newer construction with vapor barrier",
    actions: ["Continue routine 3-year retesting cycle"],
  },
];

export function getZoneById(id: string): Zone | undefined {
  return zones.find((z) => z.id === id);
}

export function getBuildingById(id: string): Building | undefined {
  return buildings.find((b) => b.id === id);
}

export function getMitigationsForFactors(factors: string[]): MitigationAction[] {
  return factors
    .map((f) => mitigationLibrary.find((m) => m.factor === f))
    .filter((m): m is MitigationAction => Boolean(m));
}

export function searchBuildings(query: string): Building[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return buildings.filter(
    (b) => b.address.toLowerCase().includes(q) || b.pincode.includes(q)
  );
}
