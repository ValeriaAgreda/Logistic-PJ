const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");

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
      // La cookie puede no venir como JSON parseable.
    }
  }

  const headerUserId = req.headers["x-user-id"];
  if (headerUserId && !Number.isNaN(Number(headerUserId))) {
    return Number(headerUserId);
  }

  return null;
};

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        c.id_contenedor,
        c.numero_contenedor,
        c.id_tipo_contenedor,
        tc.descripcion AS tipo_contenedor,
        c.naviera,
        c.peso_neto,
        c.peso_bruto,
        c.dimensiones,
        c.cbm,
        c.fecha_registro,
        c.id_usuario_registro,
        c.estado
      FROM contenedor c
      LEFT JOIN tipo_contenedor tc
        ON tc.id_tipo_contenedor = c.id_tipo_contenedor
      WHERE c.estado = 1
      ORDER BY c.id_contenedor DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener contenedores:", err);
    res.status(500).json({ error: "Error al obtener contenedores" });
  }
});

router.get("/:id_contenedor", async (req, res) => {
  try {
    const { id_contenedor } = req.params;

    const [rows] = await db.query(
      `SELECT
        c.id_contenedor,
        c.numero_contenedor,
        c.id_tipo_contenedor,
        tc.descripcion AS tipo_contenedor,
        c.naviera,
        c.peso_neto,
        c.peso_bruto,
        c.dimensiones,
        c.cbm,
        c.fecha_registro,
        c.id_usuario_registro,
        c.estado
      FROM contenedor c
      LEFT JOIN tipo_contenedor tc
        ON tc.id_tipo_contenedor = c.id_tipo_contenedor
      WHERE c.id_contenedor = ?`,
      [id_contenedor]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Contenedor no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener contenedor:", err);
    res.status(500).json({ error: "Error al obtener contenedor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      numero_contenedor,
      id_tipo_contenedor,
      naviera,
      peso_neto,
      peso_bruto,
      dimensiones,
      cbm,
    } = req.body;

    if (!numero_contenedor || !String(numero_contenedor).trim()) {
      return res.status(400).json({ error: "El numero de contenedor es obligatorio." });
    }

    if (!id_tipo_contenedor || Number.isNaN(Number(id_tipo_contenedor))) {
      return res.status(400).json({ error: "El tipo de contenedor es obligatorio." });
    }

    if (!naviera || !String(naviera).trim()) {
      return res.status(400).json({ error: "La naviera es obligatoria." });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que realiza el registro.",
      });
    }

    const [tipos] = await db.query(
      `SELECT id_tipo_contenedor
       FROM tipo_contenedor
       WHERE id_tipo_contenedor = ? AND estado = 1`,
      [Number(id_tipo_contenedor)]
    );

    if (tipos.length === 0) {
      return res.status(400).json({ error: "El tipo de contenedor no es valido." });
    }

    const [result] = await db.query(
      `INSERT INTO contenedor (
        numero_contenedor,
        id_tipo_contenedor,
        naviera,
        peso_neto,
        peso_bruto,
        dimensiones,
        cbm,
        fecha_registro,
        id_usuario_registro,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)`,
      [
        String(numero_contenedor).trim().toUpperCase(),
        Number(id_tipo_contenedor),
        String(naviera).trim(),
        peso_neto === "" || peso_neto === null || peso_neto === undefined
          ? null
          : Number(peso_neto),
        peso_bruto === "" || peso_bruto === null || peso_bruto === undefined
          ? null
          : Number(peso_bruto),
        dimensiones ? String(dimensiones).trim() : null,
        cbm ? String(cbm).trim() : null,
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_contenedor: result.insertId,
      mensaje: "Contenedor creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear contenedor:", err);
    res.status(500).json({ error: "Error al crear contenedor" });
  }
});

router.put("/:id_contenedor", async (req, res) => {
  try {
    const { id_contenedor } = req.params;
    const {
      numero_contenedor,
      id_tipo_contenedor,
      naviera,
      peso_neto,
      peso_bruto,
      dimensiones,
      cbm,
    } = req.body;

    if (!numero_contenedor || !String(numero_contenedor).trim()) {
      return res.status(400).json({ error: "El numero de contenedor es obligatorio." });
    }

    if (!id_tipo_contenedor || Number.isNaN(Number(id_tipo_contenedor))) {
      return res.status(400).json({ error: "El tipo de contenedor es obligatorio." });
    }

    if (!naviera || !String(naviera).trim()) {
      return res.status(400).json({ error: "La naviera es obligatoria." });
    }

    const [tipos] = await db.query(
      `SELECT id_tipo_contenedor
       FROM tipo_contenedor
       WHERE id_tipo_contenedor = ? AND estado = 1`,
      [Number(id_tipo_contenedor)]
    );

    if (tipos.length === 0) {
      return res.status(400).json({ error: "El tipo de contenedor no es valido." });
    }

    const [result] = await db.query(
      `UPDATE contenedor
       SET numero_contenedor = ?,
           id_tipo_contenedor = ?,
           naviera = ?,
           peso_neto = ?,
           peso_bruto = ?,
           dimensiones = ?,
           cbm = ?
       WHERE id_contenedor = ?`,
      [
        String(numero_contenedor).trim().toUpperCase(),
        Number(id_tipo_contenedor),
        String(naviera).trim(),
        peso_neto === "" || peso_neto === null || peso_neto === undefined
          ? null
          : Number(peso_neto),
        peso_bruto === "" || peso_bruto === null || peso_bruto === undefined
          ? null
          : Number(peso_bruto),
        dimensiones ? String(dimensiones).trim() : null,
        cbm ? String(cbm).trim() : null,
        id_contenedor,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Contenedor no encontrado." });
    }

    res.json({ mensaje: "Contenedor actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar contenedor:", err);
    res.status(500).json({ error: "Error al actualizar contenedor" });
  }
});

router.delete("/:id_contenedor", async (req, res) => {
  try {
    const { id_contenedor } = req.params;

    const [result] = await db.query(
      `UPDATE contenedor
       SET estado = 0
       WHERE id_contenedor = ?`,
      [id_contenedor]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Contenedor no encontrado." });
    }

    res.json({ mensaje: "Contenedor desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar contenedor:", err);
    res.status(500).json({ error: "Error al eliminar contenedor" });
  }
});

module.exports = router;
