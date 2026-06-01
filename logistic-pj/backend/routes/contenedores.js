const express = require("express");
const router = express.Router();
const db = require("../db");
const cookieParser = require("cookie-parser");
const { tieneOperacionAbiertaPorContenedor } = require("../utils/deleteGuards");

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

  return null;
};

const normalizarNumeroContenedor = (numero) => String(numero || "").trim().toUpperCase();

const existeNumeroContenedorActivo = async (numeroContenedor, idExcluir = null) => {
  const params = [normalizarNumeroContenedor(numeroContenedor)];
  let filtroExcluir = "";

  if (idExcluir) {
    filtroExcluir = "AND id_contenedor <> ?";
    params.push(Number(idExcluir));
  }

  const [rows] = await db.query(
    `SELECT id_contenedor
     FROM contenedor
     WHERE UPPER(numero_contenedor) = ?
       AND estado = 1
       ${filtroExcluir}
     LIMIT 1`,
    params
  );

  return rows.length > 0;
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
        c.peso_bruto,
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
        c.peso_bruto,
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
      peso_bruto,
    } = req.body;

    if (!numero_contenedor || !String(numero_contenedor).trim()) {
      return res.status(400).json({ error: "El numero de contenedor es obligatorio." });
    }

    if (await existeNumeroContenedorActivo(numero_contenedor)) {
      return res.status(400).json({
        error: "Ya existe un contenedor registrado con ese numero.",
      });
    }

    if (!id_tipo_contenedor || Number.isNaN(Number(id_tipo_contenedor))) {
      return res.status(400).json({ error: "El tipo de contenedor es obligatorio." });
    }

    if (String(naviera || "").trim().length > 50) {
      return res.status(400).json({ error: "La naviera no puede superar 50 caracteres." });
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
        peso_bruto,
        fecha_registro,
        id_usuario_registro,
        estado
      ) VALUES (?, ?, ?, ?, NOW(), ?, 1)`,
      [
        normalizarNumeroContenedor(numero_contenedor),
        Number(id_tipo_contenedor),
        String(naviera || "").trim() || null,
        peso_bruto === "" || peso_bruto === null || peso_bruto === undefined
          ? null
          : Number(peso_bruto),
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
      peso_bruto,
    } = req.body;

    if (!numero_contenedor || !String(numero_contenedor).trim()) {
      return res.status(400).json({ error: "El numero de contenedor es obligatorio." });
    }

    if (await existeNumeroContenedorActivo(numero_contenedor, id_contenedor)) {
      return res.status(400).json({
        error: "Ya existe un contenedor registrado con ese numero.",
      });
    }

    if (!id_tipo_contenedor || Number.isNaN(Number(id_tipo_contenedor))) {
      return res.status(400).json({ error: "El tipo de contenedor es obligatorio." });
    }

    if (String(naviera || "").trim().length > 50) {
      return res.status(400).json({ error: "La naviera no puede superar 50 caracteres." });
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
           peso_bruto = ?
       WHERE id_contenedor = ?`,
      [
        normalizarNumeroContenedor(numero_contenedor),
        Number(id_tipo_contenedor),
        String(naviera || "").trim() || null,
        peso_bruto === "" || peso_bruto === null || peso_bruto === undefined
          ? null
          : Number(peso_bruto),
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

    if (await tieneOperacionAbiertaPorContenedor(db, res, id_contenedor)) return;

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
