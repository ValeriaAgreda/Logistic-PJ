const express = require("express");
const router = express.Router();
const db = require("../db");

const toNumber = (value) => Number(value || 0);

router.get("/", async (_req, res) => {
  try {
    const [
      [operationsCount],
      [containersCount],
      [clientsCount],
      [openOperationsCount],
      [operationsByStatus],
      [operationsByClientStatus],
      [operationsByService],
      [operationsByMonth],
      [topClients],
      [financialByCurrency],
      [recentOperations],
      [clients],
      [statuses],
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total
         FROM operacion
         WHERE estado = 1`
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM contenedor
         WHERE estado = 1`
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM cliente
         WHERE estado = 1`
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM operacion o
         INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
         WHERE o.estado = 1
           AND LOWER(eo.descripcion) <> 'cerrado'`
      ),
      db.query(
        `SELECT
           eo.id_estado_operacion,
           eo.descripcion AS estado_operacion,
           COUNT(o.id_operacion) AS total
         FROM estado_operacion eo
         LEFT JOIN operacion o
           ON o.id_estado_operacion = eo.id_estado_operacion
          AND o.estado = 1
         WHERE eo.estado = 1
         GROUP BY eo.id_estado_operacion, eo.descripcion
         ORDER BY total DESC, eo.descripcion ASC`
      ),
      db.query(
        `SELECT
           c.id_cliente,
           c.razon_social AS cliente,
           eo.id_estado_operacion,
           eo.descripcion AS estado_operacion,
           COUNT(o.id_operacion) AS total
         FROM operacion o
         INNER JOIN cliente c ON c.id_cliente = o.id_cliente
         INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
         WHERE o.estado = 1
         GROUP BY c.id_cliente, c.razon_social, eo.id_estado_operacion, eo.descripcion
         ORDER BY c.razon_social ASC, eo.descripcion ASC`
      ),
      db.query(
        `SELECT
           ts.id_tipo_servicio,
           ts.descripcion AS tipo_servicio,
           COUNT(o.id_operacion) AS total
         FROM tipo_servicio ts
         LEFT JOIN operacion o
           ON o.id_tipo_servicio = ts.id_tipo_servicio
          AND o.estado = 1
         WHERE ts.estado = 1
         GROUP BY ts.id_tipo_servicio, ts.descripcion
         ORDER BY total DESC, ts.descripcion ASC`
      ),
      db.query(
        `SELECT
           DATE_FORMAT(o.fecha_asignacion, '%Y-%m') AS periodo,
           DATE_FORMAT(o.fecha_asignacion, '%b %Y') AS etiqueta,
           COUNT(*) AS total
         FROM operacion o
         WHERE o.estado = 1
           AND o.fecha_asignacion >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
         GROUP BY periodo, etiqueta
         ORDER BY periodo ASC`
      ),
      db.query(
        `SELECT
           c.id_cliente,
           c.razon_social AS cliente,
           COUNT(o.id_operacion) AS total
         FROM cliente c
         INNER JOIN operacion o
           ON o.id_cliente = c.id_cliente
          AND o.estado = 1
         WHERE c.estado = 1
         GROUP BY c.id_cliente, c.razon_social
         ORDER BY total DESC, c.razon_social ASC
         LIMIT 8`
      ),
      db.query(
        `SELECT
           moneda.codigo_moneda,
           SUM(moneda.total_costos) AS total_costos,
           SUM(moneda.total_ventas) AS total_ventas,
           SUM(moneda.total_ventas - moneda.total_costos) AS utilidad
         FROM (
           SELECT
             m.codigo AS codigo_moneda,
             SUM(co.monto) AS total_costos,
             0 AS total_ventas
           FROM costo_operacion co
           INNER JOIN moneda m ON m.id_moneda = co.id_moneda
           INNER JOIN operacion o ON o.id_operacion = co.id_operacion
           WHERE co.estado = 1
             AND o.estado = 1
           GROUP BY m.codigo
           UNION ALL
           SELECT
             m.codigo AS codigo_moneda,
             0 AS total_costos,
             SUM(vo.monto) AS total_ventas
           FROM venta_operacion vo
           INNER JOIN moneda m ON m.id_moneda = vo.id_moneda
           INNER JOIN operacion o ON o.id_operacion = vo.id_operacion
           WHERE vo.estado = 1
             AND o.estado = 1
           GROUP BY m.codigo
         ) moneda
         GROUP BY moneda.codigo_moneda
         ORDER BY utilidad DESC, moneda.codigo_moneda ASC`
      ),
      db.query(
        `SELECT
           o.id_operacion,
           o.codigo_operacion,
           DATE_FORMAT(o.fecha_asignacion, '%Y-%m-%d') AS fecha_asignacion,
           c.razon_social AS cliente,
           ts.descripcion AS tipo_servicio,
           eo.descripcion AS estado_operacion,
           o.origen,
           o.destino
         FROM operacion o
         INNER JOIN cliente c ON c.id_cliente = o.id_cliente
         INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = o.id_tipo_servicio
         INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
         WHERE o.estado = 1
         ORDER BY o.fecha_asignacion DESC, o.id_operacion DESC
         LIMIT 8`
      ),
      db.query(
        `SELECT id_cliente, razon_social AS cliente
         FROM cliente
         WHERE estado = 1
         ORDER BY razon_social ASC`
      ),
      db.query(
        `SELECT id_estado_operacion, descripcion AS estado_operacion
         FROM estado_operacion
         WHERE estado = 1
         ORDER BY descripcion ASC`
      ),
    ]);

    res.json({
      metrics: {
        total_operaciones: toNumber(operationsCount[0]?.total),
        operaciones_abiertas: toNumber(openOperationsCount[0]?.total),
        total_contenedores: toNumber(containersCount[0]?.total),
        total_clientes: toNumber(clientsCount[0]?.total),
      },
      operations_by_status: operationsByStatus.map((row) => ({
        ...row,
        total: toNumber(row.total),
      })),
      operations_by_client_status: operationsByClientStatus.map((row) => ({
        ...row,
        total: toNumber(row.total),
      })),
      operations_by_service: operationsByService.map((row) => ({
        ...row,
        total: toNumber(row.total),
      })),
      operations_by_month: operationsByMonth.map((row) => ({
        ...row,
        total: toNumber(row.total),
      })),
      top_clients: topClients.map((row) => ({
        ...row,
        total: toNumber(row.total),
      })),
      financial_by_currency: financialByCurrency.map((row) => ({
        ...row,
        total_costos: toNumber(row.total_costos),
        total_ventas: toNumber(row.total_ventas),
        utilidad: toNumber(row.utilidad),
      })),
      recent_operations: recentOperations,
      clients,
      statuses,
    });
  } catch (err) {
    console.error("Error al obtener datos del dashboard:", err);
    res.status(500).json({
      error: "Error al obtener datos del dashboard",
      detalle: err.message,
    });
  }
});

module.exports = router;
