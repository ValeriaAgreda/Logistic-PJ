const express = require('express');
const cors = require('cors');
const path = require("path");
const app = express();
const clientesRoutes = require('./routes/clientes');
const proveedoresRoutes = require('./routes/proveedores');
const proveedorCuentaRoutes = require("./routes/proveedorCuenta");
const proveedorRutaRoutes = require("./routes/proveedorRuta");
const authRoutes = require("./routes/auth");
const cookieParser = require("cookie-parser");
const contenedoresRoutes = require('./routes/contenedores');
const operacionesRoutes = require('./routes/operaciones'); 
const operacionContenedorRoutes = require("./routes/operacionContenedor");
const tipoServicioRoutes = require("./routes/tipoServicio");
const tipoContenedorRoutes = require("./routes/tipoContenedor");
const tipoCostoRoutes = require("./routes/tipoCosto");
const costoOperacionRoutes = require("./routes/costoOperacion");
const ventaOperacionRoutes = require("./routes/ventaOperacion");
const estadoOperacionRoutes = require("./routes/estadoOperacion");
const monedaRoutes = require("./routes/moneda");
const rutaRoutes = require("./routes/ruta");
const tipoDocumentoRoutes = require("./routes/tipoDocumento");
const documentoRoutes = require("./routes/documento");
const tipoNacionalizacionRoutes = require("./routes/tipoNacionalizacion");
const rolRoutes = require("./routes/rol");
const rolUsuarioRoutes = require("./routes/rolUsuario");
const usuariosRoutes = require("./routes/usuarios");
const recomendacionSeguroRoutes = require("./routes/recomendacionSeguro");


app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true               
}));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use("/api/proveedor-cuenta", proveedorCuentaRoutes);
app.use("/api/proveedor-ruta", proveedorRutaRoutes);
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use('/api/contenedores', contenedoresRoutes);
app.use('/api/operaciones', operacionesRoutes); 
app.use("/api/operacion-contenedor", operacionContenedorRoutes);
app.use("/api/tipo-servicio", tipoServicioRoutes);
app.use("/api/tipo-contenedor", tipoContenedorRoutes);
app.use("/api/tipo-costo", tipoCostoRoutes);
app.use("/api/costo-operacion", costoOperacionRoutes);
app.use("/api/venta-operacion", ventaOperacionRoutes);
app.use("/api/estado-operacion", estadoOperacionRoutes);
app.use("/api/moneda", monedaRoutes);
app.use("/api/ruta", rutaRoutes);
app.use("/api/tipo-documento", tipoDocumentoRoutes);
app.use("/api/documento", documentoRoutes);
app.use("/api/tipo-nacionalizacion", tipoNacionalizacionRoutes);
app.use("/api/rol", rolRoutes);
app.use("/api/rol-usuario", rolUsuarioRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/recomendacion-seguro", recomendacionSeguroRoutes);


app.listen(3001, () => {
  console.log('Servidor corriendo en http://localhost:3001');
});



