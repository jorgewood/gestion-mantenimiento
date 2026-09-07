const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==================== BASE DE DATOS JSON ====================
// La carpeta data estará en la raíz del proyecto, no dentro de backend
const DATA_DIR = path.join(__dirname, '..', 'data');  // 👈 Sube un nivel
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

function leerJSON(nombre) {
    const ruta = path.join(DATA_DIR, nombre);
    if (!fs.existsSync(ruta)) {
        let datosPorDefecto = {};
        if (nombre === 'solicitudes.json') datosPorDefecto = [];
        if (nombre === 'usuarios.json') {
            datosPorDefecto = {
                admin: { pass: 'admin123', nombre: 'Ricardo Madera', rol: 'admin' },
                proyectos: { pass: 'proyectos123', nombre: 'Proyectos Generales', rol: 'proyectos' }
            };
        }
        if (nombre === 'configuracion.json') {
            datosPorDefecto = {
                numeroWhatsApp: '',
                nombreResponsableMantenimiento: 'Ricardo Madera',
                logoDataURL: ''
            };
        }
        fs.writeFileSync(ruta, JSON.stringify(datosPorDefecto, null, 2));
        return datosPorDefecto;
    }
    try {
        return JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch (e) {
        console.error(`Error leyendo ${nombre}:`, e);
        return [];
    }
}

function guardarJSON(nombre, datos) {
    fs.writeFileSync(path.join(DATA_DIR, nombre), JSON.stringify(datos, null, 2));
}

// ==================== API RUTAS ====================

// --- USUARIOS ---
app.get('/api/usuarios', (req, res) => {
    try {
        res.json(leerJSON('usuarios.json'));
    } catch (e) {
        res.status(500).json({ error: 'Error al leer usuarios' });
    }
});

app.post('/api/usuarios', (req, res) => {
    try {
        const { usuario, password, nombre, rol } = req.body;
        const usuarios = leerJSON('usuarios.json');
        if (usuarios[usuario]) return res.status(400).json({ error: 'El usuario ya existe' });
        usuarios[usuario] = { pass: password, nombre, rol };
        guardarJSON('usuarios.json', usuarios);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar usuario' });
    }
});

app.put('/api/usuarios/:usuario', (req, res) => {
    try {
        const { usuario } = req.params;
        const { password, nombre, rol } = req.body;
        const usuarios = leerJSON('usuarios.json');
        if (!usuarios[usuario]) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (password) usuarios[usuario].pass = password;
        if (nombre) usuarios[usuario].nombre = nombre;
        if (rol) usuarios[usuario].rol = rol;
        guardarJSON('usuarios.json', usuarios);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

app.delete('/api/usuarios/:usuario', (req, res) => {
    try {
        const { usuario } = req.params;
        const usuarios = leerJSON('usuarios.json');
        if (!usuarios[usuario]) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (usuario === 'admin') return res.status(400).json({ error: 'No se puede eliminar admin' });
        delete usuarios[usuario];
        guardarJSON('usuarios.json', usuarios);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    try {
        const { usuario, password } = req.body;
        const usuarios = leerJSON('usuarios.json');
        if (!usuarios[usuario] || usuarios[usuario].pass !== password) {
            return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
        }
        res.json({ success: true, nombre: usuarios[usuario].nombre, rol: usuarios[usuario].rol });
    } catch (e) {
        res.status(500).json({ error: 'Error en login' });
    }
});

// --- SOLICITUDES ---
app.get('/api/solicitudes', (req, res) => {
    try {
        res.json(leerJSON('solicitudes.json'));
    } catch (e) {
        res.status(500).json({ error: 'Error al leer solicitudes' });
    }
});

app.post('/api/solicitudes', (req, res) => {
    try {
        const solicitudes = leerJSON('solicitudes.json');
        const nueva = req.body;
        nueva.id = Date.now() + Math.floor(Math.random() * 1000);
        solicitudes.push(nueva);
        guardarJSON('solicitudes.json', solicitudes);
        res.json({ success: true, id: nueva.id });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar solicitud' });
    }
});

app.put('/api/solicitudes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const solicitudes = leerJSON('solicitudes.json');
        const index = solicitudes.findIndex(s => s.id === id);
        if (index === -1) return res.status(404).json({ error: 'Solicitud no encontrada' });
        solicitudes[index] = { ...solicitudes[index], ...req.body };
        guardarJSON('solicitudes.json', solicitudes);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar solicitud' });
    }
});

app.delete('/api/solicitudes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const solicitudes = leerJSON('solicitudes.json');
        const index = solicitudes.findIndex(s => s.id === id);
        if (index === -1) return res.status(404).json({ error: 'Solicitud no encontrada' });
        solicitudes.splice(index, 1);
        guardarJSON('solicitudes.json', solicitudes);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar solicitud' });
    }
});

// --- OBSERVACIONES ---
app.post('/api/solicitudes/:id/observaciones', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { autor, rol, texto } = req.body;
        const solicitudes = leerJSON('solicitudes.json');
        const index = solicitudes.findIndex(s => s.id === id);
        if (index === -1) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (!solicitudes[index].observaciones) solicitudes[index].observaciones = [];
        solicitudes[index].observaciones.push({ autor, rol, texto, fecha: new Date().toLocaleString('es-MX') });
        guardarJSON('solicitudes.json', solicitudes);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al agregar observación' });
    }
});

// --- CONFIGURACIÓN ---
app.get('/api/configuracion', (req, res) => {
    try {
        res.json(leerJSON('configuracion.json'));
    } catch (e) {
        res.status(500).json({ error: 'Error al leer configuración' });
    }
});

app.put('/api/configuracion', (req, res) => {
    try {
        const config = leerJSON('configuracion.json');
        Object.assign(config, req.body);
        guardarJSON('configuracion.json', config);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar configuración' });
    }
});

// ==================== INICIAR ====================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Datos guardados en: ${DATA_DIR}`);
});
