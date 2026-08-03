import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Enable TLS for hosted Postgres (Supabase/Neon) during migrations. Append
// sslmode=no-verify (accept the provider cert) when a hosted URL doesn't already
// specify an sslmode, so `drizzle-kit push` connects the same as the runtime pool.
let connectionString = process.env.DATABASE_URL as string;
const isLocal = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/)/.test(connectionString);
if (connectionString && !isLocal && !/sslmode=/.test(connectionString)) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=no-verify";
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  driver: "pg",
  dbCredentials: {
    connectionString,
  },
});
