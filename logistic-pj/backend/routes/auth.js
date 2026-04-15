const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

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

    res.cookie("user", {
      id_usuario: user.id_usuario,
      nombre_completo: user.nombre_completo,
      usuario: user.usuario,
      correo: user.correo,
      estado: user.estado,
    }, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    });

    return res.json({
      message: "Login exitoso",
      user: {
        id_usuario: user.id_usuario,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        correo: user.correo,
        estado: user.estado,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
