const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

// GET: listar clientes
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        id_cliente,
        razon_social,
        nit,
        contacto,
        telefono,
        correo,
        direccion,
        observacion,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      FROM cliente
      WHERE estado = '1'
      ORDER BY id_cliente DESC`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al listar clientes: " + err.message });
  }
});

// POST: crear cliente
router.post("/", async (req, res) => {
  try {
    const {
      razon_social,
      nit,
      contacto,
      telefono,
      correo,
      direccion,
      observacion,
    } = req.body;

    if (!razon_social || !nit || !contacto || !telefono || !correo || !direccion) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const idUsuarioRegistro = req.cookies?.user?.id_usuario ?? null;

    const [result] = await db.query(
      `INSERT INTO cliente (
        razon_social,
        nit,
        contacto,
        telefono,
        correo,
        direccion,
        observacion,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, 1)`,
      [
        razon_social.trim(),
        String(nit).trim(),
        contacto.trim(),
        String(telefono).trim(),
        correo.trim().toLowerCase(),
        direccion.trim(),
        observacion ? observacion.trim() : null,
        idUsuarioRegistro,
        idUsuarioRegistro,
      ]
    );

    res.status(201).json({
      id_cliente: result.insertId,
      mensaje: "Cliente creado correctamente.",
    });
  } catch (err) {
    res.status(500).json({ error: "Error al crear cliente: " + err.message });
  }
});

// PUT: actualizar cliente
router.put("/:id_cliente", async (req, res) => {
  try {
    const { id_cliente } = req.params;
    const {
      razon_social,
      nit,
      contacto,
      telefono,
      correo,
      direccion,
      observacion,
      estado,
    } = req.body;

    if (!razon_social || !nit || !contacto || !telefono || !correo || !direccion) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const idUsuarioModificacion = req.cookies?.user?.id_usuario ?? null;

    const [result] = await db.query(
      `UPDATE cliente
       SET razon_social = ?,
           nit = ?,
           contacto = ?,
           telefono = ?,
           correo = ?,
           direccion = ?,
           observacion = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?,
           estado = ?
       WHERE id_cliente = ?`,
      [
        razon_social.trim(),
        String(nit).trim(),
        contacto.trim(),
        String(telefono).trim(),
        correo.trim().toLowerCase(),
        direccion.trim(),
        observacion ? observacion.trim() : null,
        idUsuarioModificacion,
        typeof estado === "number" ? estado : 1,
        id_cliente,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    res.json({ mensaje: "Cliente actualizado correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar cliente: " + err.message });
  }
});

// DELETE: borrado lógico
router.delete("/:id_cliente", async (req, res) => {
  try {
    const { id_cliente } = req.params;
    const idUsuarioModificacion = req.cookies?.user?.id_usuario ?? null;

    const [result] = await db.query(
      `UPDATE cliente
       SET estado = 0,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_cliente = ?`,
      [idUsuarioModificacion, id_cliente]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    res.json({ mensaje: "Cliente desactivado correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar cliente: " + err.message });
  }
});

module.exports = router;