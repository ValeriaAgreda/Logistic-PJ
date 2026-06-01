const express = require("express");
const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorTipoNacionalizacion } = require("../utils/deleteGuards");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_tipo_nacionalizacion,
        descripcion,
        estado
      FROM tipo_nacionalizacion
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener tipos de nacionalizacion:", err);
    res.status(500).json({ error: "Error al obtener tipos de nacionalizacion" });
  }
});

router.get("/:id_tipo_nacionalizacion", async (req, res) => {
  try {
    const { id_tipo_nacionalizacion } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_tipo_nacionalizacion,
        descripcion,
        estado
      FROM tipo_nacionalizacion
      WHERE id_tipo_nacionalizacion = ?`,
      [id_tipo_nacionalizacion]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tipo de nacionalizacion no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener tipo de nacionalizacion:", err);
    res.status(500).json({ error: "Error al obtener tipo de nacionalizacion" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `INSERT INTO tipo_nacionalizacion (
        descripcion,
        estado
      ) VALUES (?, 1)`,
      [String(descripcion).trim()]
    );

    res.status(201).json({
      id_tipo_nacionalizacion: result.insertId,
      mensaje: "Tipo de nacionalizacion creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear tipo de nacionalizacion:", err);
    res.status(500).json({ error: "Error al crear tipo de nacionalizacion" });
  }
});

router.put("/:id_tipo_nacionalizacion", async (req, res) => {
  try {
    const { id_tipo_nacionalizacion } = req.params;
    const { descripcion, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `UPDATE tipo_nacionalizacion
       SET descripcion = ?,
           estado = ?
       WHERE id_tipo_nacionalizacion = ?`,
      [
        String(descripcion).trim(),
        typeof estado === "number" ? estado : 1,
        id_tipo_nacionalizacion,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de nacionalizacion no encontrado." });
    }

    res.json({ mensaje: "Tipo de nacionalizacion actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar tipo de nacionalizacion:", err);
    res.status(500).json({ error: "Error al actualizar tipo de nacionalizacion" });
  }
});

router.delete("/:id_tipo_nacionalizacion", async (req, res) => {
  try {
    const { id_tipo_nacionalizacion } = req.params;

    if (await tieneOperacionAbiertaPorTipoNacionalizacion(db, res, id_tipo_nacionalizacion)) return;

    const [result] = await db.query(
      `UPDATE tipo_nacionalizacion
       SET estado = 0
       WHERE id_tipo_nacionalizacion = ?`,
      [id_tipo_nacionalizacion]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de nacionalizacion no encontrado." });
    }

    res.json({ mensaje: "Tipo de nacionalizacion desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar tipo de nacionalizacion:", err);
    res.status(500).json({ error: "Error al eliminar tipo de nacionalizacion" });
  }
});

module.exports = router;
