import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  zones: defineTable({
    zoneId: v.string(),
    name: v.string(),
    riskLevel: v.string(), // "low" | "medium" | "high"
    aggregateScore: v.number(),
    geology: v.string(),
    buildingCount: v.number(),
    center: v.array(v.number()),
    boundaryPositions: v.array(v.array(v.number())),
  }).index("by_zone_id", ["zoneId"]),

  buildings: defineTable({
    buildingId: v.string(),
    address: v.string(),
    pincode: v.string(),
    zoneId: v.string(),
    lat: v.number(),
    lng: v.number(),
    riskLevel: v.string(), // "low" | "medium" | "high"
    riskScore: v.number(),
    drivingFactors: v.array(v.string()),
    ventilation: v.string(), // "poor" | "moderate" | "good"
    floorLevel: v.string(),
    constructionYear: v.number(),
    foundation: v.string(),
    lastUpdated: v.string(),
    sensorHistory: v.array(
      v.object({
        date: v.string(),
        radonPCiL: v.number(),
      })
    ),
  })
    .index("by_building_id", ["buildingId"])
    .index("by_zone_id", ["zoneId"])
    .index("by_pincode", ["pincode"]),
});
