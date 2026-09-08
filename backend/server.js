const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==================== 📁 RUTA DE DATOS ====================
// En Render, el disco persistente está montado en /data
let DATA_DIR;
if (process.env.RENDER) {
    DATA_DIR = '/data';  // Disco persistente en Render
} else {
    DATA_DIR = path.join(__dirname, '..', 'data');  // Local
}

console.log(`📁 Carpeta de datos: ${DATA_DIR}`);

// Crear la carpeta si no existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Carpeta data creada');
}

// ==================== 📁 SERVIR ARCHIVOS ESTÁTICOS ====================
const RUTA_RAIZ = path.join(__dirname, '..');
app.use(express.static(RUTA_RAIZ));

// ==================== FUNCIONES JSON ====================
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
        console.log(`📄 Archivo ${nombre} creado con datos por defecto`);
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
    const ruta = path.join(DATA_DIR, nombre);
    fs.writeFileSync(ruta, JSON.stringify(datos, null, 2));
    console.log(`💾 Datos guardados en ${ruta}`);
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

// ==================== CREAR RESPALDO ====================
app.get('/api/respaldo', (req, res) => {
    try {
        const datos = {
            fecha: new Date().toLocaleString('es-MX'),
            usuarios: leerJSON('usuarios.json'),
            solicitudes: leerJSON('solicitudes.json'),
            numeroWhatsAppDestino: leerJSON('configuracion.json').numeroWhatsApp || '',
            logoDataURL: leerJSON('configuracion.json').logoDataURL || '',
            nombreResponsableMantenimiento: leerJSON('configuracion.json').nombreResponsableMantenimiento || 'Ricardo Madera'
        };
        res.json(datos);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear respaldo' });
    }
});

// ==================== RESTAURAR RESPALDO (CORREGIDO) ====================
app.post('/api/restaurar', (req, res) => {
    try {
        const datos = req.body;
        
        console.log('📥 Recibiendo datos para restaurar...');
        console.log('📋 Usuarios:', Object.keys(datos.usuarios || {}).length);
        console.log('📋 Solicitudes:', (datos.solicitudes || []).length);
        
        // VALIDACIÓN 1: Verificar que los datos existen
        if (!datos) {
            return res.status(400).json({ 
                success: false,
                error: 'No se recibieron datos para restaurar'
            });
        }
        
        // VALIDACIÓN 2: Verificar usuarios
        if (!datos.usuarios || typeof datos.usuarios !== 'object') {
            return res.status(400).json({ 
                success: false,
                error: 'El archivo no contiene usuarios válidos. Se esperaba un objeto con usuarios.'
            });
        }
        
        // VALIDACIÓN 3: Verificar solicitudes
        if (!datos.solicitudes || !Array.isArray(datos.solicitudes)) {
            return res.status(400).json({ 
                success: false,
                error: 'El archivo no contiene solicitudes válidas. Se esperaba un arreglo de solicitudes.'
            });
        }
        
        // VALIDACIÓN 4: Verificar que haya al menos un usuario
        if (Object.keys(datos.usuarios).length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'El archivo no contiene ningún usuario. El respaldo debe tener al menos el usuario admin.'
            });
        }
        
        // ==================== GUARDAR DATOS ====================
        
        // 1. Guardar usuarios
        guardarJSON('usuarios.json', datos.usuarios);
        console.log('✅ Usuarios restaurados:', Object.keys(datos.usuarios).length);
        
        // 2. Guardar solicitudes
        guardarJSON('solicitudes.json', datos.solicitudes);
        console.log('✅ Solicitudes restauradas:', datos.solicitudes.length);
        
        // 3. Guardar configuración
        const config = leerJSON('configuracion.json');
        if (datos.numeroWhatsAppDestino !== undefined) {
            config.numeroWhatsApp = datos.numeroWhatsAppDestino || '';
        }
        if (datos.nombreResponsableMantenimiento) {
            config.nombreResponsableMantenimiento = datos.nombreResponsableMantenimiento;
        }
        if (datos.logoDataURL) {
            config.logoDataURL = datos.logoDataURL || '';
        }
        guardarJSON('configuracion.json', config);
        console.log('✅ Configuración restaurada');
        
        // ==================== RESPUESTA EXITOSA ====================
        res.json({ 
            success: true, 
            mensaje: '✅ Datos restaurados correctamente',
            usuarios: Object.keys(datos.usuarios).length,
            solicitudes: datos.solicitudes.length
        });
        
    } catch (error) {
        console.error('❌ Error al restaurar:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al restaurar los datos: ' + error.message 
        });
    }
});

// ==================== 🔄 RUTA PARA EL FRONTEND ====================
app.get('*', (req, res) => {
    const indexPath = path.join(RUTA_RAIZ, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`❌ No se encontró index.html en: ${indexPath}`);
    }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Datos guardados en: ${DATA_DIR}`);
    console.log(`🌐 Sirviendo index.html desde: ${RUTA_RAIZ}`);
    
    // Verificar que la carpeta data existe y es escribible
    try {
        fs.writeFileSync(path.join(DATA_DIR, 'test.txt'), 'test');
        fs.unlinkSync(path.join(DATA_DIR, 'test.txt'));
        console.log('✅ Carpeta data es escribible');
    } catch (e) {
        console.error('❌ ERROR: No se puede escribir en la carpeta data:', e.message);
    }
});
