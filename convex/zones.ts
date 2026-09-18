import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("zones").collect();
  },
});

export const getById = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("zones")
      .withIndex("by_zone_id", (q) => q.eq("zoneId", args.zoneId))
      .first();
  },
});
