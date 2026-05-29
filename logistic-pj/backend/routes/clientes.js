const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

const optionalText = (value) => (value == null ? "" : String(value).trim());
const optionalEmail = (value) => optionalText(value).toLowerCase();
const normalizarNit = (value) => String(value || "").trim();
const NIT_REGEX = /^\d{5,15}$/;
const PHONE_REGEX = /^[67]\d{7}$/;

const existeNitActivo = async (nit, idClienteExcluir = null) => {
  const params = [normalizarNit(nit)];
  let filtroExcluir = "";

  if (idClienteExcluir) {
    filtroExcluir = " AND id_cliente <> ?";
    params.push(Number(idClienteExcluir));
  }

  const [rows] = await db.query(
    `SELECT id_cliente
     FROM cliente
     WHERE nit = ?
       AND estado = 1${filtroExcluir}
     LIMIT 1`,
    params
  );

  return rows.length > 0;
};

const validarCliente = async (body, idClienteExcluir = null) => {
  const errores = [];
  const nit = normalizarNit(body.nit);
  const telefono = optionalText(body.telefono);

  if (!optionalText(body.razon_social) || !nit || !optionalText(body.contacto)) {
    errores.push("Faltan campos obligatorios.");
  }

  if (nit && !NIT_REGEX.test(nit)) {
    errores.push("El NIT debe tener entre 5 y 15 digitos y no puede ser negativo.");
  }

  if (telefono && !PHONE_REGEX.test(telefono)) {
    errores.push("El telefono debe tener 8 digitos, empezar con 6 o 7 y no puede ser negativo.");
  }

  if (nit && NIT_REGEX.test(nit) && await existeNitActivo(nit, idClienteExcluir)) {
    errores.push(
      idClienteExcluir
        ? "Ya existe otro cliente activo registrado con ese NIT."
        : "Ya existe un cliente activo registrado con ese NIT."
    );
  }

  return errores;
};

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

    const errores = await validarCliente(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
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
        normalizarNit(nit),
        contacto.trim(),
        optionalText(telefono),
        optionalEmail(correo),
        optionalText(direccion),
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

    const errores = await validarCliente(req.body, id_cliente);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
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
        normalizarNit(nit),
        contacto.trim(),
        optionalText(telefono),
        optionalEmail(correo),
        optionalText(direccion),
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
