const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  try {
    const [[operationsRow]] = await db.query(
      `SELECT COUNT(*) AS total_operaciones
       FROM operacion
       WHERE estado = 1`
    );

    const [[containersRow]] = await db.query(
      `SELECT COUNT(*) AS total_contenedores
       FROM contenedor
       WHERE estado = 1`
    );

    const [[clientsRow]] = await db.query(
      `SELECT COUNT(*) AS total_clientes
       FROM cliente
       WHERE estado = 1`
    );

    res.json({
      total_operaciones: operationsRow?.total_operaciones ?? 0,
      total_contenedores: containersRow?.total_contenedores ?? 0,
      total_clientes: clientsRow?.total_clientes ?? 0,
    });
  } catch (err) {
    res.status(500).json({
      error: "Error al obtener datos del dashboard: " + err.message,
    });
  }
});

module.exports = router;
