require("dotenv").config();
const bcrypt = require("bcryptjs");
const supabase = require("./config/supabase");
const { newId, orThrow } = require("./util/rows");

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const staffPassword = process.env.SEED_STAFF_PASSWORD;
if (!adminPassword || adminPassword.length < 12 || !staffPassword || staffPassword.length < 12) {
  throw new Error("Set SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD to unique passwords of at least 12 characters before seeding.");
}

const ACCOUNTS = [
  {
    name: "Shop Owner",
    email: "admin@laundrytrack.com",
    legacyEmail: "admin@laundritrack.com",
    password: adminPassword,
    role: "admin",
  },
  {
    name: "Staff Juan",
    email: "staff@laundrytrack.com",
    legacyEmail: "staff@laundritrack.com",
    password: staffPassword,
    role: "staff",
  },
];

// Starter services (para may mapipili agad paggawa ng order)
const SERVICES = [
  { serviceName: "Wash & Fold", description: "Machine wash, dry, and fold", price: 60, unit: "kg" },
  { serviceName: "Wash & Press", description: "Machine wash with ironing", price: 80, unit: "kg" },
  { serviceName: "Dry Clean", description: "Professional dry cleaning", price: 120, unit: "kg" },
];

const seed = async () => {
  for (const account of ACCOUNTS) {
    let existing = orThrow(
      await supabase.from("users").select("id").eq("email", account.email).maybeSingle()
    );
    if (!existing && account.legacyEmail) {
      existing = orThrow(
        await supabase.from("users").select("id").eq("email", account.legacyEmail).maybeSingle()
      );
    }
    const hashedPassword = await bcrypt.hash(account.password, 10);
    if (existing) {
      orThrow(
        await supabase
          .from("users")
          .update({
            email: account.email,
            password: hashedPassword,
            role: account.role,
            isTwoFactorEnabled: false,
          })
          .eq("id", existing.id)
      );
      console.log(`🔄 Password reset for existing account: ${account.email}`);
      continue;
    }
    orThrow(
      await supabase.from("users").insert({
        id: newId(),
        name: account.name,
        email: account.email,
        password: hashedPassword,
        role: account.role,
        isTwoFactorEnabled: false,
      })
    );
    console.log(`✅ Account created: ${account.email}`);
  }

  for (const service of SERVICES) {
    const existing = orThrow(
      await supabase.from("services").select("id").eq("serviceName", service.serviceName).maybeSingle()
    );
    if (existing) {
      console.log(`ℹ️ Service already exists: ${service.serviceName}`);
      continue;
    }
    orThrow(await supabase.from("services").insert({ id: newId(), ...service }));
    console.log(`✅ Service created: ${service.serviceName}`);
  }

  console.log("\n🎉 Seeding complete! You can now login.");
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error seeding database:", err.message);
    process.exit(1);
  });
