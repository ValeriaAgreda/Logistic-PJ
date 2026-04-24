const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,50}$/;

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

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id_usuario,
        nombre_completo,
        usuario,
        correo,
        id_usuario_registro,
        fecha_registro,
        fecha_inactivo,
        estado
      FROM usuario
      WHERE estado = 1
      ORDER BY id_usuario DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

router.get("/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const [rows] = await db.query(
      `SELECT
        id_usuario,
        nombre_completo,
        usuario,
        correo,
        id_usuario_registro,
        fecha_registro,
        fecha_inactivo,
        estado
      FROM usuario
      WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener usuario:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nombre_completo, usuario, contrasena, correo } = req.body;
    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!nombre_completo || !String(nombre_completo).trim()) {
      return res.status(400).json({ error: "El nombre completo es obligatorio." });
    }

    if (!usuario || !String(usuario).trim()) {
      return res.status(400).json({ error: "El usuario es obligatorio." });
    }

    if (!correo || !String(correo).trim()) {
      return res.status(400).json({ error: "El correo es obligatorio." });
    }

    if (!EMAIL_REGEX.test(String(correo).trim().toLowerCase())) {
      return res.status(400).json({ error: "El correo no es valido." });
    }

    if (!contrasena || !String(contrasena).trim()) {
      return res.status(400).json({ error: "La contrasena es obligatoria." });
    }

    if (!PASSWORD_REGEX.test(String(contrasena))) {
      return res.status(400).json({
        error:
          "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial.",
      });
    }

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que realiza el registro.",
      });
    }

    const correoNormalizado = String(correo).trim().toLowerCase();
    const usuarioNormalizado = String(usuario).trim();

    const [duplicados] = await db.query(
      `SELECT id_usuario
       FROM usuario
       WHERE LOWER(correo) = ? OR usuario = ?`,
      [correoNormalizado, usuarioNormalizado]
    );

    if (duplicados.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe un usuario con ese correo o nombre de usuario." });
    }

    const passwordHash = await bcrypt.hash(String(contrasena), 10);

    const [result] = await db.query(
      `INSERT INTO usuario (
        nombre_completo,
        usuario,
        contrasena,
        correo,
        id_usuario_registro,
        fecha_registro,
        fecha_inactivo,
        estado
      ) VALUES (?, ?, ?, ?, ?, NOW(), NULL, 1)`,
      [
        String(nombre_completo).trim(),
        usuarioNormalizado,
        passwordHash,
        correoNormalizado,
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_usuario: result.insertId,
      mensaje: "Usuario creado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear usuario:", err);
    res.status(500).json({
      error: "Error al crear usuario",
      detalle: err.message,
    });
  }
});

router.put("/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const {
      nombre_completo,
      usuario,
      contrasena,
      correo,
    } = req.body;

    if (!nombre_completo || !String(nombre_completo).trim()) {
      return res.status(400).json({ error: "El nombre completo es obligatorio." });
    }

    if (!usuario || !String(usuario).trim()) {
      return res.status(400).json({ error: "El usuario es obligatorio." });
    }

    if (!correo || !String(correo).trim()) {
      return res.status(400).json({ error: "El correo es obligatorio." });
    }

    if (!EMAIL_REGEX.test(String(correo).trim().toLowerCase())) {
      return res.status(400).json({ error: "El correo no es valido." });
    }

    const correoNormalizado = String(correo).trim().toLowerCase();
    const usuarioNormalizado = String(usuario).trim();

    const [duplicados] = await db.query(
      `SELECT id_usuario
       FROM usuario
       WHERE (LOWER(correo) = ? OR usuario = ?)
         AND id_usuario <> ?`,
      [correoNormalizado, usuarioNormalizado, id_usuario]
    );

    if (duplicados.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe un usuario con ese correo o nombre de usuario." });
    }

    const [actuales] = await db.query(
      `SELECT contrasena
       FROM usuario
       WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (actuales.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const passwordHash =
      contrasena && String(contrasena).trim()
        ? await bcrypt.hash(String(contrasena), 10)
        : actuales[0].contrasena;

    if (contrasena && String(contrasena).trim() && !PASSWORD_REGEX.test(String(contrasena))) {
      return res.status(400).json({
        error:
          "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial.",
      });
    }

    const [result] = await db.query(
      `UPDATE usuario
       SET nombre_completo = ?,
           usuario = ?,
           contrasena = ?,
           correo = ?
       WHERE id_usuario = ?`,
      [
        String(nombre_completo).trim(),
        usuarioNormalizado,
        passwordHash,
        correoNormalizado,
        id_usuario,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({ mensaje: "Usuario actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

router.delete("/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const [result] = await db.query(
      `UPDATE usuario
       SET estado = 0,
           fecha_inactivo = NOW()
       WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({ mensaje: "Usuario desactivado correctamente." });
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

module.exports = router;
