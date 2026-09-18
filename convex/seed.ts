import { mutation } from "./_generated/server";

export const zonesData = [
  {
    zoneId: "z1",
    name: "Old Quarry District",
    riskLevel: "high",
    aggregateScore: 84,
    geology: "Fractured uranium-bearing granite, shallow bedrock",
    buildingCount: 6,
    center: [40.732, -75.812],
    boundaryPositions: [
      [40.741, -75.828],
      [40.744, -75.803],
      [40.726, -75.798],
      [40.722, -75.822],
    ],
  },
  {
    zoneId: "z2",
    name: "Slate Ridge",
    riskLevel: "high",
    aggregateScore: 78,
    geology: "Black shale outcrops, elevated soil permeability",
    buildingCount: 5,
    center: [40.756, -75.774],
    boundaryPositions: [
      [40.765, -75.790],
      [40.768, -75.762],
      [40.749, -75.756],
      [40.746, -75.784],
    ],
  },
  {
    zoneId: "z3",
    name: "Hilltop Terrace",
    riskLevel: "medium",
    aggregateScore: 54,
    geology: "Mixed till over granite gneiss",
    buildingCount: 5,
    center: [40.712, -75.771],
    boundaryPositions: [
      [40.721, -75.787],
      [40.723, -75.760],
      [40.703, -75.755],
      [40.701, -75.781],
    ],
  },
  {
    zoneId: "z4",
    name: "North Industrial Belt",
    riskLevel: "medium",
    aggregateScore: 47,
    geology: "Reclaimed phosphate processing land, variable fill soil",
    buildingCount: 5,
    center: [40.774, -75.828],
    boundaryPositions: [
      [40.784, -75.845],
      [40.787, -75.818],
      [40.767, -75.812],
      [40.764, -75.839],
    ],
  },
  {
    zoneId: "z5",
    name: "Riverside Flats",
    riskLevel: "low",
    aggregateScore: 21,
    geology: "Alluvial sediment, low bedrock permeability",
    buildingCount: 4,
    center: [40.701, -75.812],
    boundaryPositions: [
      [40.710, -75.828],
      [40.712, -75.800],
      [40.693, -75.796],
      [40.690, -75.820],
    ],
  },
  {
    zoneId: "z6",
    name: "Greenwood Heights",
    riskLevel: "low",
    aggregateScore: 17,
    geology: "Clay-rich topsoil over limestone",
    buildingCount: 4,
    center: [40.745, -75.741],
    boundaryPositions: [
      [40.754, -75.757],
      [40.756, -75.729],
      [40.737, -75.724],
      [40.734, -75.750],
    ],
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

function pick(arr: string[], seed: number, n: number): string[] {
  const shuffled = [...arr].sort(
    (a, b) =>
      ((seed * arr.indexOf(a) + 1) % 7) - ((seed * arr.indexOf(b) + 1) % 7)
  );
  return shuffled.slice(0, n);
}

function scoreToLevel(score: number): "low" | "medium" | "high" {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function readingsFor(base: number, trend: number) {
  const months = [
    "2025-03-01",
    "2025-04-01",
    "2025-05-01",
    "2025-06-01",
    "2025-07-01",
    "2025-08-01",
  ];
  return months.map((date, i) => ({
    date,
    radonPCiL: Math.max(
      0.2,
      Number((base + trend * i + (i % 2 === 0 ? 0.15 : -0.1)).toFixed(2))
    ),
  }));
}

const seeds = [
  { id: "B001", address: "12 Quarry Ridge Rd", pincode: "18401", zoneId: "z1", lat: 40.735, lng: -75.820, score: 91, ventilation: "poor", floorLevel: "Basement", constructionYear: 1968, foundation: "basement", base: 5.8, trend: 0.15, updated: "2025-08-28" },
  { id: "B002", address: "27 Millstone Ave", pincode: "18401", zoneId: "z1", lat: 40.738, lng: -75.815, score: 87, ventilation: "poor", floorLevel: "Basement", constructionYear: 1972, foundation: "basement", base: 5.1, trend: 0.1, updated: "2025-08-30" },
  { id: "B003", address: "4 Feldspar Ct", pincode: "18401", zoneId: "z1", lat: 40.731, lng: -75.809, score: 82, ventilation: "moderate", floorLevel: "Ground Floor", constructionYear: 1981, foundation: "crawl-space", base: 4.6, trend: 0.08, updated: "2025-08-25" },
  { id: "B004", address: "9 Bedrock Ln", pincode: "18402", zoneId: "z1", lat: 40.728, lng: -75.804, score: 79, ventilation: "poor", floorLevel: "Basement", constructionYear: 1965, foundation: "basement", base: 4.3, trend: 0.12, updated: "2025-08-22" },
  { id: "B005", address: "61 Granite Hollow", pincode: "18402", zoneId: "z1", lat: 40.726, lng: -75.812, score: 74, ventilation: "moderate", floorLevel: "1st Floor", constructionYear: 1990, foundation: "slab-on-grade", base: 3.9, trend: 0.05, updated: "2025-08-19" },
  { id: "B006", address: "15 Shaft House Rd", pincode: "18402", zoneId: "z1", lat: 40.740, lng: -75.808, score: 88, ventilation: "poor", floorLevel: "Basement", constructionYear: 1959, foundation: "basement", base: 5.4, trend: 0.14, updated: "2025-09-02" },
  { id: "B007", address: "3 Shale Crest Dr", pincode: "18403", zoneId: "z2", lat: 40.760, lng: -75.780, score: 85, ventilation: "poor", floorLevel: "Basement", constructionYear: 1975, foundation: "basement", base: 4.9, trend: 0.11, updated: "2025-08-27" },
  { id: "B008", address: "44 Blackrock Ave", pincode: "18403", zoneId: "z2", lat: 40.757, lng: -75.775, score: 80, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1983, foundation: "basement", base: 4.4, trend: 0.09, updated: "2025-08-21" },
  { id: "B009", address: "18 Outcrop Way", pincode: "18403", zoneId: "z2", lat: 40.753, lng: -75.768, score: 76, ventilation: "poor", floorLevel: "Ground Floor", constructionYear: 1970, foundation: "crawl-space", base: 4.1, trend: 0.1, updated: "2025-08-15" },
  { id: "B010", address: "22 Slate Hollow Rd", pincode: "18404", zoneId: "z2", lat: 40.751, lng: -75.774, score: 71, ventilation: "moderate", floorLevel: "1st Floor", constructionYear: 1994, foundation: "slab-on-grade", base: 3.7, trend: 0.06, updated: "2025-08-11" },
  { id: "B011", address: "7 Fault Line Ct", pincode: "18404", zoneId: "z2", lat: 40.762, lng: -75.766, score: 68, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1988, foundation: "basement", base: 3.5, trend: 0.07, updated: "2025-08-09" },
  { id: "B012", address: "31 Summit View Dr", pincode: "18405", zoneId: "z3", lat: 40.715, lng: -75.777, score: 58, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1992, foundation: "basement", base: 2.9, trend: 0.04, updated: "2025-08-14" },
  { id: "B013", address: "6 Overlook Pl", pincode: "18405", zoneId: "z3", lat: 40.718, lng: -75.769, score: 51, ventilation: "moderate", floorLevel: "Ground Floor", constructionYear: 1997, foundation: "crawl-space", base: 2.6, trend: 0.03, updated: "2025-08-06" },
  { id: "B014", address: "58 Terrace Hill Rd", pincode: "18405", zoneId: "z3", lat: 40.709, lng: -75.763, score: 47, ventilation: "good", floorLevel: "1st Floor", constructionYear: 2004, foundation: "slab-on-grade", base: 2.2, trend: 0.02, updated: "2025-08-02" },
  { id: "B015", address: "14 Ridgeline Ave", pincode: "18406", zoneId: "z3", lat: 40.706, lng: -75.774, score: 55, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1989, foundation: "basement", base: 2.8, trend: 0.05, updated: "2025-08-18" },
  { id: "B016", address: "39 Vista Ct", pincode: "18406", zoneId: "z3", lat: 40.712, lng: -75.760, score: 42, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2010, foundation: "slab-on-grade", base: 1.9, trend: 0.01, updated: "2025-07-29" },
  { id: "B017", address: "88 Foundry St", pincode: "18407", zoneId: "z4", lat: 40.778, lng: -75.831, score: 62, ventilation: "poor", floorLevel: "Ground Floor", constructionYear: 1978, foundation: "slab-on-grade", base: 3.1, trend: 0.06, updated: "2025-08-20" },
  { id: "B018", address: "16 Mill Yard Rd", pincode: "18407", zoneId: "z4", lat: 40.775, lng: -75.824, score: 49, ventilation: "moderate", floorLevel: "1st Floor", constructionYear: 1995, foundation: "slab-on-grade", base: 2.3, trend: 0.03, updated: "2025-08-10" },
  { id: "B019", address: "5 Processing Ln", pincode: "18408", zoneId: "z4", lat: 40.771, lng: -75.819, score: 56, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1986, foundation: "basement", base: 2.9, trend: 0.05, updated: "2025-08-13" },
  { id: "B020", address: "72 Reclaim Ave", pincode: "18408", zoneId: "z4", lat: 40.780, lng: -75.816, score: 44, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2001, foundation: "slab-on-grade", base: 2.0, trend: 0.02, updated: "2025-07-31" },
  { id: "B021", address: "3 Tailings Ct", pincode: "18408", zoneId: "z4", lat: 40.783, lng: -75.822, score: 65, ventilation: "poor", floorLevel: "Basement", constructionYear: 1974, foundation: "basement", base: 3.3, trend: 0.07, updated: "2025-08-24" },
  { id: "B022", address: "21 Riverbank Dr", pincode: "18409", zoneId: "z5", lat: 40.704, lng: -75.814, score: 18, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2012, foundation: "slab-on-grade", base: 0.8, trend: 0.0, updated: "2025-07-20" },
  { id: "B023", address: "9 Floodplain Rd", pincode: "18409", zoneId: "z5", lat: 40.699, lng: -75.808, score: 24, ventilation: "good", floorLevel: "1st Floor", constructionYear: 2008, foundation: "slab-on-grade", base: 1.0, trend: 0.01, updated: "2025-07-22" },
  { id: "B024", address: "44 Delta View Ct", pincode: "18409", zoneId: "z5", lat: 40.696, lng: -75.804, score: 15, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2015, foundation: "slab-on-grade", base: 0.7, trend: 0.0, updated: "2025-07-18" },
  { id: "B025", address: "10 Greenwood Ln", pincode: "18410", zoneId: "z6", lat: 40.748, lng: -75.740, score: 20, ventilation: "good", floorLevel: "Ground Floor", constructionYear: 2006, foundation: "slab-on-grade", base: 0.9, trend: 0.0, updated: "2025-07-15" },
  { id: "B026", address: "27 Limestone Way", pincode: "18410", zoneId: "z6", lat: 40.751, lng: -75.735, score: 26, ventilation: "moderate", floorLevel: "Basement", constructionYear: 1999, foundation: "basement", base: 1.1, trend: 0.01, updated: "2025-07-25" },
];

export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete existing
    const existingZones = await ctx.db.query("zones").collect();
    for (const z of existingZones) {
      await ctx.db.delete(z._id);
    }
    const existingBuildings = await ctx.db.query("buildings").collect();
    for (const b of existingBuildings) {
      await ctx.db.delete(b._id);
    }

    // Insert zones
    for (const z of zonesData) {
      await ctx.db.insert("zones", z);
    }

    // Insert buildings
    for (let idx = 0; idx < seeds.length; idx++) {
      const s = seeds[idx];
      const riskLevel = scoreToLevel(s.score);
      const factors = pick(factorPool[riskLevel], idx + 1, riskLevel === "low" ? 2 : 3);
      await ctx.db.insert("buildings", {
        buildingId: s.id,
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
      });
    }

    return {
      zonesCount: zonesData.length,
      buildingsCount: seeds.length,
    };
  },
});
