const express = require("express");

const router = express.Router();
const db = require("../db");

const FLASK_IA_URL = process.env.FLASK_IA_URL || "http://localhost:5000/api/recomendar-seguro";

const parseMotivos = (valor) => {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor;

  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(valor)
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
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
  try {
    const [rows] = await db.query(
      `SELECT
        rs.id_recomendacion,
        rs.id_operacion,
        o.codigo_operacion,
        rs.requiere_seguro,
        rs.nivel_riesgo,
        rs.puntaje_riesgo,
        rs.tipo_seguro_recomendado,
        rs.motivos,
        rs.fecha_recomendacion,
        rs.estado
      FROM recomendacion_seguro rs
      INNER JOIN operacion o ON o.id_operacion = rs.id_operacion
      WHERE rs.estado = 1
      ORDER BY rs.id_recomendacion DESC`
    );

    res.json(rows.map((row) => ({ ...row, motivos: parseMotivos(row.motivos) })));
  } catch (error) {
    console.error("Error al obtener recomendaciones de seguro:", error);
    res.status(500).json({ error: "Error al obtener recomendaciones de seguro" });
  }
});

router.get("/operacion/:id_operacion", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_recomendacion,
        id_operacion,
        requiere_seguro,
        nivel_riesgo,
        puntaje_riesgo,
        tipo_seguro_recomendado,
        motivos,
        fecha_recomendacion,
        estado
      FROM recomendacion_seguro
      WHERE id_operacion = ?
        AND estado = 1
      ORDER BY id_recomendacion DESC
      LIMIT 1`,
      [Number(req.params.id_operacion)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "La operacion aun no tiene recomendacion." });
    }

    res.json({ ...rows[0], motivos: parseMotivos(rows[0].motivos) });
  } catch (error) {
    console.error("Error al obtener recomendacion de seguro:", error);
    res.status(500).json({ error: "Error al obtener recomendacion de seguro" });
  }
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

    await db.query(
      `UPDATE recomendacion_seguro
       SET estado = 0
       WHERE id_operacion = ?
         AND estado = 1`,
      [Number(operacion.id_operacion)]
    );

    const [result] = await db.query(
      `INSERT INTO recomendacion_seguro (
        id_operacion,
        requiere_seguro,
        nivel_riesgo,
        puntaje_riesgo,
        tipo_seguro_recomendado,
        motivos,
        fecha_recomendacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)`,
      [
        Number(operacion.id_operacion),
        recomendacion.requiere_seguro ? 1 : 0,
        recomendacion.nivel_riesgo,
        Number(recomendacion.puntaje_riesgo || 0),
        recomendacion.tipo_seguro_recomendado,
        JSON.stringify(recomendacion.motivos || []),
      ]
    );

    res.status(201).json({
      id_recomendacion: result.insertId,
      id_operacion: Number(operacion.id_operacion),
      codigo_operacion: operacion.codigo_operacion,
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
