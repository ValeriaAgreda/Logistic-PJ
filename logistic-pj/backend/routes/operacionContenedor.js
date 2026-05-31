const express = require("express");
const cookieParser = require("cookie-parser");

const router = express.Router();
const db = require("../db");

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
      // La cookie puede no venir serializada como JSON.
    }
  }

  return null;
};

const normalizarTexto = (valor) => {
  const texto = String(valor ?? "").trim();
  return texto || null;
};

const sumarDias = (fecha, dias) => {
  const date = new Date(`${fecha}T00:00:00`);
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
};

const validarAsignacion = (body) => {
  const errores = [];
  const fechaLlegadaPuerto = normalizarTexto(body.fecha_llegada_puerto);

  if (!body.id_contenedor || Number.isNaN(Number(body.id_contenedor))) {
    errores.push("Selecciona un contenedor valido.");
  }

  if (!body.id_operacion || Number.isNaN(Number(body.id_operacion))) {
    errores.push("Selecciona una operacion valida.");
  }

  if (!fechaLlegadaPuerto) {
    errores.push("La fecha de llegada al puerto es obligatoria.");
  }

  if (body.fecha_devolucion && fechaLlegadaPuerto && body.fecha_devolucion < fechaLlegadaPuerto) {
    errores.push("La fecha de devolucion no puede ser menor a la fecha de llegada al puerto.");
  }

  return errores;
};

const validarRelacionActiva = async (tabla, idCampo, valor) => {
  const [rows] = await db.query(
    `SELECT ${idCampo}
     FROM ${tabla}
     WHERE ${idCampo} = ? AND estado = 1`,
    [Number(valor)]
  );

  return rows.length > 0;
};

const validarOperacionPermiteContenedor = async (idOperacion) => {
  const [rows] = await db.query(
    `SELECT ts.descripcion AS tipo_servicio
     FROM operacion o
     INNER JOIN tipo_servicio ts ON ts.id_tipo_servicio = o.id_tipo_servicio
     WHERE o.id_operacion = ?
       AND o.estado = 1
     LIMIT 1`,
    [Number(idOperacion)]
  );

  const tipoServicio = String(rows[0]?.tipo_servicio || "").trim().toLowerCase();
  return tipoServicio === "maritimo" || tipoServicio === "terrestre";
};

const validarContenedorDisponible = async (idContenedor, idAsignacionExcluir = null) => {
  const params = [Number(idContenedor)];
  let filtroExcluir = "";

  if (idAsignacionExcluir) {
    filtroExcluir = "AND oc.id_asignacion <> ?";
    params.push(Number(idAsignacionExcluir));
  }

  const [rows] = await db.query(
    `SELECT oc.id_asignacion
     FROM operacion_contenedor oc
     INNER JOIN operacion o ON o.id_operacion = oc.id_operacion
     INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
     WHERE oc.id_contenedor = ?
       AND oc.estado = 1
       AND o.estado = 1
       AND LOWER(eo.descripcion) <> 'cerrado'
       ${filtroExcluir}
     LIMIT 1`,
    params
  );

  return rows.length === 0;
};

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        oc.id_asignacion,
        oc.id_contenedor,
        c.numero_contenedor,
        tc.descripcion AS tipo_contenedor,
        c.peso_bruto,
        oc.id_operacion,
        o.codigo_operacion,
        o.id_estado_operacion,
        eo.descripcion AS estado_operacion,
        DATE_FORMAT(oc.fecha_llegada_puerto, '%Y-%m-%d') AS fecha_llegada_puerto,
        DATE_FORMAT(oc.fecha_devolucion_limite, '%Y-%m-%d') AS fecha_devolucion_limite,
        DATE_FORMAT(oc.fecha_devolucion, '%Y-%m-%d') AS fecha_devolucion,
        oc.fecha_registro,
        oc.id_usuario_registro,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario_registro
      FROM operacion_contenedor oc
      INNER JOIN contenedor c ON c.id_contenedor = oc.id_contenedor
      LEFT JOIN tipo_contenedor tc ON tc.id_tipo_contenedor = c.id_tipo_contenedor
      INNER JOIN operacion o ON o.id_operacion = oc.id_operacion
      INNER JOIN estado_operacion eo ON eo.id_estado_operacion = o.id_estado_operacion
      LEFT JOIN usuario u ON u.id_usuario = oc.id_usuario_registro
      WHERE oc.estado = 1
      ORDER BY oc.id_asignacion DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener asignaciones de contenedores:", error);
    res.status(500).json({ error: "Error al obtener asignaciones de contenedores" });
  }
});

router.post("/", async (req, res) => {
  try {
    const errores = validarAsignacion(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que registra la asignacion.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("contenedor", "id_contenedor", req.body.id_contenedor),
      validarRelacionActiva("operacion", "id_operacion", req.body.id_operacion),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "El contenedor o la operacion no existen o estan inactivos.",
      });
    }

    if (!(await validarOperacionPermiteContenedor(req.body.id_operacion))) {
      return res.status(400).json({
        error: "Solo se puede asignar contenedor a operaciones con servicio Maritimo o Terrestre.",
      });
    }

    if (!(await validarContenedorDisponible(req.body.id_contenedor))) {
      return res.status(400).json({
        error: "Ese contenedor ya esta asignado a una operacion que no esta cerrada.",
      });
    }

    const fechaLlegadaPuerto = normalizarTexto(req.body.fecha_llegada_puerto);
    const fechaDevolucionLimite = sumarDias(fechaLlegadaPuerto, 21);

    const [result] = await db.query(
      `INSERT INTO operacion_contenedor (
        id_contenedor,
        id_operacion,
        fecha_llegada_puerto,
        fecha_devolucion_limite,
        fecha_devolucion,
        fecha_registro,
        id_usuario_registro,
        estado
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)`,
      [
        Number(req.body.id_contenedor),
        Number(req.body.id_operacion),
        fechaLlegadaPuerto,
        fechaDevolucionLimite,
        normalizarTexto(req.body.fecha_devolucion),
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_asignacion: result.insertId,
      mensaje: "Asignacion registrada correctamente.",
    });
  } catch (error) {
    console.error("Error al crear asignacion de contenedor:", error);
    res.status(500).json({
      error: "Error al crear asignacion de contenedor",
      detalle: error.message,
    });
  }
});

router.put("/:id_asignacion", async (req, res) => {
  try {
    const { id_asignacion } = req.params;
    const errores = validarAsignacion(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("contenedor", "id_contenedor", req.body.id_contenedor),
      validarRelacionActiva("operacion", "id_operacion", req.body.id_operacion),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "El contenedor o la operacion no existen o estan inactivos.",
      });
    }

    if (!(await validarOperacionPermiteContenedor(req.body.id_operacion))) {
      return res.status(400).json({
        error: "Solo se puede asignar contenedor a operaciones con servicio Maritimo o Terrestre.",
      });
    }

    if (!(await validarContenedorDisponible(req.body.id_contenedor, id_asignacion))) {
      return res.status(400).json({
        error: "Ese contenedor ya esta asignado a una operacion que no esta cerrada.",
      });
    }

    const fechaLlegadaPuerto = normalizarTexto(req.body.fecha_llegada_puerto);
    const fechaDevolucionLimite = sumarDias(fechaLlegadaPuerto, 21);

    const [result] = await db.query(
      `UPDATE operacion_contenedor
       SET id_contenedor = ?,
           id_operacion = ?,
           fecha_llegada_puerto = ?,
           fecha_devolucion_limite = ?,
           fecha_devolucion = ?
       WHERE id_asignacion = ?
         AND estado = 1`,
      [
        Number(req.body.id_contenedor),
        Number(req.body.id_operacion),
        fechaLlegadaPuerto,
        fechaDevolucionLimite,
        normalizarTexto(req.body.fecha_devolucion),
        Number(id_asignacion),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada." });
    }

    res.json({ mensaje: "Asignacion actualizada correctamente." });
  } catch (error) {
    console.error("Error al actualizar asignacion de contenedor:", error);
    res.status(500).json({
      error: "Error al actualizar asignacion de contenedor",
      detalle: error.message,
    });
  }
});

router.delete("/:id_asignacion", async (req, res) => {
  try {
    const { id_asignacion } = req.params;

    const [result] = await db.query(
      `UPDATE operacion_contenedor
       SET estado = 0
       WHERE id_asignacion = ?
         AND estado = 1`,
      [Number(id_asignacion)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada." });
    }

    res.json({ mensaje: "Asignacion eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar asignacion de contenedor:", error);
    res.status(500).json({
      error: "Error al eliminar asignacion de contenedor",
      detalle: error.message,
    });
  }
});

module.exports = router;
