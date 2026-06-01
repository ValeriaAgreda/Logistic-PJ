const express = require("express");
const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorTipoServicio } = require("../utils/deleteGuards");

// GET: listar tipos de servicio
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_tipo_servicio,
        descripcion,
        estado
      FROM tipo_servicio
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener tipos de servicio:", err);
    res.status(500).json({ error: "Error al obtener tipos de servicio" });
  }
});

// GET: obtener un tipo de servicio por id
router.get("/:id_tipo_servicio", async (req, res) => {
  try {
    const { id_tipo_servicio } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_tipo_servicio,
        descripcion,
        estado
      FROM tipo_servicio
      WHERE id_tipo_servicio = ?`,
      [id_tipo_servicio]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tipo de servicio no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener tipo de servicio:", err);
    res.status(500).json({ error: "Error al obtener tipo de servicio" });
  }
});

// POST: crear tipo de servicio
router.post("/", async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripción es obligatoria." });
    }

    const [result] = await db.query(
      `INSERT INTO tipo_servicio (
        descripcion,
        estado
      ) VALUES (?, 1)`,
      [String(descripcion).trim()]
    );

    res.status(201).json({
      id_tipo_servicio: result.insertId,
      mensaje: "Tipo de servicio creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear tipo de servicio:", err);
    res.status(500).json({ error: "Error al crear tipo de servicio" });
  }
});

// PUT: actualizar tipo de servicio
router.put("/:id_tipo_servicio", async (req, res) => {
  try {
    const { id_tipo_servicio } = req.params;
    const { descripcion, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripción es obligatoria." });
    }

    const [result] = await db.query(
      `UPDATE tipo_servicio
       SET descripcion = ?,
           estado = ?
       WHERE id_tipo_servicio = ?`,
      [
        String(descripcion).trim(),
        typeof estado === "number" ? estado : 1,
        id_tipo_servicio,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de servicio no encontrado." });
    }

    res.json({ mensaje: "Tipo de servicio actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar tipo de servicio:", err);
    res.status(500).json({ error: "Error al actualizar tipo de servicio" });
  }
});

// DELETE: borrado lógico
router.delete("/:id_tipo_servicio", async (req, res) => {
  try {
    const { id_tipo_servicio } = req.params;

    if (await tieneOperacionAbiertaPorTipoServicio(db, res, id_tipo_servicio)) return;

    const [result] = await db.query(
      `UPDATE tipo_servicio
       SET estado = 0
       WHERE id_tipo_servicio = ?`,
      [id_tipo_servicio]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de servicio no encontrado." });
    }

    res.json({ mensaje: "Tipo de servicio desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar tipo de servicio:", err);
    res.status(500).json({ error: "Error al eliminar tipo de servicio" });
  }
});

module.exports = router;
