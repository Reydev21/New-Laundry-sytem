const supabase = require("../config/supabase");
const { newId, toApi, orThrow, count, pick } = require("../util/rows");
const { encrypt, decrypt, escapeHtml } = require("../util/crypto");
const { logActivity } = require("../util/auditLogger");

const EDITABLE = ["name", "phone", "address", "email"];

const validateCustomerPayload = (body, isCreate) => {
  const supplied = EDITABLE.filter((field) => body[field] !== undefined);
  if (isCreate && (typeof body.name !== "string" || !body.name.trim())) {
    return "Name is required";
  }
  if (isCreate && (typeof body.phone !== "string" || !body.phone.trim())) {
    return "Name and phone number are required";
  }
  if (!isCreate && !supplied.length) {
    return "At least one customer field is required";
  }
  if (body.name !== undefined &&
    (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120)) {
    return "Name must be between 1 and 120 characters";
  }
  if (body.phone !== undefined &&
    (typeof body.phone !== "string" || !/^[0-9+().\- ]{7,32}$/.test(body.phone.trim()))) {
    return "A valid phone number is required";
  }
  if (body.address !== undefined && (typeof body.address !== "string" || body.address.length > 500)) {
    return "Address must be at most 500 characters";
  }
  if (body.email !== undefined &&
    (typeof body.email !== "string" || body.email.length > 254 ||
      (body.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())))) {
    return "A valid email address is required";
  }
  return null;
};

/**
 * Decrypt sensitive fields when reading from database
 */
const decryptCustomer = (customer) => {
  if (!customer) return customer;
  return {
    ...customer,
    name: escapeHtml(customer.name),
    phone: decrypt(customer.phone),
    address: customer.address ? escapeHtml(decrypt(customer.address)) : customer.address,
    email: customer.email ? escapeHtml(customer.email) : customer.email,
  };
};

/**
 * Encrypt sensitive fields before storing into database
 */
const prepareCustomerPayload = (body) => {
  const payload = pick(body, EDITABLE);
  if (payload.phone) payload.phone = encrypt(payload.phone.trim());
  if (payload.address) payload.address = encrypt(payload.address.trim());
  if (payload.name) payload.name = payload.name.trim();
  if (payload.email) payload.email = payload.email.trim();
  return payload;
};

const matches = (row, term) => {
  const decryptedPhone = decrypt(row.phone);
  return [row.name, decryptedPhone].some((field) =>
    String(field ?? "").toLowerCase().includes(term)
  );
};

exports.getCustomers = async (req, res, next) => {
  try {
    const rows = orThrow(
      await supabase
        .from("customers")
        .select()
        .order("createdAt", { ascending: false })
    );
    const term = String(req.query.search || "").toLowerCase();
    const filtered = term ? rows.filter((row) => matches(row, term)) : rows;
    res.json(filtered.map(decryptCustomer).map(toApi));
  } catch (err) {
    next(err);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = orThrow(
      await supabase.from("customers").select().eq("id", req.params.id).maybeSingle()
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(toApi(decryptCustomer(customer)));
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const validationError = validateCustomerPayload(req.body, true);
    if (validationError) return res.status(400).json({ message: validationError });

    const payload = prepareCustomerPayload(req.body);

    const customer = orThrow(
      await supabase
        .from("customers")
        .insert({ id: newId(), ...payload })
        .select()
        .single()
    );

    const decrypted = decryptCustomer(customer);
    const apiCustomer = toApi(decrypted);

    await logActivity({
      req,
      action: "CUSTOMER_CREATED",
      resource: "customers",
      resourceId: apiCustomer._id,
      details: { name: apiCustomer.name },
    });

    res.status(201).json(apiCustomer);
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const validationError = validateCustomerPayload(req.body, false);
    if (validationError) return res.status(400).json({ message: validationError });

    const payload = prepareCustomerPayload(req.body);
    const rows = orThrow(
      await supabase
        .from("customers")
        .update(payload)
        .eq("id", req.params.id)
        .select()
    );
    if (!rows.length) return res.status(404).json({ message: "Customer not found" });

    const decrypted = decryptCustomer(rows[0]);
    const apiCustomer = toApi(decrypted);

    await logActivity({
      req,
      action: "CUSTOMER_UPDATED",
      resource: "customers",
      resourceId: apiCustomer._id,
      details: { name: apiCustomer.name },
    });

    res.json(apiCustomer);
  } catch (err) {
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = orThrow(
      await supabase.from("customers").select().eq("id", req.params.id).maybeSingle()
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const orderCount = await count(
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customerId", customer.id)
    );
    if (orderCount > 0) {
      return res.status(400).json({ message: "Cannot delete a customer that has orders" });
    }

    orThrow(await supabase.from("customers").delete().eq("id", customer.id));

    await logActivity({
      req,
      action: "CUSTOMER_DELETED",
      resource: "customers",
      resourceId: customer.id,
      details: { name: customer.name },
    });

    res.json({ message: "Customer deleted" });
  } catch (err) {
    next(err);
  }
};
