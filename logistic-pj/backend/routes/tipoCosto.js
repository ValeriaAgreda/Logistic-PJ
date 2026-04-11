const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_tipo_costo,
        descripcion,
        grupo,
        estado
      FROM tipo_costo
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener tipos de costo:", err);
    res.status(500).json({ error: "Error al obtener tipos de costo" });
  }
});

router.get("/:id_tipo_costo", async (req, res) => {
  try {
    const { id_tipo_costo } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_tipo_costo,
        descripcion,
        grupo,
        estado
      FROM tipo_costo
      WHERE id_tipo_costo = ?`,
      [id_tipo_costo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tipo de costo no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener tipo de costo:", err);
    res.status(500).json({ error: "Error al obtener tipo de costo" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion, grupo } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    if (!grupo || !String(grupo).trim()) {
      return res.status(400).json({ error: "El grupo es obligatorio." });
    }

    const [result] = await db.query(
      `INSERT INTO tipo_costo (
        descripcion,
        grupo,
        estado
      ) VALUES (?, ?, 1)`,
      [String(descripcion).trim(), String(grupo).trim()]
    );

    res.status(201).json({
      id_tipo_costo: result.insertId,
      mensaje: "Tipo de costo creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear tipo de costo:", err);
    res.status(500).json({ error: "Error al crear tipo de costo" });
  }
});

router.put("/:id_tipo_costo", async (req, res) => {
  try {
    const { id_tipo_costo } = req.params;
    const { descripcion, grupo, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    if (!grupo || !String(grupo).trim()) {
      return res.status(400).json({ error: "El grupo es obligatorio." });
    }

    const [result] = await db.query(
      `UPDATE tipo_costo
       SET descripcion = ?,
           grupo = ?,
           estado = ?
       WHERE id_tipo_costo = ?`,
      [
        String(descripcion).trim(),
        String(grupo).trim(),
        typeof estado === "number" ? estado : 1,
        id_tipo_costo,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de costo no encontrado." });
    }

    res.json({ mensaje: "Tipo de costo actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar tipo de costo:", err);
    res.status(500).json({ error: "Error al actualizar tipo de costo" });
  }
});

router.delete("/:id_tipo_costo", async (req, res) => {
  try {
    const { id_tipo_costo } = req.params;

    const [result] = await db.query(
      `UPDATE tipo_costo
       SET estado = 0
       WHERE id_tipo_costo = ?`,
      [id_tipo_costo]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de costo no encontrado." });
    }

    res.json({ mensaje: "Tipo de costo desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar tipo de costo:", err);
    res.status(500).json({ error: "Error al eliminar tipo de costo" });
  }
});

module.exports = router;
