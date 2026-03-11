// routes/clientes.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

// GET: listar clientes activos
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, razon_social, nit, direccion, telefono, email, state, register_date, last_update
       FROM cliente
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al listar clientes: " + err.message });
  }
});

// POST: crear cliente (guarda user_id del creador)
router.post("/", async (req, res) => {
  try {
    const { razon_social, nit, direccion, telefono, email } = req.body;

    if (!razon_social || !nit || !direccion || !telefono || !email) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const userId = req.cookies?.user?.id ?? null; // ← id del usuario logueado

    const [result] = await db.query(
      `INSERT INTO cliente
        (razon_social, nit, direccion, telefono, email, state, register_date, last_update, user_id)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
      [
        razon_social.trim(),
        String(nit).trim(),
        direccion.trim(),
        String(telefono).trim(),
        String(email).trim().toLowerCase(),
        userId,
      ]
    );

    res.status(201).json({ id: result.insertId, mensaje: "Cliente creado correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al crear cliente: " + err.message });
  }
});

// PUT: actualizar cliente (guarda user_id del modificador)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, nit, direccion, telefono, email, state } = req.body;

    const userId = req.cookies?.user?.id ?? null;

    const [result] = await db.query(
      `UPDATE cliente
          SET razon_social = ?, nit = ?, direccion = ?, telefono = ?, email = ?,
              state = ?, last_update = NOW(), user_id = ?
        WHERE id = ?`,
      [
        razon_social.trim(),
        String(nit).trim(),
        direccion.trim(),
        String(telefono).trim(),
        String(email).trim().toLowerCase(),
        typeof state === "number" ? state : 1,
        userId,
        id,
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente no encontrado." });
    res.json({ mensaje: "Cliente actualizado correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar cliente: " + err.message });
  }
});

// DELETE: borrado lógico
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.cookies?.user?.id ?? null;

    const [result] = await db.query(
      `UPDATE cliente SET state = 0, last_update = NOW(), user_id = ? WHERE id = ?`,
      [userId, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente no encontrado." });
    res.json({ mensaje: "Cliente desactivado correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar cliente: " + err.message });
  }
});

module.exports = router;
