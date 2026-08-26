import path from "node:path";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  experimental: {
    adapter: true,
  },
  engine: "js",
  adapter: async () =>
    new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});
