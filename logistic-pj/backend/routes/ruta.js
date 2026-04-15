const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_ruta,
        origen,
        destino,
        estado
      FROM ruta
      WHERE estado = 1
      ORDER BY origen ASC, destino ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener rutas:", err);
    res.status(500).json({ error: "Error al obtener rutas" });
  }
});

router.get("/:id_ruta", async (req, res) => {
  try {
    const { id_ruta } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_ruta,
        origen,
        destino,
        estado
      FROM ruta
      WHERE id_ruta = ?`,
      [id_ruta]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ruta no encontrada." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener ruta:", err);
    res.status(500).json({ error: "Error al obtener ruta" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { origen, destino } = req.body;

    if (!origen || !String(origen).trim()) {
      return res.status(400).json({ error: "El origen es obligatorio." });
    }

    if (!destino || !String(destino).trim()) {
      return res.status(400).json({ error: "El destino es obligatorio." });
    }

    const [result] = await db.query(
      `INSERT INTO ruta (
        origen,
        destino,
        estado
      ) VALUES (?, ?, 1)`,
      [String(origen).trim(), String(destino).trim()]
    );

    res.status(201).json({
      id_ruta: result.insertId,
      mensaje: "Ruta creada correctamente.",
    });
  } catch (err) {
    console.error("Error al crear ruta:", err);
    res.status(500).json({ error: "Error al crear ruta" });
  }
});

router.put("/:id_ruta", async (req, res) => {
  try {
    const { id_ruta } = req.params;
    const { origen, destino, estado } = req.body;

    if (!origen || !String(origen).trim()) {
      return res.status(400).json({ error: "El origen es obligatorio." });
    }

    if (!destino || !String(destino).trim()) {
      return res.status(400).json({ error: "El destino es obligatorio." });
    }

    const [result] = await db.query(
      `UPDATE ruta
       SET origen = ?,
           destino = ?,
           estado = ?
       WHERE id_ruta = ?`,
      [
        String(origen).trim(),
        String(destino).trim(),
        typeof estado === "number" ? estado : 1,
        id_ruta,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ruta no encontrada." });
    }

    res.json({ mensaje: "Ruta actualizada correctamente." });
  } catch (err) {
    console.error("Error al actualizar ruta:", err);
    res.status(500).json({ error: "Error al actualizar ruta" });
  }
});

router.delete("/:id_ruta", async (req, res) => {
  try {
    const { id_ruta } = req.params;

    const [result] = await db.query(
      `UPDATE ruta
       SET estado = 0
       WHERE id_ruta = ?`,
      [id_ruta]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ruta no encontrada." });
    }

    res.json({ mensaje: "Ruta desactivada correctamente." });
  } catch (err) {
    console.error("Error al eliminar ruta:", err);
    res.status(500).json({ error: "Error al eliminar ruta" });
  }
});

module.exports = router;
