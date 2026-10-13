const crypto = require("crypto");

// 24-char hex — the same shape as a Mongo ObjectId. Rows migrated out of Atlas
// keep their ids (so every foreign key still lines up) and the frontend's
// `_id` usage carries over untouched.
const newId = () => crypto.randomBytes(12).toString("hex");

// Postgres stores the key as `id`; the API the React app speaks uses `_id`.
const toApi = (value) => {
  if (Array.isArray(value)) return value.map(toApi);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  const { id, ...rest } = value;
  const mapped = {};
  for (const [key, entry] of Object.entries(rest)) mapped[key] = toApi(entry);
  if (id !== undefined) mapped._id = id;
  return mapped;
};

const orThrow = ({ data, error }) => {
  if (error) {
    const wrapped = new Error(error.message);
    wrapped.code = error.code;
    wrapped.details = error.details;
    throw wrapped;
  }
  return data;
};

const count = async (query) => {
  const { count: total, error } = await query;
  if (error) throw new Error(error.message);
  return total || 0;
};

const sum = (rows, field) =>
  rows.reduce((total, row) => total + Number(row[field] || 0), 0);

// Postgres rejects a column it has never seen, so a stray key in the request
// body would 500 instead of being ignored the way Mongoose did.
const pick = (body, fields) =>
  fields.reduce((acc, field) => {
    if (body[field] !== undefined) acc[field] = body[field];
    return acc;
  }, {});

module.exports = { newId, toApi, orThrow, count, sum, pick };

