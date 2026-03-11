// routes/proveedores.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

// GET: listar proveedores (solo activos)
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, razon_social, tipo_servicio, contacto, telefono, email, direccion, state,
              register_date, last_update, user_id
       FROM proveedor
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener proveedores:", err);
    res.status(500).json({ error: "Error al obtener proveedores" });
  }
});

// POST: crear proveedor (usa user_id del usuario logueado desde cookie)
router.post("/", async (req, res) => {
  try {
    const { razon_social, tipo_servicio, contacto, telefono, email, direccion } = req.body;

    if (!razon_social || !tipo_servicio || !contacto || !telefono || !email || !direccion) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const userId = req.cookies?.user?.id ?? null;

    await db.query(
      `INSERT INTO proveedor
        (razon_social, tipo_servicio, contacto, telefono, email, direccion,
         state, register_date, last_update, user_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
      [
        String(razon_social).trim(),
        String(tipo_servicio).trim(),
        String(contacto).trim(),
        String(telefono).trim(),
        String(email).trim().toLowerCase(),
        String(direccion).trim(),
        userId,
      ]
    );

    res.status(201).json({ mensaje: "Proveedor creado correctamente." });
  } catch (err) {
    console.error("Error al guardar proveedor:", err);
    res.status(500).json({ error: "Error al guardar proveedor" });
  }
});

// PUT: actualizar proveedor (guarda user_id del modificador)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, tipo_servicio, contacto, telefono, email, direccion, state } = req.body;

    const userId = req.cookies?.user?.id ?? null;

    const [result] = await db.query(
      `UPDATE proveedor
          SET razon_social = ?, tipo_servicio = ?, contacto = ?, telefono = ?,
              email = ?, direccion = ?, state = ?, last_update = NOW(), user_id = ?
        WHERE id = ?`,
      [
        String(razon_social).trim(),
        String(tipo_servicio).trim(),
        String(contacto).trim(),
        String(telefono).trim(),
        String(email).trim().toLowerCase(),
        String(direccion).trim(),
        typeof state === "number" ? state : 1,
        userId,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado." });
    }

    res.json({ mensaje: "Proveedor actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar proveedor:", err);
    res.status(500).json({ error: "Error al actualizar proveedor" });
  }
});

// DELETE: borrado lógico (desactivar proveedor)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.cookies?.user?.id ?? null;

    const [result] = await db.query(
      `UPDATE proveedor
          SET state = 0, last_update = NOW(), user_id = ?
        WHERE id = ?`,
      [userId, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado." });
    }

    res.json({ mensaje: "Proveedor desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar proveedor:", err);
    res.status(500).json({ error: "Error al eliminar proveedor" });
  }
});

module.exports = router;
