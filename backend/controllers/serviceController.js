const supabase = require("../config/supabase");
const { newId, toApi, orThrow, count, pick } = require("../util/rows");
const { logActivity } = require("../util/auditLogger");

const EDITABLE = ["serviceName", "description", "price", "unit", "status"];

exports.getServices = async (req, res, next) => {
  try {
    const services = orThrow(
      await supabase.from("services").select().order("createdAt", { ascending: false })
    );
    res.json(services.map(toApi));
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const service = orThrow(
      await supabase
        .from("services")
        .insert({ id: newId(), ...pick(req.body, EDITABLE) })
        .select()
        .single()
    );
    await logActivity({
      req,
      action: "SERVICE_CREATED",
      resource: "services",
      resourceId: service.id,
      details: { serviceName: service.serviceName, price: service.price, unit: service.unit },
    });
    res.status(201).json(toApi(service));
  } catch (err) {
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const rows = orThrow(
      await supabase
        .from("services")
        .update(pick(req.body, EDITABLE))
        .eq("id", req.params.id)
        .select()
    );
    await logActivity({
      req,
      action: "SERVICE_UPDATED",
      resource: "services",
      resourceId: req.params.id,
      details: pick(req.body, EDITABLE),
    });
    res.json(toApi(rows[0] ?? null));
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const service = orThrow(
      await supabase.from("services").select().eq("id", req.params.id).maybeSingle()
    );
    if (!service) return res.status(404).json({ message: "Service not found" });

    // Bawal i-delete ang service na may orders — mawawala ang service name sa order history
    const orderCount = await count(
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("serviceId", service.id)
    );
    if (orderCount > 0) {
      return res.status(400).json({ message: "Cannot delete a service that has orders. Set it to inactive instead." });
    }

    orThrow(await supabase.from("services").delete().eq("id", service.id));
    await logActivity({
      req,
      action: "SERVICE_DELETED",
      resource: "services",
      resourceId: service.id,
      details: { serviceName: service.serviceName },
    });
    res.json({ message: "Service deleted" });
  } catch (err) {
    next(err);
  }
};
