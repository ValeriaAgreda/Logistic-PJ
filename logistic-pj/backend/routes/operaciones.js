// routes/operaciones.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM operacion_logistica");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST
router.post("/", async (req, res) => {
  const {
    cliente_id,
    proveedor_id,
    tipo_servicio,
    origen,
    destino,
    fecha_zarpe,
    fecha_llegada,
    tiempo_estimado_dias,
  } = req.body;

  try {
    await db.query(
      `INSERT INTO operacion_logistica (cliente_id, proveedor_id, tipo_servicio, origen, destino, fecha_zarpe, fecha_llegada, tiempo_estimado_dias)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_id,
        proveedor_id,
        tipo_servicio,
        origen,
        destino,
        fecha_zarpe,
        fecha_llegada,
        tiempo_estimado_dias,
      ]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    cliente_id,
    proveedor_id,
    tipo_servicio,
    origen,
    destino,
    fecha_zarpe,
    fecha_llegada,
    tiempo_estimado_dias,
  } = req.body;

  try {
    await db.query(
      `UPDATE operacion_logistica
       SET cliente_id=?, proveedor_id=?, tipo_servicio=?, origen=?, destino=?, fecha_zarpe=?, fecha_llegada=?, tiempo_estimado_dias=?
       WHERE id=?`,
      [
        cliente_id,
        proveedor_id,
        tipo_servicio,
        origen,
        destino,
        fecha_zarpe,
        fecha_llegada,
        tiempo_estimado_dias,
        id,
      ]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM operacion_logistica WHERE id = ?", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
