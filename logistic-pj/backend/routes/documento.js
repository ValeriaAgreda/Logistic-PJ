const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();
const db = require("../db");
const { tieneOperacionAbiertaPorDocumento } = require("../utils/deleteGuards");

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

const DIRECTORIO_DOCUMENTOS = path.join(__dirname, "..", "uploads", "documentos");
const EXTENSIONES_DOCUMENTO_PERMITIDAS = new Set([
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
]);
const MENSAJE_ARCHIVO_INVALIDO = "Solo se permiten archivos Word, Excel, PDF o imagenes.";

const sanitizarNombreArchivo = (nombre) =>
  String(nombre || "documento")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_");

const obtenerExtensionArchivo = (nombre) => {
  const limpio = String(nombre || "").toLowerCase().split("?")[0].split("#")[0];
  return path.extname(limpio);
};

const esArchivoPermitido = (nombre) =>
  EXTENSIONES_DOCUMENTO_PERMITIDAS.has(obtenerExtensionArchivo(nombre));

const guardarArchivoDocumento = async (archivoNombre, archivoBase64) => {
  if (!archivoNombre || !archivoBase64) {
    return null;
  }

  if (!esArchivoPermitido(archivoNombre)) {
    throw new Error(MENSAJE_ARCHIVO_INVALIDO);
  }

  await fs.mkdir(DIRECTORIO_DOCUMENTOS, { recursive: true });

  const nombreSeguro = `${Date.now()}_${sanitizarNombreArchivo(archivoNombre)}`;
  const rutaCompleta = path.join(DIRECTORIO_DOCUMENTOS, nombreSeguro);
  const base64Limpio = String(archivoBase64).includes(",")
    ? String(archivoBase64).split(",").pop()
    : String(archivoBase64);

  await fs.writeFile(rutaCompleta, Buffer.from(base64Limpio, "base64"));

  return `/uploads/documentos/${nombreSeguro}`;
};

const validarDocumento = (body) => {
  const errores = [];

  if (!body.id_tipo_documento || Number.isNaN(Number(body.id_tipo_documento))) {
    errores.push("Selecciona un tipo de documento valido.");
  }

  if (!body.id_operacion || Number.isNaN(Number(body.id_operacion))) {
    errores.push("Selecciona una operacion valida.");
  }

  if (!normalizarTexto(body.numero_documento)) {
    errores.push("El numero de documento es obligatorio.");
  }

  if (!normalizarTexto(body.fecha_documento)) {
    errores.push("La fecha del documento es obligatoria.");
  }

  if (!normalizarTexto(body.ruta_documento) && !normalizarTexto(body.archivo_base64)) {
    errores.push("La ruta del documento es obligatoria.");
  }

  if (normalizarTexto(body.archivo_base64) && !esArchivoPermitido(body.archivo_nombre)) {
    errores.push(MENSAJE_ARCHIVO_INVALIDO);
  }

  if (!normalizarTexto(body.archivo_base64) && normalizarTexto(body.ruta_documento) && !esArchivoPermitido(body.ruta_documento)) {
    errores.push(MENSAJE_ARCHIVO_INVALIDO);
  }

  if (!normalizarTexto(body.descripcion)) {
    errores.push("La descripcion es obligatoria.");
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

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        d.id_documento,
        d.id_tipo_documento,
        td.descripcion AS tipo_documento,
        d.id_operacion,
        o.codigo_operacion,
        d.numero_documento,
        d.fecha_documento,
        d.ruta_documento,
        d.descripcion,
        d.fecha_registro,
        d.id_usuario_registro,
        CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_registro,
        d.fecha_modificacion,
        d.id_usuario_modificacion,
        CONCAT(um.nombres, ' ', um.apellidos) AS usuario_modificacion
      FROM documento d
      INNER JOIN tipo_documento td ON td.id_tipo_documento = d.id_tipo_documento
      INNER JOIN operacion o ON o.id_operacion = d.id_operacion
      LEFT JOIN usuario ur ON ur.id_usuario = d.id_usuario_registro
      LEFT JOIN usuario um ON um.id_usuario = d.id_usuario_modificacion
      WHERE d.estado = 1
      ORDER BY d.id_documento DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener documentos:", error);
    res.status(500).json({ error: "Error al obtener documentos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const errores = validarDocumento(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioRegistro = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioRegistro) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que registra el documento.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("tipo_documento", "id_tipo_documento", req.body.id_tipo_documento),
      validarRelacionActiva("operacion", "id_operacion", req.body.id_operacion),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "El tipo de documento o la operacion no existen o estan inactivos.",
      });
    }

    const rutaArchivo = await guardarArchivoDocumento(
      req.body.archivo_nombre,
      req.body.archivo_base64
    );

    const [result] = await db.query(
      `INSERT INTO documento (
        id_tipo_documento,
        id_operacion,
        numero_documento,
        fecha_documento,
        ruta_documento,
        descripcion,
        fecha_registro,
        id_usuario_registro,
        fecha_modificacion,
        id_usuario_modificacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, 1)`,
      [
        Number(req.body.id_tipo_documento),
        Number(req.body.id_operacion),
        String(req.body.numero_documento).trim(),
        req.body.fecha_documento,
        rutaArchivo || String(req.body.ruta_documento).trim(),
        String(req.body.descripcion).trim(),
        Number(idUsuarioRegistro),
      ]
    );

    res.status(201).json({
      id_documento: result.insertId,
      mensaje: "Documento registrado correctamente.",
    });
  } catch (error) {
    console.error("Error al crear documento:", error);
    res.status(500).json({
      error: "Error al crear documento",
      detalle: error.message,
    });
  }
});

router.put("/:id_documento", async (req, res) => {
  try {
    const { id_documento } = req.params;
    const errores = validarDocumento(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    if (!idUsuarioModificacion) {
      return res.status(401).json({
        error: "No se pudo identificar al usuario que modifica el documento.",
      });
    }

    const relaciones = await Promise.all([
      validarRelacionActiva("tipo_documento", "id_tipo_documento", req.body.id_tipo_documento),
      validarRelacionActiva("operacion", "id_operacion", req.body.id_operacion),
    ]);

    if (relaciones.includes(false)) {
      return res.status(400).json({
        error: "El tipo de documento o la operacion no existen o estan inactivos.",
      });
    }

    const rutaArchivo = await guardarArchivoDocumento(
      req.body.archivo_nombre,
      req.body.archivo_base64
    );

    const [result] = await db.query(
      `UPDATE documento
       SET id_tipo_documento = ?,
           id_operacion = ?,
           numero_documento = ?,
           fecha_documento = ?,
           ruta_documento = ?,
           descripcion = ?,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_documento = ?
         AND estado = 1`,
      [
        Number(req.body.id_tipo_documento),
        Number(req.body.id_operacion),
        String(req.body.numero_documento).trim(),
        req.body.fecha_documento,
        rutaArchivo || String(req.body.ruta_documento).trim(),
        String(req.body.descripcion).trim(),
        Number(idUsuarioModificacion),
        Number(id_documento),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    res.json({ mensaje: "Documento actualizado correctamente." });
  } catch (error) {
    console.error("Error al actualizar documento:", error);
    res.status(500).json({
      error: "Error al actualizar documento",
      detalle: error.message,
    });
  }
});

router.delete("/:id_documento", async (req, res) => {
  try {
    const { id_documento } = req.params;
    const idUsuarioModificacion = obtenerIdUsuarioAutenticado(req);

    if (await tieneOperacionAbiertaPorDocumento(db, res, id_documento)) return;

    const [result] = await db.query(
      `UPDATE documento
       SET estado = 0,
           fecha_modificacion = NOW(),
           id_usuario_modificacion = ?
       WHERE id_documento = ?
         AND estado = 1`,
      [idUsuarioModificacion, Number(id_documento)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    res.json({ mensaje: "Documento eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    res.status(500).json({
      error: "Error al eliminar documento",
      detalle: error.message,
    });
  }
});

module.exports = router;
