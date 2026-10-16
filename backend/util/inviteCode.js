const crypto = require("crypto");
const supabase = require("../config/supabase");
const { orThrow } = require("./rows");

// Stored as a row in the existing `counters` table (id/sum) so no schema migration is needed.
const INVITE_COUNTER_ID = "staff_invite_code";
const ENV_OVERRIDE = process.env.STAFF_INVITE_CODE;

const generateCode = () => String(crypto.randomInt(100000, 1000000));

// Current invite code. Priority: STAFF_INVITE_CODE env override > stored value > newly generated.
const getInviteCode = async () => {
  if (ENV_OVERRIDE && /^\d{4,12}$/.test(ENV_OVERRIDE)) {
    return ENV_OVERRIDE;
  }

  const existing = orThrow(
    await supabase.from("counters").select("seq").eq("id", INVITE_COUNTER_ID).maybeSingle()
  );
  if (existing) return String(existing.seq);

  await supabase
    .from("counters")
    .upsert({ id: INVITE_COUNTER_ID, seq: Number(generateCode()) }, { onConflict: "id", ignoreDuplicates: true });
  const row = orThrow(
    await supabase.from("counters").select("seq").eq("id", INVITE_COUNTER_ID).single()
  );
  return String(row.seq);
};

const verifyInviteCode = async (input) => {
  if (typeof input !== "string" || !input.trim()) return false;
  const expected = await getInviteCode();
  const provided = Buffer.from(input.trim());
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length) return false;
  return crypto.timingSafeEqual(provided, wanted);
};

module.exports = { getInviteCode, verifyInviteCode };
