const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_moneda,
        descripcion,
        codigo,
        estado
      FROM moneda
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener monedas:", err);
    res.status(500).json({ error: "Error al obtener monedas" });
  }
});

router.get("/:id_moneda", async (req, res) => {
  try {
    const { id_moneda } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_moneda,
        descripcion,
        codigo,
        estado
      FROM moneda
      WHERE id_moneda = ?`,
      [id_moneda]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Moneda no encontrada." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener moneda:", err);
    res.status(500).json({ error: "Error al obtener moneda" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion, codigo } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    if (!codigo || !String(codigo).trim()) {
      return res.status(400).json({ error: "El codigo es obligatorio." });
    }

    const [result] = await db.query(
      `INSERT INTO moneda (
        descripcion,
        codigo,
        estado
      ) VALUES (?, ?, 1)`,
      [String(descripcion).trim(), String(codigo).trim().toUpperCase()]
    );

    res.status(201).json({
      id_moneda: result.insertId,
      mensaje: "Moneda creada correctamente.",
    });
  } catch (err) {
    console.error("Error al crear moneda:", err);
    res.status(500).json({ error: "Error al crear moneda" });
  }
});

router.put("/:id_moneda", async (req, res) => {
  try {
    const { id_moneda } = req.params;
    const { descripcion, codigo, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    if (!codigo || !String(codigo).trim()) {
      return res.status(400).json({ error: "El codigo es obligatorio." });
    }

    const [result] = await db.query(
      `UPDATE moneda
       SET descripcion = ?,
           codigo = ?,
           estado = ?
       WHERE id_moneda = ?`,
      [
        String(descripcion).trim(),
        String(codigo).trim().toUpperCase(),
        typeof estado === "number" ? estado : 1,
        id_moneda,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Moneda no encontrada." });
    }

    res.json({ mensaje: "Moneda actualizada correctamente." });
  } catch (err) {
    console.error("Error al actualizar moneda:", err);
    res.status(500).json({ error: "Error al actualizar moneda" });
  }
});

router.delete("/:id_moneda", async (req, res) => {
  try {
    const { id_moneda } = req.params;

    const [result] = await db.query(
      `UPDATE moneda
       SET estado = 0
       WHERE id_moneda = ?`,
      [id_moneda]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Moneda no encontrada." });
    }

    res.json({ mensaje: "Moneda desactivada correctamente." });
  } catch (err) {
    console.error("Error al eliminar moneda:", err);
    res.status(500).json({ error: "Error al eliminar moneda" });
  }
});

module.exports = router;
