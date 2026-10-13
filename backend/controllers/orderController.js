const supabase = require("../config/supabase");
const { newId, toApi, orThrow, count } = require("../util/rows");
const { decrypt, escapeHtml } = require("../util/crypto");
const { logActivity } = require("../util/auditLogger");

const ORDER_STATUSES = ["Received", "Washing", "Drying", "Folding", "Ready for Pickup", "Claimed"];
const WITH_RELATIONS = "*, customer:customers(*), service:services(*)";

const decryptCustomerRelation = (customer) => {
  if (!customer) return customer;
  return {
    ...customer,
    name: escapeHtml(customer.name),
    phone: decrypt(customer.phone),
    address: customer.address ? escapeHtml(decrypt(customer.address)) : customer.address,
  };
};

const getPaymentStatus = (totalPaid, totalAmount) => {
  if (totalPaid >= totalAmount) return "PAID";
  if (totalPaid > 0) return "PARTIALLY PAID";
  return "UNPAID";
};

const paidByOrder = async (orderIds) => {
  const totals = new Map();
  if (!orderIds.length) return totals;
  const rows = orThrow(
    await supabase.from("payments").select("orderId, amount").in("orderId", orderIds)
  );
  for (const row of rows) totals.set(row.orderId, (totals.get(row.orderId) || 0) + Number(row.amount));
  return totals;
};

const syncPaymentStatus = async (order, totalPaid) => {
  const paymentStatus = getPaymentStatus(totalPaid, order.totalAmount);
  if (order.paymentStatus !== paymentStatus) {
    orThrow(await supabase.from("orders").update({ paymentStatus }).eq("id", order.id).select());
    order.paymentStatus = paymentStatus;
  }
  return order;
};

const orderWithPaymentTotals = (order, totalPaid) => {
  const { customer, service, ...rest } = order;
  const decryptedCustomer = decryptCustomerRelation(customer);
  return {
    ...toApi(rest),
    customerId: toApi(decryptedCustomer ?? null),
    serviceId: toApi(service ?? null),
    paidAmount: totalPaid,
    remainingBalance: Math.max(0, order.totalAmount - totalPaid),
  };
};

const matchesTerm = (value, term) => String(value ?? "").toLowerCase().includes(term);

const generateOrderNumber = async () => {
  for (;;) {
    const rows = orThrow(await supabase.rpc("next_sequence", { counter_id: "orderNumber" }));
    const orderNumber = `LAUNDRY-${1000 + Number(rows[0].next_seq)}`;
    const clash = orThrow(
      await supabase.from("orders").select("id").eq("orderNumber", orderNumber).maybeSingle()
    );
    if (!clash) return orderNumber;
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { search, status, paymentStatus } = req.query;
    let query = supabase.from("orders").select(WITH_RELATIONS).order("createdAt", { ascending: false });
    if (status) query = query.eq("orderStatus", status);
    if (paymentStatus) query = query.eq("paymentStatus", paymentStatus);
    const rows = orThrow(await query);

    const term = String(search || "").toLowerCase();
    const visible = term
      ? rows.filter(
          (row) =>
            matchesTerm(row.orderNumber, term) ||
            matchesTerm(row.customer?.name, term) ||
            matchesTerm(decrypt(row.customer?.phone), term)
        )
      : rows;

    const totals = await paidByOrder(visible.map((row) => row.id));
    await Promise.all(visible.map((row) => syncPaymentStatus(row, totals.get(row.id) || 0)));
    res.json(visible.map((row) => orderWithPaymentTotals(row, totals.get(row.id) || 0)));
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = orThrow(
      await supabase.from("orders").select(WITH_RELATIONS).eq("id", req.params.id).maybeSingle()
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    const totals = await paidByOrder([order.id]);
    const totalPaid = totals.get(order.id) || 0;
    await syncPaymentStatus(order, totalPaid);
    res.json(orderWithPaymentTotals(order, totalPaid));
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { customerId, serviceId, weight } = req.body;
    if (!customerId) return res.status(400).json({ message: "Customer is required" });
    if (!(Number(weight) > 0)) return res.status(400).json({ message: "Weight must be greater than 0" });

    const service = orThrow(
      await supabase.from("services").select().eq("id", serviceId).maybeSingle()
    );
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.status !== "active") return res.status(400).json({ message: "Service is inactive" });

    const orderNumber = await generateOrderNumber();
    const order = orThrow(
      await supabase
        .from("orders")
        .insert({
          id: newId(),
          orderNumber,
          customerId,
          serviceId,
          weight: Number(weight),
          pricePerKg: service.price,
          totalAmount: service.price * Number(weight),
        })
        .select()
        .single()
    );

    const apiOrder = toApi(order);

    await logActivity({
      req,
      action: "ORDER_CREATED",
      resource: "orders",
      resourceId: apiOrder._id,
      details: { orderNumber, customerId, totalAmount: apiOrder.totalAmount },
    });

    res.status(201).json(apiOrder);
  } catch (err) {
    next(err);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const { customerId, serviceId, weight } = req.body;
    const order = orThrow(
      await supabase.from("orders").select().eq("id", req.params.id).maybeSingle()
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    const update = {};
    if (customerId) update.customerId = customerId;
    if (serviceId) update.serviceId = serviceId;
    if (weight !== undefined) {
      if (!(Number(weight) > 0)) return res.status(400).json({ message: "Weight must be greater than 0" });
      update.weight = Number(weight);
    }

    if (serviceId || weight !== undefined) {
      const service = orThrow(
        await supabase
          .from("services")
          .select()
          .eq("id", serviceId || order.serviceId)
          .maybeSingle()
      );
      if (!service) return res.status(404).json({ message: "Service not found" });
      const nextWeight = weight !== undefined ? Number(weight) : order.weight;
      update.pricePerKg = service.price;
      update.totalAmount = service.price * nextWeight;
    }

    if (!Object.keys(update).length) return res.json(toApi(order));

    const rows = orThrow(
      await supabase.from("orders").update(update).eq("id", order.id).select()
    );

    const apiOrder = toApi(rows[0] ?? null);

    await logActivity({
      req,
      action: "ORDER_UPDATED",
      resource: "orders",
      resourceId: order.id,
      details: update,
    });

    res.json(apiOrder);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    if (!ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const existing = orThrow(
      await supabase.from("orders").select("orderStatus").eq("id", req.params.id).maybeSingle()
    );
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const update = { orderStatus };
    if (orderStatus === "Claimed") update.claimedAt = new Date().toISOString();
    if (orderStatus === "Ready for Pickup") update.completedAt = new Date().toISOString();

    const rows = orThrow(
      await supabase.from("orders").update(update).eq("id", req.params.id).select()
    );
    if (!rows.length) return res.status(404).json({ message: "Order not found" });

    const apiOrder = toApi(rows[0]);

    await logActivity({
      req,
      action: "ORDER_STATUS_CHANGED",
      resource: "orders",
      resourceId: req.params.id,
      details: { previousStatus: existing.orderStatus, newStatus: orderStatus },
    });

    res.json(apiOrder);
  } catch (err) {
    next(err);
  }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    const order = orThrow(
      await supabase.from("orders").select("id, orderNumber").eq("id", req.params.id).maybeSingle()
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    const paymentCount = await count(
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("orderId", order.id)
    );
    if (paymentCount > 0) {
      return res.status(400).json({ message: "Cannot delete an order that has payments" });
    }

    orThrow(await supabase.from("orders").delete().eq("id", order.id));

    await logActivity({
      req,
      action: "ORDER_DELETED",
      resource: "orders",
      resourceId: order.id,
      details: { orderNumber: order.orderNumber },
    });

    res.json({ message: "Order deleted" });
  } catch (err) {
    next(err);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const order = orThrow(
      await supabase
        .from("orders")
        .select("*, customer:customers(name), service:services(serviceName, unit)")
        .eq("orderNumber", req.params.orderNumber)
        .maybeSingle()
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { customer, service, ...rest } = order;
    res.json({
      ...toApi(rest),
      customerId: toApi(customer ? { ...customer, name: escapeHtml(customer.name) } : null),
      serviceId: toApi(service ?? null),
    });
  } catch (err) {
    next(err);
  }
};
