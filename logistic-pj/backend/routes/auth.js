const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,50}$/;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
let resetTableReadyPromise = null;

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

const createMailer = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const ensureResetTokenTable = async () => {
  if (!resetTableReadyPromise) {
    resetTableReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_token (
        id_password_reset_token INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_password_reset_token_hash (token_hash),
        KEY idx_password_reset_token_user (id_usuario),
        CONSTRAINT fk_password_reset_token_usuario
          FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
      )
    `);
  }

  await resetTableReadyPromise;
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildResetLink = (token) =>
  `${FRONTEND_URL}/restablecer-contrasena?token=${encodeURIComponent(token)}`;

const upsertResetToken = async (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);

  await ensureResetTokenTable();

  await db.query(
    `DELETE FROM password_reset_token
     WHERE id_usuario = ?
        OR used_at IS NOT NULL
        OR expires_at < NOW()`,
    [user.id_usuario]
  );

  await db.query(
    `INSERT INTO password_reset_token (id_usuario, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [user.id_usuario, tokenHash, Math.floor(RESET_TOKEN_TTL_MS / 1000)]
  );

  return {
    token,
    resetLink: buildResetLink(token),
  };
};

const getValidResetPayload = async (token) => {
  await ensureResetTokenTable();

  const tokenHash = hashResetToken(token);
  const [rows] = await db.query(
    `SELECT
       prt.id_password_reset_token,
       prt.id_usuario,
       u.correo,
       u.nombre_completo,
       u.estado
     FROM password_reset_token prt
     INNER JOIN usuario u ON u.id_usuario = prt.id_usuario
     WHERE prt.token_hash = ?
       AND prt.used_at IS NULL
       AND prt.expires_at >= NOW()
     LIMIT 1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return null;
  }

  const payload = rows[0];

  if (payload.estado !== 1) {
    await db.query(
      `UPDATE password_reset_token
       SET used_at = NOW()
       WHERE id_password_reset_token = ?`,
      [payload.id_password_reset_token]
    );

    return null;
  }

  return payload;
};

const sendResetPasswordEmail = async ({ correo, nombre, resetLink }) => {
  const mailer = createMailer();

  if (!mailer) {
    return {
      delivered: false,
      reason: "SMTP no configurado",
    };
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: correo,
    subject: "Recuperacion de contrasena",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">Recuperacion de contrasena</h2>
        <p>Hola ${nombre || "usuario"}, recibimos una solicitud para restablecer tu contrasena.</p>
        <p>
          Haz clic en el siguiente enlace para continuar:
        </p>
        <p>
          <a
            href="${resetLink}"
            style="display: inline-block; padding: 10px 16px; background: #009fa3; color: white; text-decoration: none; border-radius: 8px;"
          >
            Restablecer contrasena
          </a>
        </p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        <p>El enlace expira en 30 minutos.</p>
      </div>
    `,
  });

  return { delivered: true };
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

router.post("/forgot-password", async (req, res) => {
  try {
    await ensureResetTokenTable();

    const correo = String(req.body.correo || "").trim().toLowerCase();

    if (!correo) {
      return res.status(400).json({ error: "El correo es obligatorio." });
    }

    const [rows] = await db.query(
      `SELECT id_usuario, nombre_completo, correo, estado
       FROM usuario
       WHERE LOWER(correo) = ?
       LIMIT 1`,
      [correo]
    );

    if (rows.length === 0 || rows[0].estado !== 1) {
      return res.json({
        message:
          "Si el correo esta registrado, recibirás instrucciones para recuperar tu contrasena.",
      });
    }

    const user = rows[0];
    const { resetLink } = await upsertResetToken(user);
    const emailResult = await sendResetPasswordEmail({
      correo: user.correo,
      nombre: user.nombre_completo,
      resetLink,
    });

    if (!emailResult.delivered) {
      console.log(`Recuperacion de contrasena para ${user.correo}: ${resetLink}`);
    }

    return res.json({
      message:
        "Si el correo esta registrado, recibirás instrucciones para recuperar tu contrasena.",
      ...(emailResult.delivered
        ? {}
        : {
            dev_reset_link: resetLink,
            dev_message:
              "SMTP no esta configurado. Se devuelve el enlace solo para desarrollo.",
          }),
    });
  } catch (err) {
    console.error("Error al solicitar recuperacion de contrasena:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

router.get("/reset-password/:token", async (req, res) => {
  try {
    const payload = await getValidResetPayload(String(req.params.token || "").trim());

    if (!payload) {
      return res.status(400).json({ error: "El enlace de recuperacion no es valido o expiro." });
    }

    return res.json({
      message: "Token valido.",
      correo: payload.correo,
      nombre_completo: payload.nombre_completo,
    });
  } catch (err) {
    console.error("Error al validar token de recuperacion:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    await ensureResetTokenTable();

    const token = String(req.body.token || "").trim();
    const contrasena = String(req.body.contrasena || "");

    if (!token) {
      return res.status(400).json({ error: "El token es obligatorio." });
    }

    if (!contrasena.trim()) {
      return res.status(400).json({ error: "La contrasena es obligatoria." });
    }

    if (!PASSWORD_REGEX.test(contrasena)) {
      return res.status(400).json({
        error:
          "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial.",
      });
    }

    const payload = await getValidResetPayload(token);

    if (!payload) {
      return res.status(400).json({ error: "El enlace de recuperacion no es valido o expiro." });
    }

    const passwordHash = await bcrypt.hash(contrasena, 10);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `UPDATE usuario
         SET contrasena = ?
         WHERE id_usuario = ?
           AND estado = 1`,
        [passwordHash, payload.id_usuario]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Usuario no encontrado o inactivo." });
      }

      await connection.query(
        `UPDATE password_reset_token
         SET used_at = NOW()
         WHERE id_usuario = ?
           AND used_at IS NULL`,
        [payload.id_usuario]
      );

      await connection.commit();
    } finally {
      connection.release();
    }

    return res.json({ message: "Contrasena actualizada correctamente." });
  } catch (err) {
    console.error("Error al restablecer contrasena:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
