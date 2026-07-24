export const normalizarMoneda = (valor = "") =>
  String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const esDolar = (item = {}) => {
  const codigo = normalizarMoneda(item.codigo || item.codigo_moneda);
  const descripcion = normalizarMoneda(item.descripcion || item.moneda);
  return ["USD", "$US", "SUS", "DOL"].includes(codigo) || descripcion.includes("DOLAR");
};

export const monedaSeleccionadaEsDolar = (idMoneda, monedas = []) =>
  esDolar(monedas.find((item) => String(item.id_moneda) === String(idMoneda)) || {});

export const validarTipoCambio = (movimiento, monedas = []) => {
  if (!monedaSeleccionadaEsDolar(movimiento.id_moneda, monedas)) return null;
  if (
    movimiento.tipo_cambio === undefined ||
    movimiento.tipo_cambio === null ||
    String(movimiento.tipo_cambio).trim() === "" ||
    Number.isNaN(Number(movimiento.tipo_cambio)) ||
    !Number.isFinite(Number(movimiento.tipo_cambio)) ||
    Number(movimiento.tipo_cambio) <= 0
  ) {
    return "El tipo de cambio es obligatorio para dolares y debe ser mayor a cero.";
  }
  return null;
};

export const montoEnBolivianos = (movimiento = {}) =>
  Number(
    movimiento.monto_bolivianos ??
      Number(movimiento.monto || 0) *
        (esDolar(movimiento) ? Number(movimiento.tipo_cambio || 0) : 1)
  );
