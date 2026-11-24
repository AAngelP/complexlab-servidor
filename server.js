const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Render (y cualquier hosting) está detrás de un proxy: así req.protocol devuelve https
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '20kb' }));

/*==================================================
URL PÚBLICA DEL SERVIDOR
Todo texto que contenga http://localhost:5000 se reescribe al vuelo con la
URL real desde la que se consulta (https://TU-SERVICIO.onrender.com en Render,
http://localhost:5000 en tu PC). Opcional: define BASE_URL para forzarla.
==================================================*/
const URL_LOCAL = 'http://localhost:5000';
const URL_PUBLICA = (process.env.BASE_URL || 'https://complexlab-servidor.onrender.com')
    .replace(/\/+$/, '');

app.use((req, res, next) => {
    const base = URL_PUBLICA;
    const enviarOriginal = res.send.bind(res);

    res.send = (cuerpo) => {
        if (typeof cuerpo === 'string' && cuerpo.includes(URL_LOCAL)) {
            cuerpo = cuerpo.split(URL_LOCAL).join(base);
        }
        return enviarOriginal(cuerpo);
    };

    next();
});

// Ruta ligera para el Health Check de Render
app.get('/health', (req, res) => res.status(200).send('ok'));

/*==================================================
ARCHIVOS ESTÁTICOS GENERALES
==================================================*/
app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));
app.use('/fondos', express.static(path.join(__dirname, 'fondos')));
// Linux distingue mayúsculas: se usa la carpeta tal como exista (CSSvistas o cssvistas)
const carpetaCss = fs.existsSync(path.join(__dirname, 'CSSvistas')) ? 'CSSvistas' : 'cssvistas';
app.use('/cssvistas', express.static(path.join(__dirname, carpetaCss)));
app.use('/vistas', express.static(path.join(__dirname, 'vistas')));

/*==================================================
ARCHIVOS ESTÁTICOS DE SIMULACIONES (NUEVA ESTRUCTURA)
==================================================*/
app.use('/juegos/cazador', express.static(path.join(__dirname, 'simulaciones', 'cazador-complejo')));
app.use('/juegos/residuo', express.static(path.join(__dirname, 'simulaciones', 'residuo')));
app.use('/juegos/raicesypotencias', express.static(path.join(__dirname, 'simulaciones', 'raicesypotencias')));
app.use('/juegos/armonicos', express.static(path.join(__dirname, 'simulaciones', 'armonicos')));
app.use('/juegos/cauchy', express.static(path.join(__dirname, 'simulaciones', 'cauchy')));
app.use('/juegos/mapeos', express.static(path.join(__dirname, 'simulaciones', 'mapeos')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Diagnóstico: permite identificar en los logs de Render si una ruta de juego
// llega al servidor y qué archivo está solicitando el iframe.
app.use('/juegos', (req, res, next) => {
    console.log(`[JUEGOS] ${req.method} ${req.originalUrl}`);
    next();
});


/*==================================================
VERIFICACIÓN DE ARCHIVOS DE SIMULACIONES
==================================================*/
const juegosPublicados = {
    cazador: path.join(__dirname, 'simulaciones', 'cazador-complejo', 'index.html'),
    residuo: path.join(__dirname, 'simulaciones', 'residuo', 'index.html'),
    raicesypotencias: path.join(__dirname, 'simulaciones', 'raicesypotencias', 'index.html'),
    armonicos: path.join(__dirname, 'simulaciones', 'armonicos', 'index.html'),
    mapeos: path.join(__dirname, 'simulaciones', 'mapeos', 'index.html'),
    cauchy: path.join(__dirname, 'simulaciones', 'cauchy', 'index.html')
};

app.get('/api/diagnostico-juegos', (req, res) => {
    const estado = Object.entries(juegosPublicados).map(([id, archivo]) => ({
        id,
        disponible: fs.existsSync(archivo),
        ruta: path.relative(__dirname, archivo).replace(/\\\\/g, '/')
    }));

    res.json({
        servidor: 'COMPLEXLAB API',
        baseUrl: URL_PUBLICA,
        juegos: estado
    });
});

/*==================================================
CONFIGURACIÓN
==================================================*/
app.get('/api/configuracion', (req, res) => {
    res.json({ fondoAnimado: 'http://localhost:5000/fondos/complejo.html' });
});

/*==================================================
/*==================================================
CATÁLOGO DE SIMULACIONES
==================================================*/
app.get('/api/simulaciones', (req, res) => {
    const simulaciones = [
        {
            titulo: 'suma, resta y multiplicacion',
            imagen: 'http://localhost:5000/imagenes/imgcazador-complejo.png',
            url: '/api/cargar-juego/cazador'
        },
        {
            titulo: 'Reactor Cuántico RLC',
            imagen: 'http://localhost:5000/imagenes/Residuo.png',
            url: '/api/cargar-juego/residuo'
        },
        {
            titulo: 'La aventura de Moivre',
            imagen: 'http://localhost:5000/imagenes/raicesypotencias.png',
            url: '/api/cargar-juego/raicesypotencias'
        },
        {
            titulo: 'Restaurador armonico',
            imagen: 'http://localhost:5000/imagenes/armonicos.png',
            url: '/api/cargar-juego/armonicos'
        },
        {
            titulo: 'Mapeo Conformal', 
            imagen: 'http://localhost:5000/imagenes/mapeos.png',
            url: '/api/cargar-juego/mapeos'
        },
        {
            titulo: 'Túnel Aerodinámico de Argand',
            imagen: 'http://localhost:5000/imagenes/cauchy.png',
            url: '/api/cargar-juego/cauchy'
        }
    ];

    const rutaHtml = path.join(__dirname, 'vistas', 'simulaciones.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'No se cargó simulaciones.html' });
        }

        const tarjetas = simulaciones.map(sim => `
            <div class="tarjeta-simulacion" onclick="irASimulacion(event, '${sim.url}')">
                <img src="${sim.imagen}" alt="${sim.titulo}">
                <h3>${sim.titulo}</h3>
            </div>
        `).join('');

        const htmlFinal = html.replace(/{{tarjetas}}/g, tarjetas);

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/simulaciones.css',
            html: htmlFinal
        });
    });
});

/*==================================================
ENDPOINTS: INCRUSTAR JUEGOS (EVITA REDIRECCIONES)
==================================================*/
app.get('/api/cargar-juego/cazador', (req, res) => {
    const htmlIncrustado = '<div class="contenedor-juego-flotante" style="width: 100%; height: calc(100vh - 60px); display: flex; box-sizing: border-box; padding: 10px;"><iframe src="http://localhost:5000/juegos/cazador/index.html" title="Simulación cazador" loading="eager" allow="fullscreen; autoplay" style="width: 100%; height: 100%; min-height: 650px; border: none; border-radius: 15px; background: transparent;"></iframe></div>';
    res.json({ cssUrl: '', html: htmlIncrustado });
});

app.get('/api/cargar-juego/residuo', (req, res) => {
    const htmlIncrustado = '<div class="contenedor-juego-flotante" style="width: 100%; height: calc(100vh - 60px); display: flex; box-sizing: border-box; padding: 10px;"><iframe src="http://localhost:5000/juegos/residuo/index.html" title="Simulación residuo" loading="eager" allow="fullscreen; autoplay" style="width: 100%; height: 100%; min-height: 650px; border: none; border-radius: 15px; background: transparent;"></iframe></div>';
    res.json({ cssUrl: '', html: htmlIncrustado });
});

app.get('/api/cargar-juego/raicesypotencias', (req, res) => {
    const htmlIncrustado = '<div class="contenedor-juego-flotante" style="width: 100%; height: calc(100vh - 60px); display: flex; box-sizing: border-box; padding: 10px;"><iframe src="http://localhost:5000/juegos/raicesypotencias/index.html" title="Simulación raicesypotencias" loading="eager" allow="fullscreen; autoplay" style="width: 100%; height: 100%; min-height: 650px; border: none; border-radius: 15px; background: transparent;"></iframe></div>';
    res.json({ cssUrl: '', html: htmlIncrustado });
});

app.get('/api/cargar-juego/armonicos', (req, res) => {
    const htmlIncrustado = '<div class="contenedor-juego-flotante" style="width: 100%; height: calc(100vh - 60px); display: flex; box-sizing: border-box; padding: 10px;"><iframe src="http://localhost:5000/juegos/armonicos/index.html" title="Simulación armonicos" loading="eager" allow="fullscreen; autoplay" style="width: 100%; height: 100%; min-height: 650px; border: none; border-radius: 15px; background: transparent;"></iframe></div>';
    res.json({ cssUrl: '', html: htmlIncrustado });
});

app.get('/api/cargar-juego/mapeos', (req, res) => {
    const htmlIncrustado = '<div class="contenedor-juego-flotante" style="width: 100%; height: calc(100vh - 60px); display: flex; box-sizing: border-box; padding: 10px;"><iframe src="http://localhost:5000/juegos/mapeos/index.html" title="Simulación mapeos" loading="eager" allow="fullscreen; autoplay" style="width: 100%; height: 100%; min-height: 650px; border: none; border-radius: 15px; background: transparent;"></iframe></div>';
    res.json({ cssUrl: '', html: htmlIncrustado });
});

app.get('/api/cargar-juego/cauchy', (req, res) => {
    const htmlIncrustado = '<div class="contenedor-juego-flotante" style="width: 100%; height: calc(100vh - 60px); display: flex; box-sizing: border-box; padding: 10px;"><iframe src="http://localhost:5000/juegos/cauchy/index.html" title="Simulación cauchy" loading="eager" allow="fullscreen; autoplay" style="width: 100%; height: 100%; min-height: 650px; border: none; border-radius: 15px; background: transparent;"></iframe></div>';
    res.json({ cssUrl: '', html: htmlIncrustado });
});

/*==================================================
VARIABLE COMPLEJA
==================================================*/
app.get('/api/variable-compleja', (req, res) => {
    const cursos = [
        { id: 'algebra', titulo: 'Álgebra Compleja', imagen: 'http://localhost:5000/imagenes/algebra.png', activo: true },
        { id: 'derivacion', titulo: 'Derivación Compleja', imagen: 'http://localhost:5000/imagenes/derivacion.png', activo: false },
        { id: 'integracion', titulo: 'Integración Compleja', imagen: 'http://localhost:5000/imagenes/integracion.png', activo: false }
    ];

    const rutaHtml = path.join(__dirname, 'vistas', 'caps-de-var-compleja.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'No se cargó caps-de-var-compleja.html' });
        }

        const tarjetas = cursos.map(cur => `
            <div class="tarjeta-curso ${cur.activo ? 'activo' : ''}" data-id="${cur.id}">
                <div class="contenedor-img">
                    <img src="${cur.imagen}" alt="${cur.titulo}">
                </div>
                <h3>${cur.titulo}</h3>
            </div>
        `).join('');

        const htmlFinal = html.replace(/{{tarjetas_cursos}}/g, tarjetas);

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/caps-de-var-complejacss.css',
            html: htmlFinal
        });
    });
});

/*==================================================
TEMAS DE ÁLGEBRA COMPLEJA
==================================================*/
app.get('/api/variable-compleja/algebra', (req, res) => {
    const temas = [
        {
            id: 'suma-compleja',
            titulo: 'Suma Compleja',
            color: 'rgba(74, 189, 172, 0.2)', 
            descripcion: 'Aprende a combinar las partes reales e imaginarias de forma independiente. Representa la traslación de vectores en el plano de Argand.',
            urlSimulacion: '/api/cargar-juego/cazador'
        },
        {
            id: 'multiplicacion-compleja',
            titulo: 'Multiplicación Compleja',
            color: 'rgba(52, 152, 219, 0.2)',
            descripcion: 'Descubre cómo multiplicar números complejos escala las magnitudes y suma sus argumentos trigonométricos, provocando rotaciones.',
            urlSimulacion: '/api/cargar-juego/cazador'
        },
        {
            id: 'teorema-demoivre',
            titulo: 'Teorema de De Moivre',
            color: 'rgba(241, 196, 15, 0.2)',
            descripcion: 'Aplica potencias enteras de forma inmediata utilizando la forma polar. Permite calcular raíces n-ésimas de manera geométrica.',
            urlSimulacion: '/api/cargar-juego/raicesypotencias'
        }
    ];

    const rutaHtml = path.join(__dirname, 'vistas', 'temas-algebra.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'No se cargó temas-algebra.html' });
        }

        const tarjetas = temas.map(tema => `
            <div class="tarjeta-tema" style="background: ${tema.color};" onclick="redirigirTema(event, '${tema.id}')">

                <div class="contenido-tema">
                    <h3>${tema.titulo}</h3>
                    <p class="desc">${tema.descripcion}</p>
                </div>
                <div class="acciones-tema">
                    ${tema.urlSimulacion !== '#' ? `<button class="btn-tema btn-sim" onclick="irASimulacionTema(event, '${tema.urlSimulacion}')">Simulación</button>` : '<span class="no-sim">Sin simulación</span>'}
                </div>
            </div>
        `).join('');

        const htmlFinal = html.replace(/{{tarjetas_temas}}/g, tarjetas);

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/temas-algebra.css',
            html: htmlFinal
        });
    });
});


/*==================================================
TEMAS DE DERIVACIÓN COMPLEJA
==================================================*/
app.get('/api/variable-compleja/derivacion', (req, res) => {
    const temas = [
        {
            id: 'bases-derivacion',
            titulo: 'Bases de Derivación Compleja',
            color: 'rgba(74, 189, 172, 0.2)',
            descripcion: 'Definición formal de límite en el plano complejo, continuidad de funciones f(z) y reglas elementales de derivación.',
            urlSimulacion: '#'
        },
        {
            id: 'derivacion-nivel-medio',
            titulo: 'Derivación Nivel Medio',
            color: 'rgba(52, 152, 219, 0.2)',
            descripcion: 'Regla de la cadena, derivación de funciones exponenciales, trigonométricas, hiperbólicas y logaritmo complejo.',
            urlSimulacion: '#'
        },
        {
            id: 'cauchy-riemann-laplace',
            titulo: 'Cauchy-Riemann, Analiticidad y Laplace',
            color: 'rgba(241, 196, 15, 0.2)',
            descripcion: 'Ecuaciones de Cauchy-Riemann, criterios para comprobar funciones analíticas y verificación de funciones armónicas con la ecuación de Laplace.',
            urlSimulacion: '#'
        }
    ];

    const rutaHtml = path.join(__dirname, 'vistas', 'temas-derivacion.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'No se cargó temas-derivacion.html' });
        }

        const tarjetas = temas.map(tema => `
            <div class="tarjeta-tema" style="background: ${tema.color};" onclick="redirigirTema(event, '${tema.id}')">
                <div class="contenido-tema">
                    <h3>${tema.titulo}</h3>
                    <p class="desc">${tema.descripcion}</p>
                </div>
                <div class="acciones-tema">
                    ${tema.urlSimulacion !== '#' ? `<button class="btn-tema btn-sim" onclick="irASimulacionTema(event, '${tema.urlSimulacion}')">Simulación</button>` : '<span class="no-sim">Sin simulación</span>'}
                </div>
            </div>
        `).join('');

        const htmlFinal = html.replace(/{{tarjetas_temas}}/g, tarjetas);

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/temas-algebra.css',
            html: htmlFinal
        });
    });
});

/*==================================================
TEMAS DE INTEGRACIÓN COMPLEJA
==================================================*/
app.get('/api/variable-compleja/integracion', (req, res) => {
    const temas = [
        {
            id: 'bases-integracion',
            titulo: 'Bases de Integración Compleja',
            color: 'rgba(74, 189, 172, 0.2)',
            descripcion: 'Integrales de línea en el plano complejo, parametrización de contornos, propiedades fundamentales y acotación ML.',
            urlSimulacion: '#'
        },
        {
            id: 'integral-cauchy',
            titulo: 'Integral de Cauchy',
            color: 'rgba(52, 152, 219, 0.2)',
            descripcion: 'Teorema de Cauchy-Goursat, independencia de la trayectoria y Fórmula Integral de Cauchy para derivadas de orden superior.',
            urlSimulacion: '#'
        },
        {
            id: 'teorema-residuo',
            titulo: 'Teorema del Residuo',
            color: 'rgba(241, 196, 15, 0.2)',
            descripcion: 'Clasificación de singularidades aisladas, cálculo de residuos y evaluación de integrales cerradas mediante el Teorema de los Residuos.',
            urlSimulacion: '#'
        }
    ];

    const rutaHtml = path.join(__dirname, 'vistas', 'temas-integracion.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'No se cargó temas-integracion.html' });
        }

        const tarjetas = temas.map(tema => `
            <div class="tarjeta-tema" style="background: ${tema.color};" onclick="redirigirTema(event, '${tema.id}')">
                <div class="contenido-tema">
                    <h3>${tema.titulo}</h3>
                    <p class="desc">${tema.descripcion}</p>
                </div>
                <div class="acciones-tema">
                    ${tema.urlSimulacion !== '#' ? `<button class="btn-tema btn-sim" onclick="irASimulacionTema(event, '${tema.urlSimulacion}')">Simulación</button>` : '<span class="no-sim">Sin simulación</span>'}
                </div>
            </div>
        `).join('');

        const htmlFinal = html.replace(/{{tarjetas_temas}}/g, tarjetas);

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/temas-algebra.css',
            html: htmlFinal
        });
    });
});

/*==================================================
VISTAS DE CONTENIDO ESPECÍFICO POR TEMA (HTML PURO)
==================================================*/
app.get('/api/contenido-tema/:id', (req, res) => {
    const temaId = req.params.id;
    let nombreArchivo = "";

    if (temaId === 'suma-compleja') nombreArchivo = 'tema-suma.html';
    else if (temaId === 'multiplicacion-compleja') nombreArchivo = 'tema-multiplicacion.html';
    else if (temaId === 'teorema-demoivre') nombreArchivo = 'tema-demoivre.html';
    else if (temaId === 'bases-derivacion') nombreArchivo = 'tema-bases-derivacion.html';
    else if (temaId === 'derivacion-nivel-medio') nombreArchivo = 'tema-derivacion-medio.html';
    else if (temaId === 'cauchy-riemann-laplace') nombreArchivo = 'tema-cauchy-riemann.html';
    else if (temaId === 'bases-integracion') nombreArchivo = 'tema-bases-integracion.html';
    else if (temaId === 'integral-cauchy') nombreArchivo = 'tema-integral-cauchy.html';
    else if (temaId === 'teorema-residuo') nombreArchivo = 'tema-teorema-residuo.html';
    else return res.status(404).json({ error: 'Tema no encontrado' });

    const rutaHtml = path.join(__dirname, 'vistas', nombreArchivo);

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: `No se pudo leer ${nombreArchivo}` });
        }
        res.json({ html: html });
    });
});

/*==================================================
SOBRE NOSOTROS
==================================================*/
app.get('/api/sobre-nosotros', (req, res) => {
    const datosSobreNosotros = {
        mision: "Proveer a los estudiantes de la Escuela Superior de Cómputo (ESCOM) una herramienta interactiva y visual que facilite la comprensión profunda de la Variable Compleja, conectando la teoría matemática con aplicaciones reales en sistemas computacionales.",
        vision: "Ser la plataforma de simulación matemática referente dentro de la ESCOM, impulsando el rendimiento académico y el desarrollo de software basado en modelos analíticos complejos.",
        objetivos: [
            "Desarrollar módulos interactivos de mapeo conformal aplicados a procesamiento de señales.",
            "Facilitar la visualización de series de Laurent y residuos para el análisis de sistemas estables.",
            "Integrar herramientas de simulación accesibles desde cualquier navegador para la comunidad estudiantil."
        ]
    };

    const rutaHtml = path.join(__dirname, 'vistas', 'sobrenosotros.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error cargando sobrenosotros.html' });
        }

        const objetivos = datosSobreNosotros.objetivos.map(o => `<li>${o}</li>`).join('');
        let htmlFinal = html;
        htmlFinal = htmlFinal.replace(/{{mision}}/g, datosSobreNosotros.mision);
        htmlFinal = htmlFinal.replace(/{{vision}}/g, datosSobreNosotros.vision);
        htmlFinal = htmlFinal.replace(/{{objetivos}}/g, objetivos);

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/sobrenosotros.css',
            html: htmlFinal
        });
    });
});

/*========================================================
EXAMENES
==========================================================*/
app.get('/api/examen-algebra', async (req, res) => {
  try {
    const rutaHtml = path.join(__dirname, 'vistas', 'examen-algebra.html');
    const html = await fs.promises.readFile(rutaHtml, 'utf8');

    res.json({
      cssUrl: 'http://localhost:5000/cssvistas/examen-algebra.css',
      html: html
    });

  } catch (err) {
    console.error('Error cargando examen-algebra.html:', err);
    res.status(500).json({ error: 'No se pudo cargar examen-algebra.html' });
  }
});

app.get('/api/examen-derivacion', async (req, res) => {
  try {
    const rutaHtml = path.join(__dirname, 'vistas', 'examen-derivacion.html');
    const html = await fs.promises.readFile(rutaHtml, 'utf8');

    res.json({
      cssUrl: 'http://localhost:5000/cssvistas/examen-algebra.css',
      html: html
    });

  } catch (err) {
    console.error('Error cargando examen-derivacion.html:', err);
    res.status(500).json({ error: 'No se pudo cargar examen-derivacion.html' });
  }
});

app.get('/api/examen-integracion', async (req, res) => {
  try {
    const rutaHtml = path.join(__dirname, 'vistas', 'examen-integracion.html');
    const html = await fs.promises.readFile(rutaHtml, 'utf8');

    res.json({
      cssUrl: 'http://localhost:5000/cssvistas/examen-algebra.css',
      html: html
    });

  } catch (err) {
    console.error('Error cargando examen-integracion.html:', err);
    res.status(500).json({ error: 'No se pudo cargar examen-integracion.html' });
  }
});

/* ================================================
   AUTENTICACIÓN PROVISIONAL DE COMPLEXLAB
   Sin base de datos
================================================ */
const crypto = require('crypto');

const usuariosDemo = new Map();

function crearHashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);

    return {
        salt: salt.toString('hex'),
        hash: hash.toString('hex')
    };
}

function verificarPassword(password, registro) {
    const salt = Buffer.from(registro.salt, 'hex');
    const hashCalculado = crypto.scryptSync(password, salt, 64);
    const hashGuardado = Buffer.from(registro.hash, 'hex');

    return hashCalculado.length === hashGuardado.length &&
        crypto.timingSafeEqual(hashCalculado, hashGuardado);
}

function validarUsuario(usuario) {
    return typeof usuario === 'string' &&
        /^[a-zA-Z0-9_.-]{3,30}$/.test(usuario);
}

function validarCorreo(correo) {
    return typeof correo === 'string' &&
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i
            .test(correo);
}

function validarPassword(password) {
    return typeof password === 'string' &&
        password.length >= 10 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);
}

usuariosDemo.set('usuario_p1', {
    correo: null,
    ...crearHashPassword('Qw1234567$')
});

app.get('/api/vistas/inicio-sesion', (req, res) => {
    const ruta = path.join(__dirname, 'vistas', 'inicio-sesion.html');
    res.set('Cache-Control', 'no-store');

    fs.readFile(ruta, 'utf8', (err, html) => {
        if (err) {
            console.error('Error cargando inicio-sesion.html:', err);
            return res.status(500).json({ error: 'No se pudo cargar la vista de inicio de sesión.' });
        }

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/auth.css',
            html: html
        });
    });
});

app.get('/api/vistas/registro', (req, res) => {
    const ruta = path.join(__dirname, 'vistas', 'registro.html');
    res.set('Cache-Control', 'no-store');

    fs.readFile(ruta, 'utf8', (err, html) => {
        if (err) {
            console.error('Error cargando registro.html:', err);
            return res.status(500).json({ error: 'No se pudo cargar la vista de registro.' });
        }

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/auth.css',
            html: html
        });
    });
});

app.post('/api/registro', (req, res) => {
    const { usuario, correo, password } = req.body || {};

    if (
        typeof usuario !== 'string' ||
        typeof correo !== 'string' ||
        typeof password !== 'string' ||
        !usuario.trim() ||
        !correo.trim() ||
        !password
    ) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const nombreUsuario = usuario.trim();
    const email = correo.trim();

    if (!validarUsuario(nombreUsuario)) {
        return res.status(400).json({
            error: 'El usuario debe tener entre 3 y 30 caracteres. Solo se permiten letras, números, punto, guion y guion bajo.'
        });
    }

    if (!validarCorreo(email)) {
        return res.status(400).json({ error: 'Ingresa un correo válido que termine en @gmail.com.' });
    }

    if (!validarPassword(password)) {
        return res.status(400).json({
            error: 'La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
        });
    }

    const usuarioNormalizado = nombreUsuario.toLowerCase();
    const correoNormalizado = email.toLowerCase();

    for (const [nombre, cuenta] of usuariosDemo.entries()) {
        if (nombre.toLowerCase() === usuarioNormalizado) {
            return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
        }
        if (cuenta.correo && cuenta.correo.toLowerCase() === correoNormalizado) {
            return res.status(409).json({ error: 'Ese correo ya está registrado.' });
        }
    }

    const datosPassword = crearHashPassword(password);
    usuariosDemo.set(nombreUsuario, { correo: email, ...datosPassword });

    return res.status(201).json({
        mensaje: 'Cuenta registrada correctamente.',
        usuario: nombreUsuario
    });
});

app.post('/api/iniciar-sesion', (req, res) => {
    const { usuario, password } = req.body || {};

    if (
        typeof usuario !== 'string' ||
        typeof password !== 'string' ||
        !usuario.trim() ||
        !password
    ) {
        return res.status(400).json({ error: 'Ingresa el usuario y la contraseña.' });
    }

    const nombreUsuario = usuario.trim();
    const entrada = [...usuariosDemo.entries()].find(
        ([nombre]) => nombre.toLowerCase() === nombreUsuario.toLowerCase()
    );

    if (!entrada || !verificarPassword(password, entrada[1])) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    return res.status(200).json({
        mensaje: 'Inicio de sesión correcto.',
        usuario: entrada[0]
    });
});

app.get('/api/scripts/auth', (req, res) => {
    const rutaScript = path.join(__dirname, 'js', 'auth.js');

    fs.readFile(rutaScript, 'utf8', (err, codigo) => {
        if (err) {
            console.error('Error al cargar js/auth.js:', err);
            return res.status(500).json({ error: 'No se pudo cargar el script de autenticación.' });
        }

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(codigo);
    });
});

/*==================================================
VISTA: MI PROGRESO
==================================================*/
app.get('/api/mi-progreso', (req, res) => {
    const rutaHtml = path.join(__dirname, 'vistas', 'mi-progreso.html');

    fs.readFile(rutaHtml, 'utf8', (err, html) => {
        if (err) {
            console.error('Error cargando mi-progreso.html:', err);
            return res.status(500).json({ error: 'No se pudo cargar la vista Mi progreso.' });
        }

        res.json({
            cssUrl: 'http://localhost:5000/cssvistas/mi-progreso.css',
            html: html
        });
    });
});

// Reportar claramente recursos de juegos inexistentes (JS, CSS, imágenes, etc.).
app.use('/juegos', (req, res) => {
    console.error(`[JUEGOS 404] No existe el recurso: ${req.originalUrl}`);
    res.status(404).type('text/plain').send(`No se encontró el recurso de simulación: ${req.originalUrl}`);
});

/*==================================================
ARRANQUE DEL SERVIDOR
==================================================*/
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor API REST activo en el puerto ' + PORT);
});
