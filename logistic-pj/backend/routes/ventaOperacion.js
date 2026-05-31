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

const validarVenta = (body) => {
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
        vo.id_venta,
        vo.id_operacion,
        o.codigo_operacion,
        vo.id_tipo_costo,
        tc.descripcion AS tipo_costo,
        vo.id_moneda,
        m.descripcion AS moneda,
        m.codigo AS codigo_moneda,
        vo.monto,
        vo.observacion,
        vo.fecha_registro,
        vo.id_usuario_registro,
        CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_registro,
        vo.fecha_modificacion,
        vo.id_usuario_modificacion,
        CONCAT(um.nombres, ' ', um.apellidos) AS usuario_modificacion
      FROM venta_operacion vo
      INNER JOIN operacion o ON o.id_operacion = vo.id_operacion
      INNER JOIN tipo_costo tc ON tc.id_tipo_costo = vo.id_tipo_costo
      INNER JOIN moneda m ON m.id_moneda = vo.id_moneda
      LEFT JOIN usuario ur ON ur.id_usuario = vo.id_usuario_registro
      LEFT JOIN usuario um ON um.id_usuario = vo.id_usuario_modificacion
      WHERE vo.estado = 1
      ORDER BY vo.id_venta DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener ventas de operacion:", error);
    res.status(500).json({ error: "Error al obtener ventas de operacion" });
  }
});

router.post("/", async (req, res) => {
  try {
    const errores = validarVenta(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que registra la venta.",
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

    const [maxRows] = await db.query(
      `SELECT COALESCE(MAX(id_venta), 0) + 1 AS siguiente_id
       FROM venta_operacion`
    );

    const siguienteId = Number(maxRows[0]?.siguiente_id || 1);

    await db.query(
      `INSERT INTO venta_operacion (
        id_venta,
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
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, 1)`,
      [
        siguienteId,
        Number(req.body.id_operacion),
        Number(req.body.id_tipo_costo),
        Number(req.body.id_moneda),
        Number(req.body.monto),
        normalizarTexto(req.body.observacion),
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_venta: siguienteId,
      mensaje: "Venta registrada correctamente.",
    });
  } catch (error) {
    console.error("Error al crear venta de operacion:", error);
    res.status(500).json({
      error: "Error al crear venta de operacion",
      detalle: error.message,
    });
  }
});

router.put("/:id_venta", async (req, res) => {
  try {
    const { id_venta } = req.params;
    const errores = validarVenta(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioModificacion) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que modifica la venta.",
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
      `UPDATE venta_operacion
       SET id_operacion = ?,
           id_tipo_costo = ?,
           id_moneda = ?,
           monto = ?,
           observacion = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_venta = ?
         AND estado = 1`,
      [
        Number(req.body.id_operacion),
        Number(req.body.id_tipo_costo),
        Number(req.body.id_moneda),
        Number(req.body.monto),
        normalizarTexto(req.body.observacion),
        Number(idUsuarioModificacion),
        Number(id_venta),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Venta no encontrada." });
    }

    res.json({ mensaje: "Venta actualizada correctamente." });
  } catch (error) {
    console.error("Error al actualizar venta de operacion:", error);
    res.status(500).json({
      error: "Error al actualizar venta de operacion",
      detalle: error.message,
    });
  }
});

router.delete("/:id_venta", async (req, res) => {
  try {
    const { id_venta } = req.params;
    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    const [result] = await db.query(
      `UPDATE venta_operacion
       SET estado = 0,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_venta = ?
         AND estado = 1`,
      [idUsuarioModificacion, Number(id_venta)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Venta no encontrada." });
    }

    res.json({ mensaje: "Venta eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar venta de operacion:", error);
    res.status(500).json({
      error: "Error al eliminar venta de operacion",
      detalle: error.message,
    });
  }
});

module.exports = router;
