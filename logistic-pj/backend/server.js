const express = require('express');
const cors = require('cors');
const app = express();
const clientesRoutes = require('./routes/clientes');
const proveedoresRoutes = require('./routes/proveedores');
const authRoutes = require("./routes/auth");
const cookieParser = require("cookie-parser");
const contenedoresRoutes = require('./routes/contenedores');
const operacionesRoutes = require('./routes/operaciones'); 
const tipoServicioRoutes = require("./routes/tipoServicio");
const tipoContenedorRoutes = require("./routes/tipoContenedor");
const tipoCostoRoutes = require("./routes/tipoCosto");
const tipoDocumentoRoutes = require("./routes/tipoDocumento");
const tipoNacionalizacionRoutes = require("./routes/tipoNacionalizacion");


app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true               
}));

app.use(express.json());

app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes); 
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use('/api/contenedores', contenedoresRoutes);
app.use('/api/operaciones', operacionesRoutes); 
app.use("/api/tipo-servicio", tipoServicioRoutes);
app.use("/api/tipo-contenedor", tipoContenedorRoutes);
app.use("/api/tipo-costo", tipoCostoRoutes);
app.use("/api/tipo-documento", tipoDocumentoRoutes);
app.use("/api/tipo-nacionalizacion", tipoNacionalizacionRoutes);


app.listen(3001, () => {
  console.log('Servidor corriendo en http://localhost:3001');
});



