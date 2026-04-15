const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_rol,
        descripcion,
        estado
      FROM rol
      WHERE estado = 1
      ORDER BY descripcion ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener roles:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

router.get("/:id_rol", async (req, res) => {
  try {
    const { id_rol } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_rol,
        descripcion,
        estado
      FROM rol
      WHERE id_rol = ?`,
      [id_rol]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Rol no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener rol:", err);
    res.status(500).json({ error: "Error al obtener rol" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `INSERT INTO rol (
        descripcion,
        estado
      ) VALUES (?, 1)`,
      [String(descripcion).trim()]
    );

    res.status(201).json({
      id_rol: result.insertId,
      mensaje: "Rol creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear rol:", err);
    res.status(500).json({ error: "Error al crear rol" });
  }
});

router.put("/:id_rol", async (req, res) => {
  try {
    const { id_rol } = req.params;
    const { descripcion, estado } = req.body;

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({ error: "La descripcion es obligatoria." });
    }

    const [result] = await db.query(
      `UPDATE rol
       SET descripcion = ?,
           estado = ?
       WHERE id_rol = ?`,
      [
        String(descripcion).trim(),
        typeof estado === "number" ? estado : 1,
        id_rol,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Rol no encontrado." });
    }

    res.json({ mensaje: "Rol actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar rol:", err);
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

router.delete("/:id_rol", async (req, res) => {
  try {
    const { id_rol } = req.params;

    const [result] = await db.query(
      `UPDATE rol
       SET estado = 0
       WHERE id_rol = ?`,
      [id_rol]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Rol no encontrado." });
    }

    res.json({ mensaje: "Rol desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar rol:", err);
    res.status(500).json({ error: "Error al eliminar rol" });
  }
});

module.exports = router;
