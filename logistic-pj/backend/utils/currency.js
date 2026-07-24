const normalizarMoneda = (valor = "") =>
  String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const esDolar = (moneda = {}) => {
  const codigo = normalizarMoneda(moneda.codigo || moneda.codigo_moneda);
  const descripcion = normalizarMoneda(moneda.descripcion || moneda.moneda);
  return ["USD", "$US", "SUS", "DOL"].includes(codigo) || descripcion.includes("DOLAR");
};

const validarYNormalizarTipoCambio = (valor, moneda) => {
  if (!esDolar(moneda)) return { valor: null, error: null };

  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === "" ||
    Number.isNaN(Number(valor)) ||
    !Number.isFinite(Number(valor)) ||
    Number(valor) <= 0
  ) {
    return {
      valor: null,
      error: "El tipo de cambio es obligatorio para dolares y debe ser un numero mayor a cero.",
    };
  }

  return { valor: Number(valor), error: null };
};

const convertirABolivianos = (monto, tipoCambio, moneda) =>
  Number(monto || 0) * (esDolar(moneda) ? Number(tipoCambio || 0) : 1);

module.exports = {
  convertirABolivianos,
  esDolar,
  validarYNormalizarTipoCambio,
};
