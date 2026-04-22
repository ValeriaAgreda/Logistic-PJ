const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

const normalizeRole = (value) => {
  if (value == null) return null;

  const raw = String(value).trim().toUpperCase();

  if (!raw) return null;

  if (["ADMIN", "ADMINISTRADOR", "1"].includes(raw)) {
    return "ADMIN";
  }

  if (["CONTADOR", "ACCOUNTANT", "2"].includes(raw)) {
    return "CONTADOR";
  }

  return raw;
};

router.post("/login", async (req, res) => {
  try {
    const correo = (req.body.correo ?? "").trim().toLowerCase();
    const contrasena = req.body.contrasena ?? "";

    if (!correo || !contrasena) {
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    const [rows] = await db.query(
      "SELECT * FROM usuario WHERE LOWER(correo) = ? LIMIT 1",
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];

    const storedPassword = user.contrasena;
    let valid = false;

    if (typeof storedPassword === "string" && storedPassword.startsWith("$2")) {
      valid = await bcrypt.compare(contrasena, storedPassword);
    } else {
      valid = contrasena === storedPassword;
    }

    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    if (user.estado !== 1) {
      return res.status(403).json({ error: "Usuario inactivo" });
    }

    const [roleRows] = await db.query(
      `SELECT
        ru.id_rol_usuario,
        ru.id_rol,
        r.descripcion AS rol_descripcion
      FROM rol_usuario ru
      INNER JOIN rol r ON r.id_rol = ru.id_rol
      WHERE ru.id_usuario = ?
        AND ru.estado = 1
        AND r.estado = 1
      ORDER BY ru.id_rol_usuario DESC`,
      [user.id_usuario]
    );

    const roles = roleRows
      .map((role) => ({
        id_rol_usuario: role.id_rol_usuario,
        id_rol: role.id_rol,
        descripcion: role.rol_descripcion,
        codigo: normalizeRole(role.rol_descripcion ?? role.id_rol),
      }))
      .filter((role) => role.codigo);

    const userPayload = {
      id_usuario: user.id_usuario,
      nombre_completo: user.nombre_completo,
      usuario: user.usuario,
      correo: user.correo,
      estado: user.estado,
      roles,
      role_codes: roles.map((role) => role.codigo),
      role_names: roles.map((role) => role.descripcion),
      primary_role: roles[0]?.codigo || null,
    };

    res.cookie("user", userPayload, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    });

    return res.json({
      message: "Login exitoso",
      user: userPayload,
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
