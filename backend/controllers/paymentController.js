const supabase = require("../config/supabase");
const { newId, toApi, orThrow, sum } = require("../util/rows");
const { logActivity, logTransaction } = require("../util/auditLogger");
const { encrypt, decrypt, escapeHtml } = require("../util/crypto");

const PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Bank Transfer"];
const WITH_ORDER = "*, order:orders(*, customer:customers(name))";

const shapePayment = (payment) => {
  const { order, referenceNumber, ...rest } = payment;
  const decryptedRef = referenceNumber ? decrypt(referenceNumber) : referenceNumber;
  if (!order) return { ...toApi(rest), referenceNumber: decryptedRef, orderId: null };
  const { customer, ...orderColumns } = order;
  return {
    ...toApi(rest),
    referenceNumber: decryptedRef,
    orderId: {
      ...toApi(orderColumns),
      customerId: toApi(customer ? { name: escapeHtml(customer.name) } : null),
    },
  };
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { orderId, amount, paymentMethod = "Cash", paymentStatus, paymentId } = req.body;
    if (paymentStatus && !["UNPAID", "PARTIALLY PAID", "PAID"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const order = orThrow(
      await supabase.from("orders").select().eq("id", orderId).maybeSingle()
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (paymentId && !/^[a-f\d]{24}$/i.test(paymentId)) {
      return res.status(400).json({ message: "Invalid payment confirmation ID" });
    }
    if (paymentId) {
      const existing = orThrow(
        await supabase.from("payments").select().eq("id", paymentId).maybeSingle()
      );
      if (existing) {
        if (existing.orderId !== order.id || Number(existing.amount) !== Number(amount)) {
          return res.status(409).json({ message: "Payment confirmation ID has already been used" });
        }
        return res.status(200).json(toApi(existing));
      }
    }

    const paidRows = orThrow(
      await supabase.from("payments").select("amount").eq("orderId", order.id)
    );
    const previousPaid = sum(paidRows, "amount");
    const remaining = Math.max(0, order.totalAmount - previousPaid);
    const currentStatus =
      previousPaid >= order.totalAmount ? "PAID" : previousPaid > 0 ? "PARTIALLY PAID" : "UNPAID";

    if (paymentStatus === "UNPAID") {
      if (previousPaid > 0) {
        return res.status(400).json({ message: "An order with confirmed payments cannot be set to UNPAID" });
      }
      orThrow(await supabase.from("orders").update({ paymentStatus: "UNPAID" }).eq("id", order.id).select());
      order.paymentStatus = "UNPAID";
      return res.json(toApi(order));
    }

    if (currentStatus === "PAID") {
      orThrow(await supabase.from("orders").update({ paymentStatus: "PAID" }).eq("id", order.id).select());
      return res.status(400).json({ message: "Order is already fully paid" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }
    if (numericAmount > remaining) {
      return res.status(400).json({ message: `Payment exceeds the remaining balance of ₱${remaining}` });
    }

    const totalPaid = previousPaid + numericAmount;
    const nextStatus = totalPaid >= order.totalAmount ? "PAID" : "PARTIALLY PAID";
    if (paymentStatus === "PAID" && Math.abs(totalPaid - order.totalAmount) > 0.000001) {
      return res.status(400).json({ message: `Payment must cover the remaining balance of ₱${remaining} to mark this order PAID` });
    }
    if (paymentStatus === "PARTIALLY PAID" && totalPaid >= order.totalAmount - 0.000001) {
      return res.status(400).json({ message: "Select PAID when this payment covers the full remaining balance" });
    }

    const createdPaymentId = paymentId || newId();
    const attempt = await supabase
      .from("payments")
      .insert({
        id: createdPaymentId,
        orderId: order.id,
        amount: numericAmount,
        paymentMethod,
        paymentStatus: nextStatus,
      })
      .select()
      .single();

    if (attempt.error) {
      if (attempt.error.code === "23505" && paymentId) {
        const existing = orThrow(
          await supabase.from("payments").select().eq("id", paymentId).maybeSingle()
        );
        if (existing && existing.orderId === order.id && Number(existing.amount) === numericAmount) {
          return res.status(200).json(toApi(existing));
        }
      }
      throw new Error(attempt.error.message);
    }

    orThrow(
      await supabase.from("orders").update({ paymentStatus: nextStatus }).eq("id", order.id).select()
    );

    const apiPayment = toApi(attempt.data);

    // Transaction Logging (Requirement 9)
    await logTransaction({
      paymentId: apiPayment._id,
      orderId: order.id,
      type: "PAYMENT_RECEIVED",
      amount: numericAmount,
      paymentMethod,
      paymentStatus: nextStatus,
      reference: `PAY-${apiPayment._id.slice(0, 8)}`,
      createdBy: req.user?.id || req.user?.name || "Staff",
    });

    // Activity Audit (Requirement 8)
    await logActivity({
      req,
      action: "PAYMENT_RECORDED",
      resource: "payments",
      resourceId: apiPayment._id,
      details: { orderId: order.id, orderNumber: order.orderNumber, amount: numericAmount, paymentMethod },
    });

    res.status(201).json(apiPayment);
  } catch (err) {
    next(err);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const { range = "newest" } = req.query;
    let query = supabase
      .from("payments")
      .select(WITH_ORDER)
      .neq("paymentStatus", "UNPAID");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    if (range === "today") {
      query = query.gte("paymentDate", todayStart.toISOString());
    } else if (range === "yesterday") {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
      query = query.gte("paymentDate", yesterdayStart.toISOString()).lt("paymentDate", todayStart.toISOString());
    } else if (["last3days", "last7days", "last30days"].includes(range)) {
      const days = Number(range.match(/\d+/)[0]);
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - days);
      query = query.gte("paymentDate", start.toISOString());
    } else if (!["newest", "all"].includes(range)) {
      return res.status(400).json({ message: "Invalid payment date range" });
    }

    const payments = orThrow(await query.order("paymentDate", { ascending: false }));
    res.json(payments.map(shapePayment));
  } catch (err) {
    next(err);
  }
};
