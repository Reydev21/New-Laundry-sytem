const supabase = require("../config/supabase");
const { newId, toApi, orThrow, count, pick } = require("../util/rows");
const { encrypt, decrypt, escapeHtml } = require("../util/crypto");
const { logActivity } = require("../util/auditLogger");

const EDITABLE = ["name", "phone", "address", "email"];

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
    const payload = prepareCustomerPayload(req.body);
    if (!payload.name || !req.body.phone) {
      return res.status(400).json({ message: "Name and phone number are required" });
    }

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
