const express = require('express');
const cors = require('cors');
const app = express();
const clientesRoutes = require('./routes/clientes');
const proveedoresRoutes = require('./routes/proveedores');
const authRoutes = require("./routes/auth");
const cookieParser = require("cookie-parser");
const contenedoresRoutes = require('./routes/contenedores');
const operacionesRoutes = require('./routes/operaciones'); 


app.use(cors({
  origin: 'http://localhost:5173', // 👈 especifica el origen
  credentials: true               // 👈 permite enviar cookies
}));

app.use(express.json());

app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes); // 👈 asegúrate de tener esta línea
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use('/api/contenedores', contenedoresRoutes);
app.use('/api/operaciones', operacionesRoutes); 


app.listen(3001, () => {
  console.log('Servidor corriendo en http://localhost:3001');
});



