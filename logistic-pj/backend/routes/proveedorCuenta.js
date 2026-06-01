const express = require("express");
const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorCuentaProveedor } = require("../utils/deleteGuards");

const NUMERO_CUENTA_REGEX = /^[A-Za-z0-9\s-]{5,34}$/;

const validarNumeroCuenta = (nroCuenta) =>
  NUMERO_CUENTA_REGEX.test(String(nroCuenta || "").trim());

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        pc.id_cuenta,
        pc.id_proveedor,
        p.empresa,
        pc.banco,
        pc.nro_cuenta,
        pc.moneda,
        pc.titular,
        pc.observacion,
        pc.estado
      FROM proveedor_cuenta pc
      INNER JOIN proveedor p ON p.id_proveedor = pc.id_proveedor
      WHERE pc.estado = 1
      ORDER BY pc.id_cuenta DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener cuentas de proveedor:", err);
    res.status(500).json({ error: "Error al obtener cuentas de proveedor" });
  }
});

router.get("/:id_cuenta", async (req, res) => {
  try {
    const { id_cuenta } = req.params;

    const [rows] = await db.query(
      `SELECT
        pc.id_cuenta,
        pc.id_proveedor,
        p.empresa,
        pc.banco,
        pc.nro_cuenta,
        pc.moneda,
        pc.titular,
        pc.observacion,
        pc.estado
      FROM proveedor_cuenta pc
      INNER JOIN proveedor p ON p.id_proveedor = pc.id_proveedor
      WHERE pc.id_cuenta = ?`,
      [id_cuenta]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Cuenta de proveedor no encontrada." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener cuenta de proveedor:", err);
    res.status(500).json({ error: "Error al obtener cuenta de proveedor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      id_proveedor,
      banco,
      nro_cuenta,
      moneda,
      titular,
      observacion,
    } = req.body;

    if (!id_proveedor || Number.isNaN(Number(id_proveedor))) {
      return res.status(400).json({ error: "El proveedor es obligatorio." });
    }

    if (!banco || !String(banco).trim()) {
      return res.status(400).json({ error: "El banco es obligatorio." });
    }

    if (!nro_cuenta || !String(nro_cuenta).trim()) {
      return res.status(400).json({ error: "El numero de cuenta es obligatorio." });
    }

    if (!validarNumeroCuenta(nro_cuenta)) {
      return res.status(400).json({
        error:
          "El numero de cuenta debe tener entre 5 y 34 caracteres y solo puede contener letras, numeros, espacios o guiones.",
      });
    }

    if (!moneda || !String(moneda).trim()) {
      return res.status(400).json({ error: "La moneda es obligatoria." });
    }

    if (!titular || !String(titular).trim()) {
      return res.status(400).json({ error: "El titular es obligatorio." });
    }

    const [proveedores] = await db.query(
      `SELECT id_proveedor
       FROM proveedor
       WHERE id_proveedor = ? AND estado = 1`,
      [Number(id_proveedor)]
    );

    if (proveedores.length === 0) {
      return res.status(400).json({ error: "El proveedor seleccionado no es valido." });
    }

    const [result] = await db.query(
      `INSERT INTO proveedor_cuenta (
        id_proveedor,
        banco,
        nro_cuenta,
        moneda,
        titular,
        observacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        Number(id_proveedor),
        String(banco).trim(),
        String(nro_cuenta).trim(),
        String(moneda).trim().toUpperCase(),
        String(titular).trim(),
        observacion ? String(observacion).trim() : null,
      ]
    );

    res.status(201).json({
      id_cuenta: result.insertId,
      mensaje: "Cuenta de proveedor creada correctamente.",
    });
  } catch (err) {
    console.error("Error al crear cuenta de proveedor:", err);
    res.status(500).json({ error: "Error al crear cuenta de proveedor" });
  }
});

router.put("/:id_cuenta", async (req, res) => {
  try {
    const { id_cuenta } = req.params;
    const {
      id_proveedor,
      banco,
      nro_cuenta,
      moneda,
      titular,
      observacion,
    } = req.body;

    if (!id_proveedor || Number.isNaN(Number(id_proveedor))) {
      return res.status(400).json({ error: "El proveedor es obligatorio." });
    }

    if (!banco || !String(banco).trim()) {
      return res.status(400).json({ error: "El banco es obligatorio." });
    }

    if (!nro_cuenta || !String(nro_cuenta).trim()) {
      return res.status(400).json({ error: "El numero de cuenta es obligatorio." });
    }

    if (!validarNumeroCuenta(nro_cuenta)) {
      return res.status(400).json({
        error:
          "El numero de cuenta debe tener entre 5 y 34 caracteres y solo puede contener letras, numeros, espacios o guiones.",
      });
    }

    if (!moneda || !String(moneda).trim()) {
      return res.status(400).json({ error: "La moneda es obligatoria." });
    }

    if (!titular || !String(titular).trim()) {
      return res.status(400).json({ error: "El titular es obligatorio." });
    }

    const [proveedores] = await db.query(
      `SELECT id_proveedor
       FROM proveedor
       WHERE id_proveedor = ? AND estado = 1`,
      [Number(id_proveedor)]
    );

    if (proveedores.length === 0) {
      return res.status(400).json({ error: "El proveedor seleccionado no es valido." });
    }

    const [result] = await db.query(
      `UPDATE proveedor_cuenta
       SET id_proveedor = ?,
           banco = ?,
           nro_cuenta = ?,
           moneda = ?,
           titular = ?,
           observacion = ?
       WHERE id_cuenta = ?`,
      [
        Number(id_proveedor),
        String(banco).trim(),
        String(nro_cuenta).trim(),
        String(moneda).trim().toUpperCase(),
        String(titular).trim(),
        observacion ? String(observacion).trim() : null,
        id_cuenta,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cuenta de proveedor no encontrada." });
    }

    res.json({ mensaje: "Cuenta de proveedor actualizada correctamente." });
  } catch (err) {
    console.error("Error al actualizar cuenta de proveedor:", err);
    res.status(500).json({ error: "Error al actualizar cuenta de proveedor" });
  }
});

router.delete("/:id_cuenta", async (req, res) => {
  try {
    const { id_cuenta } = req.params;

    if (await tieneOperacionAbiertaPorCuentaProveedor(db, res, id_cuenta)) return;

    const [result] = await db.query(
      `UPDATE proveedor_cuenta
       SET estado = 0
       WHERE id_cuenta = ?`,
      [id_cuenta]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cuenta de proveedor no encontrada." });
    }

    res.json({ mensaje: "Cuenta de proveedor desactivada correctamente." });
  } catch (err) {
    console.error("Error al eliminar cuenta de proveedor:", err);
    res.status(500).json({ error: "Error al eliminar cuenta de proveedor" });
  }
});

module.exports = router;
