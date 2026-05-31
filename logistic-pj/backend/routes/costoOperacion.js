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
      // La cookie puede no venir serializada como JSON.
    }
  }

  return null;
};

const normalizarTexto = (valor) => {
  const texto = String(valor ?? "").trim();
  return texto || null;
};

const validarCosto = (body) => {
  const errores = [];

  if (!body.id_operacion || Number.isNaN(Number(body.id_operacion))) {
    errores.push("Selecciona una operacion valida.");
  }

  if (!body.id_tipo_costo || Number.isNaN(Number(body.id_tipo_costo))) {
    errores.push("Selecciona un tipo de costo valido.");
  }

  if (!body.id_moneda || Number.isNaN(Number(body.id_moneda))) {
    errores.push("Selecciona una moneda valida.");
  }

  if (
    body.monto === undefined ||
    body.monto === null ||
    String(body.monto).trim() === "" ||
    Number.isNaN(Number(body.monto)) ||
    Number(body.monto) < 0
  ) {
    errores.push("El monto debe ser un numero valido.");
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
        co.id_costo,
        co.id_operacion,
        o.codigo_operacion,
        co.id_tipo_costo,
        tc.descripcion AS tipo_costo,
        co.id_moneda,
        m.descripcion AS moneda,
        m.codigo AS codigo_moneda,
        co.monto,
        co.observacion,
        co.fecha_registro,
        co.id_usuario_registro,
        CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_registro,
        co.fecha_modificacion,
        co.id_usuario_modificacion,
        CONCAT(um.nombres, ' ', um.apellidos) AS usuario_modificacion
      FROM costo_operacion co
      INNER JOIN operacion o ON o.id_operacion = co.id_operacion
      INNER JOIN tipo_costo tc ON tc.id_tipo_costo = co.id_tipo_costo
      INNER JOIN moneda m ON m.id_moneda = co.id_moneda
      LEFT JOIN usuario ur ON ur.id_usuario = co.id_usuario_registro
      LEFT JOIN usuario um ON um.id_usuario = co.id_usuario_modificacion
      WHERE co.estado = 1
      ORDER BY co.id_costo DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener costos de operacion:", error);
    res.status(500).json({ error: "Error al obtener costos de operacion" });
  }
});

router.post("/", async (req, res) => {
  try {
    const errores = validarCosto(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que registra el costo.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("operacion", "id_operacion", req.body.id_operacion),
      validarRelacionActiva("tipo_costo", "id_tipo_costo", req.body.id_tipo_costo),
      validarRelacionActiva("moneda", "id_moneda", req.body.id_moneda),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "Uno de los registros relacionados no existe o esta inactivo.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO costo_operacion (
        id_operacion,
        id_tipo_costo,
        id_moneda,
        monto,
        observacion,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, 1)`,
      [
        Number(req.body.id_operacion),
        Number(req.body.id_tipo_costo),
        Number(req.body.id_moneda),
        Number(req.body.monto),
        normalizarTexto(req.body.observacion),
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_costo: result.insertId,
      mensaje: "Costo registrado correctamente.",
    });
  } catch (error) {
    console.error("Error al crear costo de operacion:", error);
    res.status(500).json({
      error: "Error al crear costo de operacion",
      detalle: error.message,
    });
  }
});

router.put("/:id_costo", async (req, res) => {
  try {
    const { id_costo } = req.params;
    const errores = validarCosto(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioModificacion) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que modifica el costo.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("operacion", "id_operacion", req.body.id_operacion),
      validarRelacionActiva("tipo_costo", "id_tipo_costo", req.body.id_tipo_costo),
      validarRelacionActiva("moneda", "id_moneda", req.body.id_moneda),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "Uno de los registros relacionados no existe o esta inactivo.",
      });
    }

    const [result] = await db.query(
      `UPDATE costo_operacion
       SET id_operacion = ?,
           id_tipo_costo = ?,
           id_moneda = ?,
           monto = ?,
           observacion = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_costo = ?
         AND estado = 1`,
      [
        Number(req.body.id_operacion),
        Number(req.body.id_tipo_costo),
        Number(req.body.id_moneda),
        Number(req.body.monto),
        normalizarTexto(req.body.observacion),
        Number(idUsuarioModificacion),
        Number(id_costo),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Costo no encontrado." });
    }

    res.json({ mensaje: "Costo actualizado correctamente." });
  } catch (error) {
    console.error("Error al actualizar costo de operacion:", error);
    res.status(500).json({
      error: "Error al actualizar costo de operacion",
      detalle: error.message,
    });
  }
});

router.delete("/:id_costo", async (req, res) => {
  try {
    const { id_costo } = req.params;
    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    const [result] = await db.query(
      `UPDATE costo_operacion
       SET estado = 0,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_costo = ?
         AND estado = 1`,
      [idUsuarioModificacion, Number(id_costo)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Costo no encontrado." });
    }

    res.json({ mensaje: "Costo eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar costo de operacion:", error);
    res.status(500).json({
      error: "Error al eliminar costo de operacion",
      detalle: error.message,
    });
  }
});

module.exports = router;
