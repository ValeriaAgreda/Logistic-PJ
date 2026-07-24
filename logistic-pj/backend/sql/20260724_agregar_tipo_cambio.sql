ALTER TABLE costo_operacion
  ADD COLUMN tipo_cambio DECIMAL(10,4) NULL AFTER monto;

ALTER TABLE venta_operacion
  ADD COLUMN tipo_cambio DECIMAL(10,4) NULL AFTER monto;

-- Identifica los registros historicos en dolares que necesitan su tipo de cambio real.
SELECT
  'COSTO' AS origen,
  co.id_costo AS id_movimiento,
  co.monto,
  co.tipo_cambio
FROM costo_operacion co
INNER JOIN moneda m ON m.id_moneda = co.id_moneda
WHERE co.estado = 1
  AND (
    UPPER(m.codigo) IN ('USD', '$US', 'SUS', 'DOL')
    OR UPPER(m.descripcion) LIKE '%DOLAR%'
  )
UNION ALL
SELECT
  'VENTA' AS origen,
  vo.id_venta AS id_movimiento,
  vo.monto,
  vo.tipo_cambio
FROM venta_operacion vo
INNER JOIN moneda m ON m.id_moneda = vo.id_moneda
WHERE vo.estado = 1
  AND (
    UPPER(m.codigo) IN ('USD', '$US', 'SUS', 'DOL')
    OR UPPER(m.descripcion) LIKE '%DOLAR%'
  );

-- Completa cada registro historico con el tipo de cambio que realmente le correspondia.
-- Ejemplos (reemplaza los identificadores y valores; no asumas una tasa historica):
-- UPDATE costo_operacion SET tipo_cambio = 6.9600 WHERE id_costo = 1;
-- UPDATE venta_operacion SET tipo_cambio = 6.9600 WHERE id_venta = 1;

-- Verificacion final: esta consulta debe devolver cero filas.
SELECT 'COSTO' AS origen, co.id_costo AS id_movimiento
FROM costo_operacion co
INNER JOIN moneda m ON m.id_moneda = co.id_moneda
WHERE co.estado = 1
  AND (
    UPPER(m.codigo) IN ('USD', '$US', 'SUS', 'DOL')
    OR UPPER(m.descripcion) LIKE '%DOLAR%'
  )
  AND (co.tipo_cambio IS NULL OR co.tipo_cambio <= 0)
UNION ALL
SELECT 'VENTA' AS origen, vo.id_venta AS id_movimiento
FROM venta_operacion vo
INNER JOIN moneda m ON m.id_moneda = vo.id_moneda
WHERE vo.estado = 1
  AND (
    UPPER(m.codigo) IN ('USD', '$US', 'SUS', 'DOL')
    OR UPPER(m.descripcion) LIKE '%DOLAR%'
  )
  AND (vo.tipo_cambio IS NULL OR vo.tipo_cambio <= 0);
