// routes/contenedores.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

/**
 * LISTAR (solo activos)
 */
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, numero, tipo, peso_bruto, peso_neto, dimensiones,
              state, register_date, last_update, user_id
         FROM contenedor
        WHERE state = 1
        ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener contenedores:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Error al obtener contenedores" });
  }
});

/**
 * CREAR (guarda user_id del creador)
 * OJO: 'tipo' debe coincidir con los valores del ENUM de tu BD.
 */
router.post("/", async (req, res) => {
  try {
    const { numero, tipo, peso_bruto, peso_neto, dimensiones } = req.body;

    if (!numero || !tipo) {
      return res.status(400).json({ error: "Número y tipo son obligatorios." });
    }

    const userId = req.cookies?.user?.id ?? null;

    await db.query(
      `INSERT INTO contenedor
        (numero, tipo, peso_bruto, peso_neto, dimensiones,
         state, register_date, last_update, user_id)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
      [
        String(numero).trim().toUpperCase(),
        String(tipo).trim(),
        peso_bruto ?? null,
        peso_neto ?? null,
        dimensiones ? String(dimensiones).trim() : null,
        userId,
      ]
    );

    res.status(201).json({ mensaje: "Contenedor creado correctamente." });
  } catch (err) {
    console.error("Error al crear contenedor:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Error al crear contenedor" });
  }
});

/**
 * ACTUALIZAR (guarda user_id del modificador)
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, tipo, peso_bruto, peso_neto, dimensiones, state } = req.body;

    const userId = req.cookies?.user?.id ?? null;

    const [r] = await db.query(
      `UPDATE contenedor
          SET numero = ?, tipo = ?, peso_bruto = ?, peso_neto = ?,
              dimensiones = ?, state = ?, last_update = NOW(), user_id = ?
        WHERE id = ?`,
      [
        String(numero || "").trim().toUpperCase(),
        String(tipo || "").trim(),
        peso_bruto ?? null,
        peso_neto ?? null,
        dimensiones ? String(dimensiones).trim() : null,
        typeof state === "number" ? state : 1,
        userId,
        id,
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Contenedor no encontrado." });
    }
    res.json({ mensaje: "Contenedor actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar contenedor:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Error al actualizar contenedor" });
  }
});

/**
 * ELIMINAR (borrado lógico)
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.cookies?.user?.id ?? null;
    const [r] = await db.query(
      `UPDATE contenedor
          SET state = 0, last_update = NOW(), user_id = ?
        WHERE id = ?`,
      [userId, req.params.id]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Contenedor no encontrado." });
    }
    res.json({ mensaje: "Contenedor desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar contenedor:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Error al eliminar contenedor" });
  }
});

module.exports = router;
