const express = require("express");
const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorProveedorRuta } = require("../utils/deleteGuards");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        pr.id_proveedor,
        p.empresa,
        pr.id_ruta,
        r.origen,
        r.destino
      FROM proveedor_ruta pr
      INNER JOIN proveedor p ON p.id_proveedor = pr.id_proveedor
      INNER JOIN ruta r ON r.id_ruta = pr.id_ruta
      WHERE p.estado = 1
        AND r.estado = 1
      ORDER BY p.empresa ASC, r.origen ASC, r.destino ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener rutas de proveedor:", err);
    res.status(500).json({ error: "Error al obtener rutas de proveedor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id_proveedor, id_ruta } = req.body;

    if (!id_proveedor || Number.isNaN(Number(id_proveedor))) {
      return res.status(400).json({ error: "El proveedor es obligatorio." });
    }

    if (!id_ruta || Number.isNaN(Number(id_ruta))) {
      return res.status(400).json({ error: "La ruta es obligatoria." });
    }

    const proveedorId = Number(id_proveedor);
    const rutaId = Number(id_ruta);

    const [proveedores] = await db.query(
      `SELECT id_proveedor
       FROM proveedor
       WHERE id_proveedor = ? AND estado = 1`,
      [proveedorId]
    );

    if (proveedores.length === 0) {
      return res.status(400).json({ error: "El proveedor seleccionado no es valido." });
    }

    const [rutas] = await db.query(
      `SELECT id_ruta
       FROM ruta
       WHERE id_ruta = ? AND estado = 1`,
      [rutaId]
    );

    if (rutas.length === 0) {
      return res.status(400).json({ error: "La ruta seleccionada no es valida." });
    }

    const [duplicados] = await db.query(
      `SELECT id_proveedor, id_ruta
       FROM proveedor_ruta
       WHERE id_proveedor = ?
         AND id_ruta = ?`,
      [proveedorId, rutaId]
    );

    if (duplicados.length > 0) {
      return res.status(400).json({
        error: "Ese proveedor ya tiene asignada esa ruta.",
      });
    }

    await db.query(
      `INSERT INTO proveedor_ruta (
        id_proveedor,
        id_ruta
      ) VALUES (?, ?)`,
      [proveedorId, rutaId]
    );

    res.status(201).json({
      mensaje: "Ruta asignada al proveedor correctamente.",
    });
  } catch (err) {
    console.error("Error al crear ruta de proveedor:", err);
    res.status(500).json({ error: "Error al crear ruta de proveedor" });
  }
});

router.put("/:id_proveedor/:id_ruta", async (req, res) => {
  try {
    const { id_proveedor, id_ruta } = req.params;
    const { nuevo_id_proveedor, nuevo_id_ruta } = req.body;

    if (!nuevo_id_proveedor || Number.isNaN(Number(nuevo_id_proveedor))) {
      return res.status(400).json({ error: "El proveedor es obligatorio." });
    }

    if (!nuevo_id_ruta || Number.isNaN(Number(nuevo_id_ruta))) {
      return res.status(400).json({ error: "La ruta es obligatoria." });
    }

    const proveedorOriginal = Number(id_proveedor);
    const rutaOriginal = Number(id_ruta);
    const proveedorNuevo = Number(nuevo_id_proveedor);
    const rutaNueva = Number(nuevo_id_ruta);

    const [actuales] = await db.query(
      `SELECT id_proveedor, id_ruta
       FROM proveedor_ruta
       WHERE id_proveedor = ?
         AND id_ruta = ?`,
      [proveedorOriginal, rutaOriginal]
    );

    if (actuales.length === 0) {
      return res.status(404).json({ error: "Relacion proveedor-ruta no encontrada." });
    }

    const [proveedores] = await db.query(
      `SELECT id_proveedor
       FROM proveedor
       WHERE id_proveedor = ? AND estado = 1`,
      [proveedorNuevo]
    );

    if (proveedores.length === 0) {
      return res.status(400).json({ error: "El proveedor seleccionado no es valido." });
    }

    const [rutas] = await db.query(
      `SELECT id_ruta
       FROM ruta
       WHERE id_ruta = ? AND estado = 1`,
      [rutaNueva]
    );

    if (rutas.length === 0) {
      return res.status(400).json({ error: "La ruta seleccionada no es valida." });
    }

    const [duplicados] = await db.query(
      `SELECT id_proveedor, id_ruta
       FROM proveedor_ruta
       WHERE id_proveedor = ?
         AND id_ruta = ?
         AND NOT (id_proveedor = ? AND id_ruta = ?)`,
      [proveedorNuevo, rutaNueva, proveedorOriginal, rutaOriginal]
    );

    if (duplicados.length > 0) {
      return res.status(400).json({
        error: "Ese proveedor ya tiene asignada esa ruta.",
      });
    }

    const [result] = await db.query(
      `UPDATE proveedor_ruta
       SET id_proveedor = ?,
           id_ruta = ?
       WHERE id_proveedor = ?
         AND id_ruta = ?`,
      [proveedorNuevo, rutaNueva, proveedorOriginal, rutaOriginal]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Relacion proveedor-ruta no encontrada." });
    }

    res.json({ mensaje: "Relacion proveedor-ruta actualizada correctamente." });
  } catch (err) {
    console.error("Error al actualizar ruta de proveedor:", err);
    res.status(500).json({ error: "Error al actualizar ruta de proveedor" });
  }
});

router.delete("/:id_proveedor/:id_ruta", async (req, res) => {
  try {
    const { id_proveedor, id_ruta } = req.params;

    if (await tieneOperacionAbiertaPorProveedorRuta(db, res, id_proveedor, id_ruta)) return;

    const [result] = await db.query(
      `DELETE FROM proveedor_ruta
       WHERE id_proveedor = ?
         AND id_ruta = ?`,
      [id_proveedor, id_ruta]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Relacion proveedor-ruta no encontrada." });
    }

    res.json({ mensaje: "Relacion proveedor-ruta eliminada correctamente." });
  } catch (err) {
    console.error("Error al eliminar ruta de proveedor:", err);
    res.status(500).json({ error: "Error al eliminar ruta de proveedor" });
  }
});

module.exports = router;
