const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '.30032003.', // tu contraseña si tienes una
  database: 'db_pj'
});

module.exports = pool.promise(); // ✅ Esto es clave para usar async/await
