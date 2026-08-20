const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos de Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Endpoint 1: Obtener todos los comercios registrados
app.get('/api/locales', async (req, res) => {
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
                ST_Y(ubicacion::geometry) as latitud,
                ST_X(ubicacion::geometry) as longitud
            FROM comercios;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo locales' });
    }
});

// Endpoint 2: Registrar un nuevo comercio con coordenadas
app.post('/api/locales', async (req, res) => {
    const { nombre, direccion, whatsapp, medios_pago, promo_del_dia, esta_abierto, latitud, longitud } = req.body;

    try {
        const query = `
            INSERT INTO comercios (nombre, direccion, whatsapp, medios_pago, promo_del_dia, esta_abierto, ubicacion)
            VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326))
            RETURNING id;
        `;
        const values = [nombre, direccion, whatsapp, medios_pago, promo_del_dia, esta_abierto, longitud, latitud];
        const { rows } = await pool.query(query, values);

        res.json({ success: true, id: rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando comercio' });
    }
});

// Endpoint 3: Registrar reporte de inconsistencia (auditoría de local cerrado)
app.post('/api/reportes', async (req, res) => {
    const { comercio_id, user_lat, user_lng } = req.body;

    try {
        let query;
        let values;

        if (user_lat && user_lng) {
            query = `
                INSERT INTO reportes_inconsistencia (comercio_id, ubicacion_usuario)
                VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326));
            `;
            values = [comercio_id, user_lng, user_lat];
        } else {
            query = `
                INSERT INTO reportes_inconsistencia (comercio_id)
                VALUES ($1);
            `;
            values = [comercio_id];
        }

        await pool.query(query, values);
        res.json({ success: true, message: 'Reporte registrado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando reporte' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Mapini corriendo en puerto ${PORT}`);
});