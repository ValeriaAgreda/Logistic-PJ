const express = require("express");
const cookieParser = require("cookie-parser");

const router = express.Router();
const db = require("../db");

router.use(cookieParser());

const obtenerIdUsuarioAutenticado = (req) => {
  const cookieUser = req.cookies?.user;

  if (cookieUser && typeof cookieUser === "object" && cookieUser.id_usuario) {
    return Number(cookieUser.id_usuario);
  }

  if (typeof cookieUser === "string") {
    try {
      const parsedUser = JSON.parse(cookieUser);
      if (parsedUser?.id_usuario) {
        return Number(parsedUser.id_usuario);
      }
    } catch (_error) {
      // La cookie puede venir serializada de otra forma.
    }
  }

  return null;
};

const normalizarTexto = (valor) => {
  const texto = String(valor ?? "").trim();
  return texto || null;
};

const validarOperacion = (body) => {
  const errores = [];

  if (!normalizarTexto(body.codigo_operacion)) {
    errores.push("El codigo de operacion es obligatorio.");
  }

  if (!normalizarTexto(body.fecha_asignacion)) {
    errores.push("La fecha de asignacion es obligatoria.");
  }

  if (!body.id_cliente || Number.isNaN(Number(body.id_cliente))) {
    errores.push("Selecciona un cliente valido.");
  }

  if (!body.id_proveedor || Number.isNaN(Number(body.id_proveedor))) {
    errores.push("Selecciona un proveedor valido.");
  }

  if (!body.id_tipo_servicio || Number.isNaN(Number(body.id_tipo_servicio))) {
    errores.push("Selecciona un tipo de servicio valido.");
  }

  if (!normalizarTexto(body.porducto)) {
    errores.push("El producto es obligatorio.");
  }

  if (!normalizarTexto(body.origen)) {
    errores.push("El origen es obligatorio.");
  }

  if (!normalizarTexto(body.destino)) {
    errores.push("El destino es obligatorio.");
  }

  if (
    body.cantidad === undefined ||
    body.cantidad === null ||
    String(body.cantidad).trim() === "" ||
    Number.isNaN(Number(body.cantidad)) ||
    Number(body.cantidad) <= 0
  ) {
    errores.push("La cantidad debe ser un numero mayor a cero.");
  }

  if (!body.id_tipo_nacionalizacion || Number.isNaN(Number(body.id_tipo_nacionalizacion))) {
    errores.push("Selecciona un tipo de nacionalizacion valido.");
  }

  if (!body.id_estado_operacion || Number.isNaN(Number(body.id_estado_operacion))) {
    errores.push("Selecciona un estado de operacion valido.");
  }

  return errores;
};

const validarRelacionActiva = async (tabla, idCampo, valor) => {
  const [rows] = await db.query(
    `SELECT ${idCampo}
     FROM ${tabla}
     WHERE ${idCampo} = ? AND estado = 1`,
    [Number(valor)]
  );

  return rows.length > 0;
};

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        o.id_operacion,
        o.codigo_operacion,
        o.fecha_asignacion,
        o.id_cliente,
        c.razon_social AS cliente,
        o.id_proveedor,
        p.empresa AS proveedor,
        o.id_tipo_servicio,
        ts.descripcion AS tipo_servicio,
        o.porducto,
        o.origen,
        o.destino,
        o.cantidad,
        o.nro_madre,
        o.nro_hijo,
        o.etd,
        o.eta,
        o.id_tipo_nacionalizacion,
        tn.descripcion AS tipo_nacionalizacion,
        o.id_estado_operacion,
        eo.descripcion AS estado_operacion,
        o.fecha_registro,
        o.id_usuario_registro,
        CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_registro,
        o.fecha_modificacion,
        o.id_usuario_modificacion,
        CONCAT(um.nombres, ' ', um.apellidos) AS usuario_modificacion
      FROM operacion o
      INNER JOIN cliente c ON c.id_cliente = o.id_cliente
      INNER JOIN proveedor p ON p.id_proveedor = o.id_proveedor
      INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = o.id_tipo_servicio
      INNER JOIN tipo_nacionalizacion tn ON tn.id_tipo_nacionalizacion = o.id_tipo_nacionalizacion
      INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
      LEFT JOIN usuario ur ON ur.id_usuario = o.id_usuario_registro
      LEFT JOIN usuario um ON um.id_usuario = o.id_usuario_modificacion
      WHERE o.estado = 1
      ORDER BY o.id_operacion DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener operaciones:", err);
    res.status(500).json({ error: "Error al obtener operaciones" });
  }
});

router.post("/", async (req, res) => {
  try {
    const errores = validarOperacion(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que registra la operacion.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("cliente", "id_cliente", req.body.id_cliente),
      validarRelacionActiva("proveedor", "id_proveedor", req.body.id_proveedor),
      validarRelacionActiva("tipo_servicio", "id_tipo_servicio", req.body.id_tipo_servicio),
      validarRelacionActiva(
        "tipo_nacionalizacion",
        "id_tipo_nacionalizacion",
        req.body.id_tipo_nacionalizacion
      ),
      validarRelacionActiva(
        "estado_operacion",
        "id_estado_operacion",
        req.body.id_estado_operacion
      ),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "Uno de los registros relacionados no existe o esta inactivo.",
      });
    }

    const [duplicados] = await db.query(
      `SELECT id_operacion
       FROM operacion
       WHERE codigo_operacion = ? AND estado = 1`,
      [String(req.body.codigo_operacion).trim()]
    );

    if (duplicados.length > 0) {
      return res.status(400).json({ error: "Ya existe una operacion con ese codigo." });
    }

    const [result] = await db.query(
      `INSERT INTO operacion (
        codigo_operacion,
        fecha_asignacion,
        id_cliente,
        id_proveedor,
        id_tipo_servicio,
        porducto,
        origen,
        destino,
        cantidad,
        nro_madre,
        nro_hijo,
        etd,
        eta,
        id_tipo_nacionalizacion,
        id_estado_operacion,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, 1)`,
      [
        String(req.body.codigo_operacion).trim(),
        req.body.fecha_asignacion,
        Number(req.body.id_cliente),
        Number(req.body.id_proveedor),
        Number(req.body.id_tipo_servicio),
        String(req.body.porducto).trim(),
        String(req.body.origen).trim(),
        String(req.body.destino).trim(),
        Number(req.body.cantidad),
        normalizarTexto(req.body.nro_madre),
        normalizarTexto(req.body.nro_hijo),
        normalizarTexto(req.body.etd),
        normalizarTexto(req.body.eta),
        Number(req.body.id_tipo_nacionalizacion),
        Number(req.body.id_estado_operacion),
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_operacion: result.insertId,
      mensaje: "Operacion creada correctamente.",
    });
  } catch (err) {
    console.error("Error al crear operacion:", err);
    res.status(500).json({
      error: "Error al crear operacion",
      detalle: err.message,
    });
  }
});

router.put("/:id_operacion", async (req, res) => {
  try {
    const { id_operacion } = req.params;
    const errores = validarOperacion(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioModificacion) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que modifica la operacion.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("cliente", "id_cliente", req.body.id_cliente),
      validarRelacionActiva("proveedor", "id_proveedor", req.body.id_proveedor),
      validarRelacionActiva("tipo_servicio", "id_tipo_servicio", req.body.id_tipo_servicio),
      validarRelacionActiva(
        "tipo_nacionalizacion",
        "id_tipo_nacionalizacion",
        req.body.id_tipo_nacionalizacion
      ),
      validarRelacionActiva(
        "estado_operacion",
        "id_estado_operacion",
        req.body.id_estado_operacion
      ),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "Uno de los registros relacionados no existe o esta inactivo.",
      });
    }

    const [duplicados] = await db.query(
      `SELECT id_operacion
       FROM operacion
       WHERE codigo_operacion = ?
         AND estado = 1
         AND id_operacion <> ?`,
      [String(req.body.codigo_operacion).trim(), Number(id_operacion)]
    );

    if (duplicados.length > 0) {
      return res.status(400).json({ error: "Ya existe una operacion con ese codigo." });
    }

    const [result] = await db.query(
      `UPDATE operacion
       SET codigo_operacion = ?,
           fecha_asignacion = ?,
           id_cliente = ?,
           id_proveedor = ?,
           id_tipo_servicio = ?,
           porducto = ?,
           origen = ?,
           destino = ?,
           cantidad = ?,
           nro_madre = ?,
           nro_hijo = ?,
           etd = ?,
           eta = ?,
           id_tipo_nacionalizacion = ?,
           id_estado_operacion = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_operacion = ?
         AND estado = 1`,
      [
        String(req.body.codigo_operacion).trim(),
        req.body.fecha_asignacion,
        Number(req.body.id_cliente),
        Number(req.body.id_proveedor),
        Number(req.body.id_tipo_servicio),
        String(req.body.porducto).trim(),
        String(req.body.origen).trim(),
        String(req.body.destino).trim(),
        Number(req.body.cantidad),
        normalizarTexto(req.body.nro_madre),
        normalizarTexto(req.body.nro_hijo),
        normalizarTexto(req.body.etd),
        normalizarTexto(req.body.eta),
        Number(req.body.id_tipo_nacionalizacion),
        Number(req.body.id_estado_operacion),
        Number(idUsuarioModificacion),
        Number(id_operacion),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Operacion no encontrada." });
    }

    res.json({ mensaje: "Operacion actualizada correctamente." });
  } catch (err) {
    console.error("Error al actualizar operacion:", err);
    res.status(500).json({
      error: "Error al actualizar operacion",
      detalle: err.message,
    });
  }
});

router.delete("/:id_operacion", async (req, res) => {
  try {
    const { id_operacion } = req.params;
    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    const [result] = await db.query(
      `UPDATE operacion
       SET estado = 0,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_operacion = ?
         AND estado = 1`,
      [idUsuarioModificacion, Number(id_operacion)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Operacion no encontrada." });
    }

    res.json({ mensaje: "Operacion eliminada correctamente." });
  } catch (err) {
    console.error("Error al eliminar operacion:", err);
    res.status(500).json({
      error: "Error al eliminar operacion",
      detalle: err.message,
    });
  }
});

module.exports = router;
