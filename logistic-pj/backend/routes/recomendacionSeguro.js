const express = require("express");

const router = express.Router();
const db = require("../db");

const FLASK_IA_URL = process.env.FLASK_IA_URL || "http://localhost:5000/api/recomendar-seguro";

const parseJsonField = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const mapearRecomendacion = (row) => {
  if (!row) return null;

  const respuesta = parseJsonField(row.respuesta_ia, {});

  return {
    ...respuesta,
    id_recomendacion_seguro: row.id_recomendacion_seguro,
    id_operacion: row.id_operacion,
    fecha_recomendacion: row.fecha_recomendacion,
    requiere_seguro: Boolean(row.requiere_seguro),
    nivel_riesgo: row.nivel_riesgo,
    puntaje_riesgo: row.puntaje_riesgo === null ? null : Number(row.puntaje_riesgo),
    tipo_seguro_recomendado: row.tipo_seguro_recomendado,
    resumen_ia: row.resumen_ia || respuesta.resumen_ia || "",
    motivos_ia: parseJsonField(row.motivos_ia, respuesta.motivos_ia || []),
    acciones_recomendadas: parseJsonField(
      row.acciones_recomendadas,
      respuesta.acciones_recomendadas || []
    ),
    motivos: parseJsonField(row.metricas_usadas, respuesta.motivos || []),
    metricas_usadas: parseJsonField(row.metricas_usadas, respuesta.metricas_usadas || []),
    modelo_ia: row.modelo_ia || respuesta.modelo_ia || null,
    fuente_recomendacion: row.fuente_recomendacion || respuesta.fuente_recomendacion || "gemini",
    almacenada: true,
  };
};

const obtenerRecomendacionGuardada = async (idOperacion) => {
  const [rows] = await db.query(
    `SELECT *
     FROM recomendacion_seguro
     WHERE id_operacion = ?
       AND estado = 1
     LIMIT 1`,
    [Number(idOperacion)]
  );

  return mapearRecomendacion(rows[0]);
};

const guardarRecomendacion = async (operacion, recomendacion) => {
  const fechaRecomendacion = new Date();
  const respuesta = {
    ...recomendacion,
    id_operacion: Number(operacion.id_operacion),
    codigo_operacion: operacion.codigo_operacion,
    fecha_recomendacion: fechaRecomendacion.toISOString(),
    almacenada: true,
  };

  await db.query(
    `INSERT INTO recomendacion_seguro (
       id_operacion,
       fecha_recomendacion,
       requiere_seguro,
       nivel_riesgo,
       puntaje_riesgo,
       tipo_seguro_recomendado,
       resumen_ia,
       motivos_ia,
       acciones_recomendadas,
       metricas_usadas,
       respuesta_ia,
       modelo_ia,
       fuente_recomendacion,
       estado
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       fecha_recomendacion = VALUES(fecha_recomendacion),
       requiere_seguro = VALUES(requiere_seguro),
       nivel_riesgo = VALUES(nivel_riesgo),
       puntaje_riesgo = VALUES(puntaje_riesgo),
       tipo_seguro_recomendado = VALUES(tipo_seguro_recomendado),
       resumen_ia = VALUES(resumen_ia),
       motivos_ia = VALUES(motivos_ia),
       acciones_recomendadas = VALUES(acciones_recomendadas),
       metricas_usadas = VALUES(metricas_usadas),
       respuesta_ia = VALUES(respuesta_ia),
       modelo_ia = VALUES(modelo_ia),
       fuente_recomendacion = VALUES(fuente_recomendacion),
       estado = 1`,
    [
      Number(operacion.id_operacion),
      fechaRecomendacion,
      recomendacion.requiere_seguro ? 1 : 0,
      recomendacion.nivel_riesgo || "",
      recomendacion.puntaje_riesgo ?? null,
      recomendacion.tipo_seguro_recomendado || "",
      recomendacion.resumen_ia || "",
      JSON.stringify(recomendacion.motivos_ia || []),
      JSON.stringify(recomendacion.acciones_recomendadas || []),
      JSON.stringify(recomendacion.motivos || recomendacion.metricas_usadas || []),
      JSON.stringify(respuesta),
      recomendacion.modelo_ia || null,
      recomendacion.fuente_recomendacion || "gemini",
    ]
  );

  return obtenerRecomendacionGuardada(operacion.id_operacion);
};

const obtenerOperacionConContenedores = async (idOperacion) => {
  const [operaciones] = await db.query(
    `SELECT
      o.id_operacion,
      o.codigo_operacion,
      o.id_tipo_servicio,
      ts.descripcion AS tipo_servicio,
      o.id_tipo_nacionalizacion,
      tn.descripcion AS tipo_nacionalizacion,
      o.porducto,
      o.origen,
      o.destino,
      o.cantidad,
      o.lcl,
      o.volumen,
      o.peso,
      o.nro_madre,
      o.nro_hijo,
      o.observacion,
      DATE_FORMAT(o.etd, '%Y-%m-%d') AS etd,
      DATE_FORMAT(o.eta, '%Y-%m-%d') AS eta
    FROM operacion o
    INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = o.id_tipo_servicio
    INNER JOIN tipo_nacionalizacion tn
      ON tn.id_tipo_nacionalizacion = o.id_tipo_nacionalizacion
    WHERE o.id_operacion = ?
      AND o.estado = 1`,
    [Number(idOperacion)]
  );

  if (operaciones.length === 0) {
    return null;
  }

  const [contenedores] = await db.query(
    `SELECT
      c.id_contenedor,
      c.numero_contenedor,
      tc.descripcion AS tipo_contenedor,
      c.naviera,
      c.peso_bruto,
      DATE_FORMAT(oc.fecha_llegada_puerto, '%Y-%m-%d') AS fecha_llegada_puerto,
      DATE_FORMAT(oc.fecha_devolucion_limite, '%Y-%m-%d') AS fecha_devolucion_limite,
      DATE_FORMAT(oc.fecha_devolucion, '%Y-%m-%d') AS fecha_devolucion
    FROM operacion_contenedor oc
    INNER JOIN contenedor c ON c.id_contenedor = oc.id_contenedor
    LEFT JOIN tipo_contenedor tc ON tc.id_tipo_contenedor = c.id_tipo_contenedor
    WHERE oc.id_operacion = ?
      AND oc.estado = 1
      AND c.estado = 1
    ORDER BY c.id_contenedor`,
    [Number(idOperacion)]
  );

  return {
    ...operaciones[0],
    contenedores,
  };
};

router.get("/", async (_req, res) => {
  res.json([]);
});

router.get("/operacion/:id_operacion", async (req, res) => {
  try {
    const recomendacion = await obtenerRecomendacionGuardada(req.params.id_operacion);

    if (!recomendacion) {
      return res.status(404).json({
        error: "Esta operacion aun no tiene recomendacion de seguro.",
      });
    }

    res.json(recomendacion);
  } catch (error) {
    console.error("Error al obtener recomendacion de seguro:", error);
    res.status(500).json({
      error: "Error al obtener recomendacion de seguro",
      detalle: error.message,
    });
  }
});

router.post("/operacion/:id_operacion", async (req, res) => {
  try {
    const operacion = await obtenerOperacionConContenedores(req.params.id_operacion);

    if (!operacion) {
      return res.status(404).json({ error: "Operacion no encontrada." });
    }

    const recomendacionGuardada = await obtenerRecomendacionGuardada(operacion.id_operacion);
    if (recomendacionGuardada && req.query.regenerar !== "1") {
      return res.status(200).json(recomendacionGuardada);
    }

    const tipoServicio = String(operacion.tipo_servicio || "").trim().toLowerCase();
    const esLcl = Number(operacion.lcl) === 1;
    const servicioPermiteContenedor =
      tipoServicio === "maritimo" || tipoServicio === "terrestre" || tipoServicio === "bimodal";

    if (servicioPermiteContenedor && !esLcl && !operacion.contenedores.length) {
      return res.status(400).json({
        error: "Esta operacion requiere al menos un contenedor asignado para recomendar seguro.",
      });
    }

    const usaContenedores = operacion.contenedores.length > 0;
    const modalidadCarga = usaContenedores
      ? "contenedorizada"
      : esLcl
        ? "lcl_carga_suelta"
        : "carga_no_contenedorizada";

    const payload = {
      id_operacion: operacion.id_operacion,
      codigo_operacion: operacion.codigo_operacion,
      tipo_servicio: operacion.tipo_servicio,
      tipo_nacionalizacion: operacion.tipo_nacionalizacion,
      producto: operacion.porducto,
      modalidad_carga: modalidadCarga,
      usa_contenedores: usaContenedores,
      lcl: esLcl,
      cantidad: esLcl ? operacion.cantidad : null,
      volumen: esLcl ? Number(operacion.volumen || 0) || null : null,
      peso: esLcl ? Number(operacion.peso || 0) || null : null,
      origen: operacion.origen,
      destino: operacion.destino,
      nro_madre: operacion.nro_madre,
      nro_hijo: operacion.nro_hijo,
      observacion: operacion.observacion,
      etd: operacion.etd,
      eta: operacion.eta,
      contenedores: operacion.contenedores.map((contenedor) => ({
        id_contenedor: contenedor.id_contenedor,
        numero_contenedor: contenedor.numero_contenedor,
        tipo_contenedor: contenedor.tipo_contenedor || "",
        naviera: contenedor.naviera || "",
        peso_bruto: Number(contenedor.peso_bruto || 0),
        fecha_llegada_puerto: contenedor.fecha_llegada_puerto,
        fecha_devolucion_limite: contenedor.fecha_devolucion_limite,
        fecha_devolucion: contenedor.fecha_devolucion,
      })),
    };

    const flaskResponse = await fetch(FLASK_IA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const recomendacion = await flaskResponse.json();

    if (!flaskResponse.ok) {
      return res.status(502).json({
        error: "El microservicio IA no pudo generar la recomendacion.",
        detalle: recomendacion?.detalle || recomendacion?.error || recomendacion,
      });
    }

    const recomendacionGenerada = {
      id_operacion: Number(operacion.id_operacion),
      codigo_operacion: operacion.codigo_operacion,
      fecha_recomendacion: new Date().toISOString(),
      ...recomendacion,
    };

    const recomendacionGuardadaNueva = await guardarRecomendacion(operacion, recomendacionGenerada);
    res.status(200).json(recomendacionGuardadaNueva || recomendacionGenerada);
  } catch (error) {
    console.error("Error al generar recomendacion de seguro:", error);
    res.status(500).json({
      error: "Error al generar recomendacion de seguro",
      detalle: error.message,
    });
  }
});

module.exports = router;
