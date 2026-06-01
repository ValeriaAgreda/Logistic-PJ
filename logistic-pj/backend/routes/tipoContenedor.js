const express = require("express");
const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorTipoContenedor } = require("../utils/deleteGuards");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_tipo_contenedor,
        descripcion,
        estado
      FROM tipo_contenedor
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener tipos de contenedor:", err);
    res.status(500).json({ error: "Error al obtener tipos de contenedor" });
  }
});

router.get("/:id_tipo_contenedor", async (req, res) => {
  try {
    const { id_tipo_contenedor } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_tipo_contenedor,
        descripcion,
        estado
      FROM tipo_contenedor
      WHERE id_tipo_contenedor = ?`,
      [id_tipo_contenedor]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tipo de contenedor no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener tipo de contenedor:", err);
    res.status(500).json({ error: "Error al obtener tipo de contenedor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `INSERT INTO tipo_contenedor (
        descripcion,
        estado
      ) VALUES (?, 1)`,
      [String(descripcion).trim()]
    );

    res.status(201).json({
      id_tipo_contenedor: result.insertId,
      mensaje: "Tipo de contenedor creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear tipo de contenedor:", err);
    res.status(500).json({ error: "Error al crear tipo de contenedor" });
  }
});

router.put("/:id_tipo_contenedor", async (req, res) => {
  try {
    const { id_tipo_contenedor } = req.params;
    const { descripcion, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `UPDATE tipo_contenedor
       SET descripcion = ?,
           estado = ?
       WHERE id_tipo_contenedor = ?`,
      [
        String(descripcion).trim(),
        typeof estado === "number" ? estado : 1,
        id_tipo_contenedor,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de contenedor no encontrado." });
    }

    res.json({ mensaje: "Tipo de contenedor actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar tipo de contenedor:", err);
    res.status(500).json({ error: "Error al actualizar tipo de contenedor" });
  }
});

router.delete("/:id_tipo_contenedor", async (req, res) => {
  try {
    const { id_tipo_contenedor } = req.params;

    if (await tieneOperacionAbiertaPorTipoContenedor(db, res, id_tipo_contenedor)) return;

    const [result] = await db.query(
      `UPDATE tipo_contenedor
       SET estado = 0
       WHERE id_tipo_contenedor = ?`,
      [id_tipo_contenedor]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de contenedor no encontrado." });
    }

    res.json({ mensaje: "Tipo de contenedor desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar tipo de contenedor:", err);
    res.status(500).json({ error: "Error al eliminar tipo de contenedor" });
  }
});

module.exports = router;
