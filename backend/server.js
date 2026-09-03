const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(__dirname, 'database.json');

function getDefaultDB() {
    return {
        usuarios: {
            admin: { pass: 'admin123', rol: 'admin', nombre: 'Ricardo Madera' },
            proyectos: { pass: 'proy123', rol: 'proyectos', nombre: 'Proyectos Generales' }
        },
        solicitudes: [],
        inventario: [],
        asignaciones: [],
        programacion: [],
        contadorId: 1,
        numeroWhatsApp: '',
        nombreResponsableMantenimiento: 'Ricardo Madera',
        logoDataURL: ''
    };
}

function leerDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const inicial = getDefaultDB();
            fs.writeFileSync(DB_PATH, JSON.stringify(inicial, null, 2));
            return inicial;
        }
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (error) {
        console.error('❌ Error al leer DB:', error);
        return getDefaultDB();
    }
}

function guardarDB(datos) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(datos, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error al guardar DB:', error);
        return false;
    }
}

// ========== RUTAS ==========
app.get('/', (req, res) => {
    res.json({ mensaje: '✅ API Gestión de Mantenimiento', version: '1.0' });
});

app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    const db = leerDB();
    
    if (!db.usuarios[usuario]) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    if (db.usuarios[usuario].pass !== password) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    const userData = { ...db.usuarios[usuario] };
    delete userData.pass;
    res.json({ success: true, usuario, ...userData });
});

app.get('/api/usuarios', (req, res) => {
    const db = leerDB();
    const usuarios = {};
    for (const [key, value] of Object.entries(db.usuarios)) {
        usuarios[key] = { ...value };
        delete usuarios[key].pass;
    }
    res.json(usuarios);
});

app.post('/api/usuarios', (req, res) => {
    const { usuario, password, nombre, rol } = req.body;
    const db = leerDB();
    
    if (db.usuarios[usuario]) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    db.usuarios[usuario] = { pass: password, rol, nombre };
    if (guardarDB(db)) {
        res.json({ success: true, usuario });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.put('/api/usuarios/:usuario', (req, res) => {
    const { usuario } = req.params;
    const { password, nombre, rol } = req.body;
    const db = leerDB();
    
    if (!db.usuarios[usuario]) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    db.usuarios[usuario] = { 
        pass: password || db.usuarios[usuario].pass, 
        rol, 
        nombre 
    };
    
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.delete('/api/usuarios/:usuario', (req, res) => {
    const { usuario } = req.params;
    const db = leerDB();
    
    if (usuario === 'admin') {
        return res.status(400).json({ error: 'No se puede eliminar el administrador' });
    }
    
    if (!db.usuarios[usuario]) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    delete db.usuarios[usuario];
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.get('/api/solicitudes', (req, res) => {
    const db = leerDB();
    res.json(db.solicitudes);
});

app.post('/api/solicitudes', (req, res) => {
    const db = leerDB();
    const nuevaSolicitud = {
        ...req.body,
        id: db.contadorId++,
        fechaCreacion: new Date().toISOString(),
        observaciones: req.body.observaciones || []
    };
    db.solicitudes.push(nuevaSolicitud);
    if (guardarDB(db)) {
        res.json({ success: true, solicitud: nuevaSolicitud });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.put('/api/solicitudes/:id', (req, res) => {
    const { id } = req.params;
    const db = leerDB();
    const index = db.solicitudes.findIndex(s => s.id === parseInt(id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    
    db.solicitudes[index] = { 
        ...db.solicitudes[index], 
        ...req.body,
        fechaActualizacion: new Date().toISOString()
    };
    
    if (guardarDB(db)) {
        res.json({ success: true, solicitud: db.solicitudes[index] });
    } else {
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

app.delete('/api/solicitudes/:id', (req, res) => {
    const { id } = req.params;
    const db = leerDB();
    const index = db.solicitudes.findIndex(s => s.id === parseInt(id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    
    db.solicitudes.splice(index, 1);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.post('/api/solicitudes/:id/observaciones', (req, res) => {
    const { id } = req.params;
    const { autor, rol, texto } = req.body;
    const db = leerDB();
    const index = db.solicitudes.findIndex(s => s.id === parseInt(id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    
    if (!db.solicitudes[index].observaciones) {
        db.solicitudes[index].observaciones = [];
    }
    
    db.solicitudes[index].observaciones.push({
        autor,
        rol,
        fecha: new Date().toLocaleString('es-MX'),
        texto
    });
    
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.get('/api/configuracion', (req, res) => {
    const db = leerDB();
    res.json({
        numeroWhatsApp: db.numeroWhatsApp || '',
        nombreResponsableMantenimiento: db.nombreResponsableMantenimiento || 'Ricardo Madera',
        logoDataURL: db.logoDataURL || ''
    });
});

app.put('/api/configuracion', (req, res) => {
    const db = leerDB();
    db.numeroWhatsApp = req.body.numeroWhatsApp || db.numeroWhatsApp;
    db.nombreResponsableMantenimiento = req.body.nombreResponsableMantenimiento || db.nombreResponsableMantenimiento;
    db.logoDataURL = req.body.logoDataURL || db.logoDataURL;
    
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.get('/api/logo', (req, res) => {
    const db = leerDB();
    res.json({ logoDataURL: db.logoDataURL || '' });
});

app.post('/api/logo', (req, res) => {
    const db = leerDB();
    db.logoDataURL = req.body.logoDataURL || '';
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.get('/api/inventario', (req, res) => {
    const db = leerDB();
    res.json(db.inventario || []);
});

app.post('/api/inventario', (req, res) => {
    const db = leerDB();
    if (!db.inventario) db.inventario = [];
    db.inventario.push(req.body);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.delete('/api/inventario/:index', (req, res) => {
    const { index } = req.params;
    const db = leerDB();
    if (!db.inventario || !db.inventario[parseInt(index)]) {
        return res.status(404).json({ error: 'Ítem no encontrado' });
    }
    db.inventario.splice(parseInt(index), 1);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.get('/api/asignaciones', (req, res) => {
    const db = leerDB();
    res.json(db.asignaciones || []);
});

app.post('/api/asignaciones', (req, res) => {
    const db = leerDB();
    if (!db.asignaciones) db.asignaciones = [];
    db.asignaciones.push(req.body);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.delete('/api/asignaciones/:index', (req, res) => {
    const { index } = req.params;
    const db = leerDB();
    if (!db.asignaciones || !db.asignaciones[parseInt(index)]) {
        return res.status(404).json({ error: 'Asignación no encontrada' });
    }
    db.asignaciones.splice(parseInt(index), 1);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.get('/api/programacion', (req, res) => {
    const db = leerDB();
    res.json(db.programacion || []);
});

app.post('/api/programacion', (req, res) => {
    const db = leerDB();
    if (!db.programacion) db.programacion = [];
    db.programacion.push(req.body);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.delete('/api/programacion/:index', (req, res) => {
    const { index } = req.params;
    const db = leerDB();
    if (!db.programacion || !db.programacion[parseInt(index)]) {
        return res.status(404).json({ error: 'Programación no encontrada' });
    }
    db.programacion.splice(parseInt(index), 1);
    if (guardarDB(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.get('/api/respaldo', (req, res) => {
    const db = leerDB();
    res.json(db);
});

app.post('/api/restaurar', (req, res) => {
    const datos = req.body;
    if (!datos.usuarios || !datos.solicitudes) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }
    if (guardarDB(datos)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Error al restaurar' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Base de datos: ${DB_PATH}`);
});