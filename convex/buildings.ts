import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("buildings").collect();
  },
});

export const getById = query({
  args: { buildingId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("buildings")
      .withIndex("by_building_id", (q) => q.eq("buildingId", args.buildingId))
      .first();
  },
});

export const getByZone = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("buildings")
      .withIndex("by_zone_id", (q) => q.eq("zoneId", args.zoneId))
      .collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase().trim();
    if (!term) return [];
    const all = await ctx.db.query("buildings").collect();
    return all.filter(
      (b) =>
        b.address.toLowerCase().includes(term) ||
        b.pincode.toLowerCase().includes(term) ||
        b.buildingId.toLowerCase().includes(term)
    );
  },
});

export const addReading = mutation({
  args: {
    buildingId: v.string(),
    radonPCiL: v.number(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const building = await ctx.db
      .query("buildings")
      .withIndex("by_building_id", (q) => q.eq("buildingId", args.buildingId))
      .first();

    if (!building) {
      throw new Error(`Building not found: ${args.buildingId}`);
    }

    const updatedHistory = [
      ...building.sensorHistory,
      { date: args.date, radonPCiL: args.radonPCiL },
    ];

    await ctx.db.patch(building._id, {
      sensorHistory: updatedHistory,
      lastUpdated: args.date,
    });
  },
});
