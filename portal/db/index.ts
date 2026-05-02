import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// One connection pool per process. Auth.js + Route Handlers reuse it.
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
export { schema };
