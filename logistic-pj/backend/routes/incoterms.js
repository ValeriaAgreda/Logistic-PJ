const express = require("express");
const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorIncoterm } = require("../utils/deleteGuards");

const normalizarDescripcion = (valor) => String(valor ?? "").trim().toUpperCase();

const validarDescripcion = (valor) => {
  const descripcion = normalizarDescripcion(valor);
  if (!descripcion) return "La descripcion es obligatoria.";
  if (descripcion.length > 50) return "La descripcion no puede superar 50 caracteres.";
  if (!/^[A-Z]+$/.test(descripcion)) return "La descripcion solo puede contener letras.";
  return null;
};

const responderErrorBaseDatos = (res, error, accion) => {
  if (error?.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Ya existe un Incoterm con esa descripcion." });
  }
  console.error(`Error al ${accion} Incoterm:`, error);
  return res.status(500).json({ error: `Error al ${accion} Incoterm` });
};

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_incoterm, descripcion, estado
       FROM incoterms
       WHERE estado = 1
       ORDER BY descripcion ASC`
    );
    res.json(rows);
  } catch (error) {
    responderErrorBaseDatos(res, error, "obtener");
  }
});

router.get("/:id_incoterm", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_incoterm, descripcion, estado
       FROM incoterms
       WHERE id_incoterm = ?`,
      [Number(req.params.id_incoterm)]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Incoterm no encontrado." });
    }
    res.json(rows[0]);
  } catch (error) {
    responderErrorBaseDatos(res, error, "obtener");
  }
});

router.post("/", async (req, res) => {
  const errorValidacion = validarDescripcion(req.body.descripcion);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  try {
    const descripcion = normalizarDescripcion(req.body.descripcion);
    const [existentes] = await db.query(
      `SELECT id_incoterm, estado
       FROM incoterms
       WHERE descripcion = ?
       LIMIT 1`,
      [descripcion]
    );

    if (existentes.length) {
      if (Number(existentes[0].estado) === 1) {
        return res.status(409).json({ error: "Ya existe un Incoterm con esa descripcion." });
      }
      await db.query(
        `UPDATE incoterms SET estado = 1 WHERE id_incoterm = ?`,
        [existentes[0].id_incoterm]
      );
      return res.status(200).json({
        id_incoterm: existentes[0].id_incoterm,
        mensaje: "Incoterm reactivado correctamente.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO incoterms (descripcion, estado) VALUES (?, 1)`,
      [descripcion]
    );
    res.status(201).json({
      id_incoterm: result.insertId,
      mensaje: "Incoterm creado correctamente.",
    });
  } catch (error) {
    responderErrorBaseDatos(res, error, "crear");
  }
});

router.put("/:id_incoterm", async (req, res) => {
  const errorValidacion = validarDescripcion(req.body.descripcion);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  try {
    const [result] = await db.query(
      `UPDATE incoterms
       SET descripcion = ?
       WHERE id_incoterm = ? AND estado = 1`,
      [
        normalizarDescripcion(req.body.descripcion),
        Number(req.params.id_incoterm),
      ]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Incoterm no encontrado." });
    }
    res.json({ mensaje: "Incoterm actualizado correctamente." });
  } catch (error) {
    responderErrorBaseDatos(res, error, "actualizar");
  }
});

router.delete("/:id_incoterm", async (req, res) => {
  try {
    const idIncoterm = Number(req.params.id_incoterm);
    if (await tieneOperacionAbiertaPorIncoterm(db, res, idIncoterm)) return;

    const [result] = await db.query(
      `UPDATE incoterms SET estado = 0
       WHERE id_incoterm = ? AND estado = 1`,
      [idIncoterm]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Incoterm no encontrado." });
    }
    res.json({ mensaje: "Incoterm desactivado correctamente." });
  } catch (error) {
    responderErrorBaseDatos(res, error, "eliminar");
  }
});

module.exports = router;
