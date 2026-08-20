const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mapini_db',
  password: 'Shen1990$',
  port: 5432,
});

// Ruta para obtener todos los comercios formateados
app.get('/api/comercios', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        nombre, 
        direccion, 
        whatsapp, 
        medios_pago, 
        promo_del_dia, 
        esta_abierto, 
        estado_suscripcion,
        ST_X(ubicacion::geometry)::text AS longitud,
        ST_Y(ubicacion::geometry)::text AS latitud
      FROM comercios;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en DB:", err);
    res.status(500).json({ error: "Error al consultar la base de datos." });
  }
});

app.listen(3000, () => {
  console.log('🚀 Servidor ejecutándose en el puerto 3000');
});