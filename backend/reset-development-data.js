require("dotenv").config();
const supabase = require("./config/supabase");

const TABLES = ["payments", "orders", "customers"];

// PostgREST wants a filter on a delete; ids are always non-empty hex, so this
// matches every row without relying on an unfiltered delete being allowed.
const clear = async (table) => {
  const { error } = await supabase.from(table).delete().neq("id", "");
  if (error) throw new Error(`${table}: ${error.message}`);
};

const total = async (table) => {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count || 0;
};

const snapshot = async () => {
  const counts = {};
  for (const table of [...TABLES, "users", "services", "counters"]) counts[table] = await total(table);
  return counts;
};

const resetDevelopmentData = async () => {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Refusing to reset data unless NODE_ENV is explicitly set to development.");
  }
  if (process.env.RESET_DEVELOPMENT_DATA !== "1") {
    throw new Error("Set RESET_DEVELOPMENT_DATA=1 to confirm this development reset.");
  }

  console.log("Before reset:", await snapshot());
  // Payments hold a foreign key to orders, and orders to customers, so the
  // child tables go first.
  for (const table of TABLES) await clear(table);
  console.log("After reset:", await snapshot());
  console.log("Cleared only Customers, Orders, and Payments.");
};

resetDevelopmentData().catch((err) => {
  console.error("Development data reset failed:", err.message);
  process.exitCode = 1;
});
