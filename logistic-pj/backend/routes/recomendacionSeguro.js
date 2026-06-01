const express = require("express");

const router = express.Router();
const db = require("../db");

const FLASK_IA_URL = process.env.FLASK_IA_URL || "http://localhost:5000/api/recomendar-seguro";

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
      o.cantidad
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
      c.peso_bruto
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
  res.status(404).json({
    error: "La recomendacion de seguro no se almacena. Genera una nueva recomendacion para verla.",
  });
});

router.post("/operacion/:id_operacion", async (req, res) => {
  try {
    const operacion = await obtenerOperacionConContenedores(req.params.id_operacion);

    if (!operacion) {
      return res.status(404).json({ error: "Operacion no encontrada." });
    }

    if (!operacion.contenedores.length) {
      return res.status(400).json({
        error: "La operacion debe tener al menos un contenedor asignado antes de recomendar seguro.",
      });
    }

    const payload = {
      id_operacion: operacion.id_operacion,
      codigo_operacion: operacion.codigo_operacion,
      tipo_servicio: operacion.tipo_servicio,
      tipo_nacionalizacion: operacion.tipo_nacionalizacion,
      producto: operacion.porducto,
      cantidad: Number(operacion.cantidad || operacion.contenedores.length),
      origen: operacion.origen,
      destino: operacion.destino,
      contenedores: operacion.contenedores.map((contenedor) => ({
        id_contenedor: contenedor.id_contenedor,
        numero_contenedor: contenedor.numero_contenedor,
        tipo_contenedor: contenedor.tipo_contenedor || "",
        peso_bruto: Number(contenedor.peso_bruto || 0),
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
        detalle: recomendacion?.error || recomendacion,
      });
    }

    res.status(200).json({
      id_operacion: Number(operacion.id_operacion),
      codigo_operacion: operacion.codigo_operacion,
      fecha_recomendacion: new Date().toISOString(),
      ...recomendacion,
    });
  } catch (error) {
    console.error("Error al generar recomendacion de seguro:", error);
    res.status(500).json({
      error: "Error al generar recomendacion de seguro",
      detalle: error.message,
    });
  }
});

module.exports = router;
