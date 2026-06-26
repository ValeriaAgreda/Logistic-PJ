const express = require("express");
const router = express.Router();
const db = require("../db");

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
        ru.id_rol_usuario,
        ru.id_usuario,
        u.nombres,
        u.apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
        u.usuario,
        ru.id_rol,
        r.descripcion AS rol_descripcion,
        ru.fecha_asignacion,
        ru.id_usuario_asignacion,
        CONCAT(ua.nombres, ' ', ua.apellidos) AS asignado_por,
        ru.fecha_fin,
        ru.estado
      FROM rol_usuario ru
      INNER JOIN usuario u ON u.id_usuario = ru.id_usuario
      INNER JOIN rol r ON r.id_rol = ru.id_rol
      LEFT JOIN usuario ua ON ua.id_usuario = ru.id_usuario_asignacion
      WHERE ru.estado = 1
        AND u.estado = 1
      ORDER BY ru.id_rol_usuario DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener asignaciones de rol:", err);
    res.status(500).json({ error: "Error al obtener asignaciones de rol" });
  }
});

router.get("/:id_rol_usuario", async (req, res) => {
  try {
    const { id_rol_usuario } = req.params;

    const [rows] = await db.query(
      `SELECT
        ru.id_rol_usuario,
        ru.id_usuario,
        u.nombres,
        u.apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
        u.usuario,
        ru.id_rol,
        r.descripcion AS rol_descripcion,
        ru.fecha_asignacion,
        ru.id_usuario_asignacion,
        CONCAT(ua.nombres, ' ', ua.apellidos) AS asignado_por,
        ru.fecha_fin,
        ru.estado
      FROM rol_usuario ru
      INNER JOIN usuario u ON u.id_usuario = ru.id_usuario
      INNER JOIN rol r ON r.id_rol = ru.id_rol
      LEFT JOIN usuario ua ON ua.id_usuario = ru.id_usuario_asignacion
      WHERE ru.id_rol_usuario = ?`,
      [id_rol_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al obtener asignacion de rol:", err);
    res.status(500).json({ error: "Error al obtener asignacion de rol" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id_usuario, id_rol } = req.body;
    const idUsuarioAsignacion = obtenerIdUsuarioAutenticado(req);

    if (!id_usuario || Number.isNaN(Number(id_usuario))) {
      return res.status(400).json({ error: "El usuario es obligatorio." });
    }

    if (!id_rol || Number.isNaN(Number(id_rol))) {
      return res.status(400).json({ error: "El rol es obligatorio." });
    }

    if (!idUsuarioAsignacion) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que realiza la asignacion.",
      });
    }

    const idUsuario = Number(id_usuario);
    const idRol = Number(id_rol);

    const [usuarios] = await db.query(
      `SELECT id_usuario
       FROM usuario
       WHERE id_usuario = ? AND estado = 1`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({ error: "El usuario seleccionado no es valido." });
    }

    const [roles] = await db.query(
      `SELECT id_rol
       FROM rol
       WHERE id_rol = ? AND estado = 1`,
      [idRol]
    );

    if (roles.length === 0) {
      return res.status(400).json({ error: "El rol seleccionado no es valido." });
    }

    const [duplicados] = await db.query(
      `SELECT id_rol_usuario
       FROM rol_usuario
       WHERE id_usuario = ?
         AND id_rol = ?
         AND estado = 1`,
      [idUsuario, idRol]
    );

    if (duplicados.length > 0) {
      return res.status(400).json({
        error: "Ese usuario ya tiene ese rol asignado.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO rol_usuario (
        id_usuario,
        id_rol,
        fecha_asignacion,
        id_usuario_asignacion,
        fecha_fin,
        estado
      ) VALUES (?, ?, NOW(), ?, NULL, 1)`,
      [idUsuario, idRol, Number(idUsuarioAsignacion)]
    );

    res.status(201).json({
      id_rol_usuario: result.insertId,
      mensaje: "Rol asignado correctamente.",
    });
  } catch (err) {
    console.error("Error al crear asignacion de rol:", err);
    res.status(500).json({ error: "Error al crear asignacion de rol" });
  }
});

router.put("/:id_rol_usuario", async (req, res) => {
  try {
    const { id_rol_usuario } = req.params;
    const { id_usuario, id_rol } = req.body;

    if (!id_usuario || Number.isNaN(Number(id_usuario))) {
      return res.status(400).json({ error: "El usuario es obligatorio." });
    }

    if (!id_rol || Number.isNaN(Number(id_rol))) {
      return res.status(400).json({ error: "El rol es obligatorio." });
    }

    const idUsuario = Number(id_usuario);
    const idRol = Number(id_rol);

    const [actuales] = await db.query(
      `SELECT id_rol_usuario
       FROM rol_usuario
       WHERE id_rol_usuario = ?`,
      [id_rol_usuario]
    );

    if (actuales.length === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada." });
    }

    const [usuarios] = await db.query(
      `SELECT id_usuario
       FROM usuario
       WHERE id_usuario = ? AND estado = 1`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({ error: "El usuario seleccionado no es valido." });
    }

    const [roles] = await db.query(
      `SELECT id_rol
       FROM rol
       WHERE id_rol = ? AND estado = 1`,
      [idRol]
    );

    if (roles.length === 0) {
      return res.status(400).json({ error: "El rol seleccionado no es valido." });
    }

    const [duplicados] = await db.query(
      `SELECT id_rol_usuario
       FROM rol_usuario
       WHERE id_usuario = ?
         AND id_rol = ?
         AND estado = 1
         AND id_rol_usuario <> ?`,
      [idUsuario, idRol, id_rol_usuario]
    );

    if (duplicados.length > 0) {
      return res.status(400).json({
        error: "Ese usuario ya tiene ese rol asignado.",
      });
    }

    const [result] = await db.query(
      `UPDATE rol_usuario
       SET id_usuario = ?,
           id_rol = ?
       WHERE id_rol_usuario = ?`,
      [idUsuario, idRol, id_rol_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada." });
    }

    res.json({ mensaje: "Asignacion actualizada correctamente." });
  } catch (err) {
    console.error("Error al actualizar asignacion de rol:", err);
    res.status(500).json({ error: "Error al actualizar asignacion de rol" });
  }
});

router.delete("/:id_rol_usuario", async (req, res) => {
  try {
    const { id_rol_usuario } = req.params;

    const [result] = await db.query(
      `UPDATE rol_usuario
       SET estado = 0,
           fecha_fin = CURDATE()
       WHERE id_rol_usuario = ?`,
      [id_rol_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada." });
    }

    res.json({ mensaje: "Asignacion desactivada correctamente." });
  } catch (err) {
    console.error("Error al eliminar asignacion de rol:", err);
    res.status(500).json({ error: "Error al eliminar asignacion de rol" });
  }
});

module.exports = router;
