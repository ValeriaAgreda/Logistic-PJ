const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

router.post("/login", async (req, res) => {
  try {
    // Acepta email/password o correo/contraseña
    const email = (req.body.email ?? req.body.correo ?? "").trim().toLowerCase();
    const plainPassword = req.body.password ?? req.body.contraseña ?? "";

    if (!email || !plainPassword) {
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    // Busca por la columna 'correo'
    const [rows] = await db.query(
      "SELECT * FROM usuario WHERE LOWER(correo) = ? LIMIT 1",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];

    // La columna correcta es 'password'
    const stored = user.password;
    let valid = false;

    // Soporta hash bcrypt o texto plano (solo durante pruebas)
    if (typeof stored === "string" && stored.startsWith("$2")) {
      valid = await bcrypt.compare(plainPassword, stored);
    } else {
      valid = plainPassword === stored;
    }

    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // (Opcional) valida estado/rol
    // if (user.state !== 1) return res.status(403).json({ error: "Usuario inactivo" });

    // Cookie si la usas
    res.cookie(
      "user",
      { id: user.id, nombre: user.nombre, correo: user.correo },
      { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }
    );

    return res.json({
      message: "Login exitoso",
      user: { id: user.id, nombre: user.nombre, correo: user.correo },
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
