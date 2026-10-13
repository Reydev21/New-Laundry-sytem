const supabase = require("../config/supabase");
const { toApi, orThrow, count, sum } = require("../util/rows");

const pad = (value) => String(value).padStart(2, "0");

// Mirrors Mongo's $dateToString buckets, which are UTC-based: %Y-%m-%d for
// daily, %Y-%m for monthly, and %Y-%U for weekly (Sunday-start week of year).
const bucketKey = (date, bucket) => {
  const year = date.getUTCFullYear();
  if (bucket === "month") return `${year}-${pad(date.getUTCMonth() + 1)}`;
  if (bucket === "week") {
    const dayOfYear = Math.floor((date - Date.UTC(year, 0, 1)) / 86400000);
    return `${year}-${pad(Math.floor((dayOfYear + 7 - date.getUTCDay()) / 7))}`;
  }
  return `${year}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

// GET /api/reports/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();

    const [
      todayOrders,
      pendingOrders,
      readyOrders,
      claimedOrders,
      todayPaymentRows,
      recentRows,
    ] = await Promise.all([
      count(supabase.from("orders").select("id", { count: "exact", head: true }).gte("createdAt", since)),
      count(
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("orderStatus", ["Received", "Washing", "Drying", "Folding"])
      ),
      count(supabase.from("orders").select("id", { count: "exact", head: true }).eq("orderStatus", "Ready for Pickup")),
      count(supabase.from("orders").select("id", { count: "exact", head: true }).eq("orderStatus", "Claimed")),
      supabase.from("payments").select("amount").gte("paymentDate", since).neq("paymentStatus", "UNPAID"),
      supabase
        .from("orders")
        .select("*, customer:customers(name)")
        .order("createdAt", { ascending: false })
        .limit(5),
    ]);

    const recentOrders = orThrow(recentRows).map((row) => {
      const { customer, ...columns } = row;
      return { ...toApi(columns), customerId: toApi(customer ?? null) };
    });

    res.json({
      todayOrders,
      pendingOrders,
      readyOrders,
      claimedOrders,
      todaySales: sum(orThrow(todayPaymentRows), "amount"),
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/sales?range=daily|weekly|monthly
exports.getSalesReport = async (req, res, next) => {
  try {
    const { range = "daily" } = req.query;
    const startDate = new Date();
    let bucket = "day";

    if (range === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
      bucket = "week";
    } else if (range === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
      bucket = "month";
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const rows = orThrow(
      await supabase
        .from("orders")
        .select("createdAt, totalAmount")
        .gte("createdAt", startDate.toISOString())
        .eq("paymentStatus", "PAID")
    );

    const grouped = new Map();
    for (const row of rows) {
      const key = bucketKey(new Date(row.createdAt), bucket);
      const group = grouped.get(key) || { _id: key, totalSales: 0, orderCount: 0 };
      group.totalSales += Number(row.totalAmount);
      group.orderCount += 1;
      grouped.set(key, group);
    }

    res.json([...grouped.values()].sort((a, b) => (a._id < b._id ? -1 : 1)));
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/services
exports.getMostUsedServices = async (req, res, next) => {
  try {
    const rows = orThrow(await supabase.from("orders").select("serviceId, totalAmount"));

    const byService = new Map();
    for (const row of rows) {
      const entry = byService.get(row.serviceId) || { serviceId: row.serviceId, count: 0, totalRevenue: 0 };
      entry.count += 1;
      entry.totalRevenue += Number(row.totalAmount);
      byService.set(row.serviceId, entry);
    }

    const top = [...byService.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const services = top.length
      ? orThrow(await supabase.from("services").select("id, serviceName").in("id", top.map((entry) => entry.serviceId)))
      : [];
    const names = new Map(services.map((service) => [service.id, service.serviceName]));

    res.json(
      top.map((entry) => ({
        _id: entry.serviceId,
        serviceName: names.get(entry.serviceId) ?? null,
        count: entry.count,
        totalRevenue: entry.totalRevenue,
      }))
    );
  } catch (err) {
    next(err);
  }
};
