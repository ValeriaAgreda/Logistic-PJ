const OPERACION_ABIERTA_WHERE = `
  o.estado = 1
  AND LOWER(eo.descripcion) <> 'cerrado'
`;

const bloquearSiTieneOperacionAbierta = async (db, res, query, params, mensaje) => {
  const [rows] = await db.query(query, params);

  if (rows.length === 0) return false;

  res.status(400).json({
    error: mensaje || `No se puede eliminar porque esta ligado a la operacion abierta ${rows[0].codigo_operacion}.`,
  });
  return true;
};

const porCampoOperacion = (campo, etiqueta) => async (db, res, valor) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM operacion o
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE o.${campo} = ?
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(valor)],
    `No se puede eliminar ${etiqueta} porque tiene una operacion abierta ligada.`
  );

const tieneOperacionAbiertaPorCliente = porCampoOperacion("id_cliente", "el cliente");
const tieneOperacionAbiertaPorProveedor = porCampoOperacion("id_proveedor", "el proveedor");
const tieneOperacionAbiertaPorTipoServicio = porCampoOperacion("id_tipo_servicio", "el tipo de servicio");
const tieneOperacionAbiertaPorTipoNacionalizacion = porCampoOperacion("id_tipo_nacionalizacion", "el tipo de nacionalizacion");
const tieneOperacionAbiertaPorIncoterm = porCampoOperacion("id_incoterm", "el Incoterm");
const tieneOperacionAbiertaPorEstadoOperacion = porCampoOperacion("id_estado_operacion", "el estado de operacion");

const tieneOperacionAbiertaPorContenedor = async (db, res, idContenedor) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM operacion_contenedor oc
     INNER JOIN operacion o ON o.id_operacion = oc.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE oc.id_contenedor = ?
       AND oc.estado = 1
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idContenedor)],
    "No se puede eliminar el contenedor porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorTipoContenedor = async (db, res, idTipoContenedor) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM contenedor c
     INNER JOIN operacion_contenedor oc ON oc.id_contenedor = c.id_contenedor
     INNER JOIN operacion o ON o.id_operacion = oc.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE c.id_tipo_contenedor = ?
       AND c.estado = 1
       AND oc.estado = 1
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idTipoContenedor)],
    "No se puede eliminar el tipo de contenedor porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorTipoCosto = async (db, res, idTipoCosto) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM (
       SELECT id_operacion FROM costo_operacion WHERE id_tipo_costo = ? AND estado = 1
       UNION ALL
       SELECT id_operacion FROM venta_operacion WHERE id_tipo_costo = ? AND estado = 1
     ) movimientos
     INNER JOIN operacion o ON o.id_operacion = movimientos.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idTipoCosto), Number(idTipoCosto)],
    "No se puede eliminar el tipo de costo porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorMoneda = async (db, res, idMoneda) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM (
       SELECT id_operacion FROM costo_operacion WHERE id_moneda = ? AND estado = 1
       UNION ALL
       SELECT id_operacion FROM venta_operacion WHERE id_moneda = ? AND estado = 1
     ) movimientos
     INNER JOIN operacion o ON o.id_operacion = movimientos.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idMoneda), Number(idMoneda)],
    "No se puede eliminar la moneda porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorTipoDocumento = async (db, res, idTipoDocumento) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM documento d
     INNER JOIN operacion o ON o.id_operacion = d.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE d.id_tipo_documento = ?
       AND d.estado = 1
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idTipoDocumento)],
    "No se puede eliminar el tipo de documento porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorMovimiento = (tabla, idCampo, etiqueta) => async (db, res, valor) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM ${tabla} m
     INNER JOIN operacion o ON o.id_operacion = m.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE m.${idCampo} = ?
       AND m.estado = 1
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(valor)],
    `No se puede eliminar ${etiqueta} porque tiene una operacion abierta ligada.`
  );

const tieneOperacionAbiertaPorCosto = tieneOperacionAbiertaPorMovimiento("costo_operacion", "id_costo", "el costo");
const tieneOperacionAbiertaPorVenta = tieneOperacionAbiertaPorMovimiento("venta_operacion", "id_venta", "la venta");
const tieneOperacionAbiertaPorDocumento = tieneOperacionAbiertaPorMovimiento("documento", "id_documento", "el documento");

const tieneOperacionAbiertaPorCuentaProveedor = async (db, res, idCuenta) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM proveedor_cuenta pc
     INNER JOIN operacion o ON o.id_proveedor = pc.id_proveedor
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE pc.id_cuenta = ?
       AND pc.estado = 1
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idCuenta)],
    "No se puede eliminar la cuenta del proveedor porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorProveedorRuta = async (db, res, idProveedor, idRuta) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM ruta r
     INNER JOIN operacion o
       ON o.id_proveedor = ?
      AND LOWER(o.origen) = LOWER(r.origen)
      AND LOWER(o.destino) = LOWER(r.destino)
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE r.id_ruta = ?
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idProveedor), Number(idRuta)],
    "No se puede eliminar la ruta del proveedor porque tiene una operacion abierta ligada."
  );

const tieneOperacionAbiertaPorRuta = async (db, res, idRuta) =>
  bloquearSiTieneOperacionAbierta(
    db,
    res,
    `SELECT o.codigo_operacion
     FROM ruta r
     INNER JOIN proveedor_ruta pr ON pr.id_ruta = r.id_ruta
     INNER JOIN operacion o
       ON o.id_proveedor = pr.id_proveedor
      AND LOWER(o.origen) = LOWER(r.origen)
      AND LOWER(o.destino) = LOWER(r.destino)
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE r.id_ruta = ?
       AND r.estado = 1
       AND ${OPERACION_ABIERTA_WHERE}
     LIMIT 1`,
    [Number(idRuta)],
    "No se puede eliminar la ruta porque tiene una operacion abierta ligada."
  );

module.exports = {
  tieneOperacionAbiertaPorCliente,
  tieneOperacionAbiertaPorProveedor,
  tieneOperacionAbiertaPorTipoServicio,
  tieneOperacionAbiertaPorTipoNacionalizacion,
  tieneOperacionAbiertaPorIncoterm,
  tieneOperacionAbiertaPorEstadoOperacion,
  tieneOperacionAbiertaPorContenedor,
  tieneOperacionAbiertaPorTipoContenedor,
  tieneOperacionAbiertaPorTipoCosto,
  tieneOperacionAbiertaPorMoneda,
  tieneOperacionAbiertaPorTipoDocumento,
  tieneOperacionAbiertaPorCosto,
  tieneOperacionAbiertaPorVenta,
  tieneOperacionAbiertaPorDocumento,
  tieneOperacionAbiertaPorCuentaProveedor,
  tieneOperacionAbiertaPorProveedorRuta,
  tieneOperacionAbiertaPorRuta,
};
