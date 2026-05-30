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

  if (
    !body.omitir_validacion_estado &&
    (!body.id_estado_operacion || Number.isNaN(Number(body.id_estado_operacion)))
  ) {
    errores.push("Selecciona un estado de operacion valido.");
  }

  if (normalizarTexto(body.etd) && normalizarTexto(body.eta) && body.eta < body.etd) {
    errores.push("La fecha de llegada ETA no puede ser anterior a la fecha de salida ETD.");
  }

  return errores;
};

const generarCodigoOperacion = async (connection = db) => {
  const anio = new Date().getFullYear().toString();

  const [rows] = await connection.query(
    `SELECT codigo_operacion
     FROM operacion
     WHERE codigo_operacion LIKE ?
     ORDER BY CAST(SUBSTRING(codigo_operacion, ?) AS UNSIGNED) DESC
     LIMIT 1`,
    [`${anio}%`, anio.length + 1]
  );

  const ultimoCodigo = rows[0]?.codigo_operacion;
  const ultimoCorrelativo = ultimoCodigo
    ? Number(String(ultimoCodigo).slice(anio.length)) || 0
    : 0;

  return `${anio}${ultimoCorrelativo + 1}`;
};

const normalizarRutaTexto = (valor) => String(valor || "").trim();

const asegurarRutaProveedor = async (connection, idProveedor, origen, destino) => {
  const origenNormalizado = normalizarRutaTexto(origen);
  const destinoNormalizado = normalizarRutaTexto(destino);

  if (!idProveedor || !origenNormalizado || !destinoNormalizado) {
    return null;
  }

  const [rutas] = await connection.query(
    `SELECT id_ruta
     FROM ruta
     WHERE LOWER(origen) = LOWER(?)
       AND LOWER(destino) = LOWER(?)
       AND estado = 1
     LIMIT 1`,
    [origenNormalizado, destinoNormalizado]
  );

  let idRuta = rutas[0]?.id_ruta;

  if (!idRuta) {
    const [rutaResult] = await connection.query(
      `INSERT INTO ruta (origen, destino, estado)
       VALUES (?, ?, 1)`,
      [origenNormalizado, destinoNormalizado]
    );
    idRuta = rutaResult.insertId;
  }

  const [relaciones] = await connection.query(
    `SELECT id_proveedor, id_ruta
     FROM proveedor_ruta
     WHERE id_proveedor = ?
       AND id_ruta = ?
     LIMIT 1`,
    [Number(idProveedor), Number(idRuta)]
  );

  if (relaciones.length === 0) {
    await connection.query(
      `INSERT INTO proveedor_ruta (id_proveedor, id_ruta)
       VALUES (?, ?)`,
      [Number(idProveedor), Number(idRuta)]
    );
  }

  return idRuta;
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

const obtenerEstadoAsignado = async () => {
  const [rows] = await db.query(
    `SELECT id_estado_operacion
     FROM estado_operacion
     WHERE LOWER(descripcion) = 'asignado'
       AND estado = 1
     LIMIT 1`
  );

  return rows[0]?.id_estado_operacion || null;
};

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        o.id_operacion,
        o.codigo_operacion,
        DATE_FORMAT(o.fecha_asignacion, '%Y-%m-%d') AS fecha_asignacion,
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
        o.observacion,
        DATE_FORMAT(o.etd, '%Y-%m-%d') AS etd,
        DATE_FORMAT(o.eta, '%Y-%m-%d') AS eta,
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

router.get("/siguiente-codigo", async (_req, res) => {
  try {
    const codigoOperacion = await generarCodigoOperacion();
    res.json({ codigo_operacion: codigoOperacion });
  } catch (err) {
    console.error("Error al generar siguiente codigo de operacion:", err);
    res.status(500).json({ error: "Error al generar siguiente codigo de operacion" });
  }
});

router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const errores = validarOperacion({ ...req.body, omitir_validacion_estado: true });

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que registra la operacion.",
      });
    }

    const idEstadoAsignado = await obtenerEstadoAsignado();

    if (!idEstadoAsignado) {
      return res.status(400).json({
        error: "No existe un estado activo llamado Asignado.",
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
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "Uno de los registros relacionados no existe o esta inactivo.",
      });
    }

    await connection.beginTransaction();

    const codigoOperacion = await generarCodigoOperacion(connection);

    const [result] = await connection.query(
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
        observacion,
        etd,
        eta,
        id_tipo_nacionalizacion,
        id_estado_operacion,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, 1)`,
      [
        codigoOperacion,
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
        normalizarTexto(req.body.observacion),
        normalizarTexto(req.body.etd),
        normalizarTexto(req.body.eta),
        Number(req.body.id_tipo_nacionalizacion),
        Number(idEstadoAsignado),
        Number(idUsuarioRegistro),
      ]
    );

    await asegurarRutaProveedor(
      connection,
      req.body.id_proveedor,
      req.body.origen,
      req.body.destino
    );

    await connection.commit();

    res.status(201).json({
      id_operacion: result.insertId,
      codigo_operacion: codigoOperacion,
      mensaje: "Operacion creada correctamente.",
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error al crear operacion:", err);
    res.status(500).json({
      error: "Error al crear operacion",
      detalle: err.message,
    });
  } finally {
    connection.release();
  }
});

router.put("/:id_operacion", async (req, res) => {
  const connection = await db.getConnection();

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

    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE operacion
       SET fecha_asignacion = ?,
           id_cliente = ?,
           id_proveedor = ?,
           id_tipo_servicio = ?,
           porducto = ?,
           origen = ?,
           destino = ?,
           cantidad = ?,
           nro_madre = ?,
           nro_hijo = ?,
           observacion = ?,
           etd = ?,
           eta = ?,
           id_tipo_nacionalizacion = ?,
           id_estado_operacion = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_operacion = ?
         AND estado = 1`,
      [
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
        normalizarTexto(req.body.observacion),
        normalizarTexto(req.body.etd),
        normalizarTexto(req.body.eta),
        Number(req.body.id_tipo_nacionalizacion),
        Number(req.body.id_estado_operacion),
        Number(idUsuarioModificacion),
        Number(id_operacion),
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Operacion no encontrada." });
    }

    await asegurarRutaProveedor(
      connection,
      req.body.id_proveedor,
      req.body.origen,
      req.body.destino
    );

    await connection.commit();

    res.json({ mensaje: "Operacion actualizada correctamente." });
  } catch (err) {
    await connection.rollback();
    console.error("Error al actualizar operacion:", err);
    res.status(500).json({
      error: "Error al actualizar operacion",
      detalle: err.message,
    });
  } finally {
    connection.release();
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
