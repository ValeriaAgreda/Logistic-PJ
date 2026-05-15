const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

const TELEFONO_INTERNACIONAL = /^\+\d{8,15}$/;

const normalizarTelefono = (telefono) => String(telefono || "").trim();

const validarTelefono = (telefono) =>
  TELEFONO_INTERNACIONAL.test(normalizarTelefono(telefono));

// GET: listar proveedores
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_proveedor,
        empresa,
        nit,
        contacto,
        telefono,
        correo,
        direccion,
        lugar_origen,
        id_tipo_servicio,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      FROM proveedor
      WHERE estado = '1'
      ORDER BY id_proveedor DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener proveedores:", err);
    res.status(500).json({ error: "Error al obtener proveedores" });
  }
});

// POST: crear proveedor
router.post("/", async (req, res) => {
  try {
    const {
      empresa,
      nit,
      contacto,
      telefono,
      correo,
      direccion,
      lugar_origen,
      id_tipo_servicio,
    } = req.body;

    if (
      !empresa ||
      !nit ||
      !contacto ||
      !telefono ||
      !correo ||
      !direccion ||
      !lugar_origen ||
      !id_tipo_servicio
    ) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    if (!validarTelefono(telefono)) {
      return res.status(400).json({
        error: "El telefono debe incluir codigo de pais y entre 8 y 15 digitos.",
      });
    }

    const idUsuarioRegistro = req.cookies?.user?.id_usuario ?? null;

    const [result] = await db.query(
      `INSERT INTO proveedor (
        empresa,
        nit,
        contacto,
        telefono,
        correo,
        direccion,
        lugar_origen,
        id_tipo_servicio,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, 1)`,
      [
        String(empresa).trim(),
        String(nit).trim(),
        String(contacto).trim(),
        normalizarTelefono(telefono),
        String(correo).trim().toLowerCase(),
        String(direccion).trim(),
        String(lugar_origen).trim(),
        Number(id_tipo_servicio),
        idUsuarioRegistro,
        idUsuarioRegistro,
      ]
    );

    res.status(201).json({
      id_proveedor: result.insertId,
      mensaje: "Proveedor creado correctamente.",
    });
  } catch (err) {
    console.error("Error al guardar proveedor:", err);
    res.status(500).json({ error: "Error al guardar proveedor" });
  }
});

// PUT: actualizar proveedor
router.put("/:id_proveedor", async (req, res) => {
  try {
    const { id_proveedor } = req.params;
    const {
      empresa,
      nit,
      contacto,
      telefono,
      correo,
      direccion,
      lugar_origen,
      id_tipo_servicio,
      estado,
    } = req.body;

    if (
      !empresa ||
      !nit ||
      !contacto ||
      !telefono ||
      !correo ||
      !direccion ||
      !lugar_origen ||
      !id_tipo_servicio
    ) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    if (!validarTelefono(telefono)) {
      return res.status(400).json({
        error: "El telefono debe incluir codigo de pais y entre 8 y 15 digitos.",
      });
    }

    const idUsuarioModificacion = req.cookies?.user?.id_usuario ?? null;

    const [result] = await db.query(
      `UPDATE proveedor
       SET empresa = ?,
           nit = ?,
           contacto = ?,
           telefono = ?,
           correo = ?,
           direccion = ?,
           lugar_origen = ?,
           id_tipo_servicio = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?,
           estado = ?
       WHERE id_proveedor = ?`,
      [
        String(empresa).trim(),
        String(nit).trim(),
        String(contacto).trim(),
        normalizarTelefono(telefono),
        String(correo).trim().toLowerCase(),
        String(direccion).trim(),
        String(lugar_origen).trim(),
        Number(id_tipo_servicio),
        idUsuarioModificacion,
        typeof estado === "number" ? estado : 1,
        id_proveedor,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado." });
    }

    res.json({ mensaje: "Proveedor actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar proveedor:", err);
    res.status(500).json({ error: "Error al actualizar proveedor" });
  }
});

// DELETE: borrado lógico
router.delete("/:id_proveedor", async (req, res) => {
  try {
    const { id_proveedor } = req.params;
    const idUsuarioModificacion = req.cookies?.user?.id_usuario ?? null;

    const [result] = await db.query(
      `UPDATE proveedor
       SET estado = 0,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_proveedor = ?`,
      [idUsuarioModificacion, id_proveedor]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado." });
    }

    res.json({ mensaje: "Proveedor desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar proveedor:", err);
    res.status(500).json({ error: "Error al eliminar proveedor" });
  }
});

module.exports = router;
