const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_estado_operacion,
        descripcion,
        estado
      FROM estado_operacion
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener estados de operacion:", err);
    res.status(500).json({ error: "Error al obtener estados de operacion" });
  }
});

router.get("/:id_estado_operacion", async (req, res) => {
  try {
    const { id_estado_operacion } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_estado_operacion,
        descripcion,
        estado
      FROM estado_operacion
      WHERE id_estado_operacion = ?`,
      [id_estado_operacion]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Estado de operacion no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener estado de operacion:", err);
    res.status(500).json({ error: "Error al obtener estado de operacion" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `INSERT INTO estado_operacion (
        descripcion,
        estado
      ) VALUES (?, 1)`,
      [String(descripcion).trim()]
    );

    res.status(201).json({
      id_estado_operacion: result.insertId,
      mensaje: "Estado de operacion creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear estado de operacion:", err);
    res.status(500).json({ error: "Error al crear estado de operacion" });
  }
});

router.put("/:id_estado_operacion", async (req, res) => {
  try {
    const { id_estado_operacion } = req.params;
    const { descripcion, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `UPDATE estado_operacion
       SET descripcion = ?,
           estado = ?
       WHERE id_estado_operacion = ?`,
      [
        String(descripcion).trim(),
        typeof estado === "number" ? estado : 1,
        id_estado_operacion,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estado de operacion no encontrado." });
    }

    res.json({ mensaje: "Estado de operacion actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar estado de operacion:", err);
    res.status(500).json({ error: "Error al actualizar estado de operacion" });
  }
});

router.delete("/:id_estado_operacion", async (req, res) => {
  try {
    const { id_estado_operacion } = req.params;

    const [result] = await db.query(
      `UPDATE estado_operacion
       SET estado = 0
       WHERE id_estado_operacion = ?`,
      [id_estado_operacion]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estado de operacion no encontrado." });
    }

    res.json({ mensaje: "Estado de operacion desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar estado de operacion:", err);
    res.status(500).json({ error: "Error al eliminar estado de operacion" });
  }
});

module.exports = router;
