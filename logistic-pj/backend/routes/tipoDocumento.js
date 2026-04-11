const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_tipo_documento,
        descripcion,
        estado
      FROM tipo_documento
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener tipos de documento:", err);
    res.status(500).json({ error: "Error al obtener tipos de documento" });
  }
});

router.get("/:id_tipo_documento", async (req, res) => {
  try {
    const { id_tipo_documento } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_tipo_documento,
        descripcion,
        estado
      FROM tipo_documento
      WHERE id_tipo_documento = ?`,
      [id_tipo_documento]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tipo de documento no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener tipo de documento:", err);
    res.status(500).json({ error: "Error al obtener tipo de documento" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `INSERT INTO tipo_documento (
        descripcion,
        estado
      ) VALUES (?, 1)`,
      [String(descripcion).trim()]
    );

    res.status(201).json({
      id_tipo_documento: result.insertId,
      mensaje: "Tipo de documento creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear tipo de documento:", err);
    res.status(500).json({ error: "Error al crear tipo de documento" });
  }
});

router.put("/:id_tipo_documento", async (req, res) => {
  try {
    const { id_tipo_documento } = req.params;
    const { descripcion, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `UPDATE tipo_documento
       SET descripcion = ?,
           estado = ?
       WHERE id_tipo_documento = ?`,
      [
        String(descripcion).trim(),
        typeof estado === "number" ? estado : 1,
        id_tipo_documento,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de documento no encontrado." });
    }

    res.json({ mensaje: "Tipo de documento actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar tipo de documento:", err);
    res.status(500).json({ error: "Error al actualizar tipo de documento" });
  }
});

router.delete("/:id_tipo_documento", async (req, res) => {
  try {
    const { id_tipo_documento } = req.params;

    const [result] = await db.query(
      `UPDATE tipo_documento
       SET estado = 0
       WHERE id_tipo_documento = ?`,
      [id_tipo_documento]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de documento no encontrado." });
    }

    res.json({ mensaje: "Tipo de documento desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar tipo de documento:", err);
    res.status(500).json({ error: "Error al eliminar tipo de documento" });
  }
});

module.exports = router;
