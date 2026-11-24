
// URL base del backend: es el origen desde el que se descargó este script
// (https://TU-SERVICIO.onrender.com en Render, http://localhost:5000 en local).
window.COMPLEXLAB_API = window.COMPLEXLAB_API ||
    ((document.currentScript && document.currentScript.src)
        ? new URL(document.currentScript.src).origin
        : window.location.origin);

const AUTH_API = window.COMPLEXLAB_API + '/api';

let vistaAuthActual = null;
let navegacionAuthConfigurada = false;

/* =========================================
   UTILIDADES
========================================= */

function obtenerUsuarioActual() {
    try {
        return sessionStorage.getItem('complexlab_usuario');
    } catch {
        return null;
    }
}

function establecerUsuarioActual(usuario) {
    sessionStorage.setItem('complexlab_usuario', usuario);
}

function limpiarUsuarioActual() {
    sessionStorage.removeItem('complexlab_usuario');
}

async function obtenerRespuesta(ruta, opciones = {}) {
    const respuesta = await fetch(`${AUTH_API}${ruta}`, {
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            ...(opciones.headers || {})
        },
        cache: 'no-store'
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || 'No se pudo completar la solicitud.');
    }

    return datos;
}

function mostrarMensaje(id, mensaje, correcto = false) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.classList.toggle('success', correcto);
}

/* =========================================
   CARGA DE VISTAS DESDE LA API REST
========================================= */

async function cargarVistaAutenticacion(vista, agregarHistorial = true) {
    if (obtenerUsuarioActual()) {
        mostrarInicioPrincipal(false);
        return;
    }

    const main = document.getElementById('main-content');
    if (!main) return;

    try {
        const datos = await obtenerRespuesta(`/vistas/${vista}`);

        if (datos.cssUrl) {
            const idCss = 'css-autenticacion';
            let enlace = document.getElementById(idCss);

            if (!enlace) {
                enlace = document.createElement('link');
                enlace.id = idCss;
                enlace.rel = 'stylesheet';
                document.head.appendChild(enlace);
            }

            enlace.href = datos.cssUrl;
        }

        main.innerHTML = datos.html;
        vistaAuthActual = vista;

        if (agregarHistorial) {
            history.pushState(
                { pagina: vista },
                '',
                `#${vista}`
            );
        }

        if (vista === 'inicio-sesion') {
            configurarFormularioLogin();
        } else if (vista === 'registro') {
            configurarFormularioRegistro();
        }

        configurarNavegacionAutenticacion();
        actualizarNavegacionUsuario();
        window.scrollTo(0, 0);
    } catch (error) {
        main.innerHTML = `
            <section class="auth-page">
                <div class="auth-card">
                    <h1>No se pudo cargar la vista</h1>
                    <p class="auth-subtitle">
                        ${escaparHTML(error.message)}
                    </p>
                    <button class="auth-button"
                        onclick="mostrarInicioPrincipal()">
                        Volver al inicio
                    </button>
                </div>
            </section>
        `;
    }
}

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function abrirInicioSesion() {
    cargarVistaAutenticacion('inicio-sesion');
}

function abrirRegistro() {
    cargarVistaAutenticacion('registro');
}

function volverAlInicio(event) {
    if (event) event.preventDefault();
    mostrarInicioPrincipal(true);
}

/* =========================================
   INICIO DE SESIÓN
========================================= */

function configurarFormularioLogin() {
    const formulario = document.getElementById('form-login');
    const botonRegistro = document.getElementById('ir-registro');

    if (botonRegistro) {
        botonRegistro.addEventListener('click', abrirRegistro);
    }

    if (!formulario) return;

    formulario.addEventListener('submit', async event => {
        event.preventDefault();

        const usuario = document.getElementById('login-usuario')
            .value.trim();

        const password = document.getElementById('login-password')
            .value;

        if (!usuario || !password) {
            mostrarMensaje(
                'login-mensaje',
                'Completa el usuario y la contraseña.'
            );
            return;
        }

        const boton = formulario.querySelector('[type="submit"]');
        boton.disabled = true;
        boton.textContent = 'Verificando...';

        try {
            const resultado = await obtenerRespuesta('/iniciar-sesion', {
                method: 'POST',
                body: JSON.stringify({ usuario, password })
            });

            establecerUsuarioActual(resultado.usuario);

            // Evita regresar a una vista de autenticación anterior.
            history.replaceState(
                { pagina: 'principal', autenticado: true },
                '',
                location.pathname + location.search
            );

            mostrarInicioPrincipal(false);
        } catch (error) {
            mostrarMensaje('login-mensaje', error.message);
        } finally {
            boton.disabled = false;
            boton.textContent = 'Iniciar sesión';
        }
    });
}

/* =========================================
   VALIDACIONES DEL REGISTRO
========================================= */

function validarCorreoGmail(correo) {
    // Acepta direcciones como nombre.apellido@gmail.com.
    // No acepta espacios ni dominios diferentes de gmail.com.
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i
        .test(correo);
}

function validarPassword(password) {
    const errores = [];

    if (password.length < 10) {
        errores.push('Debe tener al menos 10 caracteres.');
    }

    if (!/[A-Z]/.test(password)) {
        errores.push('Debe incluir una letra mayúscula.');
    }

    if (!/[a-z]/.test(password)) {
        errores.push('Debe incluir una letra minúscula.');
    }

    if (!/[0-9]/.test(password)) {
        errores.push('Debe incluir un número.');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        errores.push('Debe incluir un carácter especial.');
    }

    return errores;
}

function configurarFormularioRegistro() {
    const formulario = document.getElementById('form-registro');
    const botonLogin = document.getElementById('ir-login');

    if (botonLogin) {
        botonLogin.addEventListener('click', abrirInicioSesion);
    }

    if (!formulario) return;

    formulario.addEventListener('submit', async event => {
        event.preventDefault();

        const usuario = document.getElementById('registro-usuario')
            .value.trim();

        const correo = document.getElementById('registro-correo')
            .value.trim();

        const password = document.getElementById('registro-password')
            .value;

        const confirmar = document.getElementById('registro-confirmar')
            .value;

        if (!usuario || !correo || !password || !confirmar) {
            mostrarMensaje(
                'registro-mensaje',
                'Todos los campos son obligatorios.'
            );
            return;
        }

        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(usuario)) {
            mostrarMensaje(
                'registro-mensaje',
                'El usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números, punto, guion o guion bajo.'
            );
            return;
        }

        if (!validarCorreoGmail(correo)) {
            mostrarMensaje(
                'registro-mensaje',
                'Ingresa un correo válido con el dominio @gmail.com.'
            );
            return;
        }

        const erroresPassword = validarPassword(password);

        if (erroresPassword.length > 0) {
            mostrarMensaje(
                'registro-mensaje',
                erroresPassword.join(' ')
            );
            return;
        }

        if (password !== confirmar) {
            mostrarMensaje(
                'registro-mensaje',
                'Las contraseñas no coinciden.'
            );
            return;
        }

        const boton = formulario.querySelector('[type="submit"]');
        boton.disabled = true;
        boton.textContent = 'Registrando...';

        try {
            const resultado = await obtenerRespuesta('/registro', {
                method: 'POST',
                body: JSON.stringify({ usuario, correo, password })
            });

            establecerUsuarioActual(resultado.usuario);

            history.replaceState(
                { pagina: 'principal', autenticado: true },
                '',
                location.pathname + location.search
            );

            mostrarInicioPrincipal(false);
        } catch (error) {
            mostrarMensaje('registro-mensaje', error.message);
        } finally {
            boton.disabled = false;
            boton.textContent = 'Registrar cuenta';
        }
    });
}

/* =========================================
   BARRA DE NAVEGACIÓN
========================================= */

function configurarNavegacionAutenticacion() {
    if (navegacionAuthConfigurada) return;

    const login = document.querySelector('.login-btn');

    if (login) {
        login.addEventListener('click', event => {
            event.preventDefault();
            abrirInicioSesion();
        });
    }

    navegacionAuthConfigurada = true;
}

function actualizarNavegacionUsuario() {
    const lista = document.querySelector('.nav-links');
    if (!lista) return;

    // Si en tu barra principal existe un enlace llamado "Mis simulaciones", lo renombramos a "Mi progreso"
    lista.querySelectorAll('a').forEach(enlace => {
        if (enlace.textContent.trim().toLowerCase() === 'mis simulaciones') {
            enlace.textContent = 'Mi progreso';
        }
    });

    let elementoUsuario = document.getElementById('nav-usuario');
    const login = lista.querySelector('.login-btn');
    const usuario = obtenerUsuarioActual();

    if (!usuario) {
        if (elementoUsuario) elementoUsuario.remove();
        if (login) login.closest('li').style.display = '';
        return;
    }

    if (login) login.closest('li').style.display = 'none';

    if (!elementoUsuario) {
        elementoUsuario = document.createElement('li');
        elementoUsuario.id = 'nav-usuario';
        elementoUsuario.className = 'dropdown';

        elementoUsuario.innerHTML = `
            <a href="#" id="nav-usuario-btn" aria-expanded="false"></a>
            <ul class="dropdown-menu" id="menu-usuario" style="display:none">
                <li>
                    <a href="#" id="btn-mi-progreso">Mi progreso</a>
                </li>
                <li>
                    <a href="#" id="btn-cerrar-sesion">Cerrar sesión</a>
                </li>
            </ul>
        `;

        lista.appendChild(elementoUsuario);

        const botonUsuario = elementoUsuario.querySelector('#nav-usuario-btn');
        const menuUsuario = elementoUsuario.querySelector('#menu-usuario');

        botonUsuario.addEventListener('click', event => {
            event.preventDefault();
            const abierto = menuUsuario.style.display !== 'none';
            menuUsuario.style.display = abierto ? 'none' : 'block';
            botonUsuario.setAttribute('aria-expanded', String(!abierto));
        });

        elementoUsuario.querySelector('#btn-mi-progreso').addEventListener('click', event => {
            // La navegación la atiende scriptprincipal.js (delegación de eventos);
            // aquí solo se cierra el menú para no ejecutar la vista dos veces.
            menuUsuario.style.display = 'none';
        });

        elementoUsuario.querySelector('#btn-cerrar-sesion').addEventListener('click', event => {
            event.preventDefault();
            cerrarSesion();
        });

        document.addEventListener('click', event => {
            if (!elementoUsuario.contains(event.target)) {
                menuUsuario.style.display = 'none';
                botonUsuario.setAttribute('aria-expanded', 'false');
            }
        });
    }

    elementoUsuario.querySelector('#nav-usuario-btn').textContent = usuario + ' ▾';
}

async function abrirMiProgreso() {
    const usuario = obtenerUsuarioActual();
    if (!usuario) {
        abrirInicioSesion();
        return;
    }

    const main = document.getElementById('main-content');
    if (!main) return;

    try {
        const datos = await obtenerRespuesta('/mi-progreso');

        if (datos.cssUrl) {
            let enlace = document.getElementById('css-mi-progreso');
            if (!enlace) {
                enlace = document.createElement('link');
                enlace.id = 'css-mi-progreso';
                enlace.rel = 'stylesheet';
                document.head.appendChild(enlace);
            }
            enlace.href = datos.cssUrl;
        }

        main.innerHTML = datos.html;

        // Ejecutamos los scripts internos de la vista Mi Progreso
        main.querySelectorAll('script').forEach(scriptViejo => {
            const scriptNuevo = document.createElement('script');
            scriptNuevo.text = scriptViejo.text;
            document.body.appendChild(scriptNuevo).remove();
        });

        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error al abrir Mi Progreso:', error);
        alert('No se pudo cargar la vista de Mi progreso.');
    }
}


/* =========================================
   INICIO PRINCIPAL Y CIERRE DE SESIÓN
========================================= */

function mostrarInicioPrincipal(limpiarHistorial = false) {
    const main = document.getElementById('main-content');

    if (!main) return;

    // Se elimina el contenido de autenticación.
    // Tu script principal podrá reconstruir o cargar la portada.
    main.innerHTML = `
        <section class="hero">
            <iframe id="frame-fondo" class="fondo-animado"></iframe>
            <div class="hero-content">
                <h1>Explora la Variable Compleja</h1>
                <p>
                    Aprende, visualiza y domina los conceptos avanzados
                    de variable compleja mediante simulaciones interactivas.
                </p>
            </div>
        </section>
    `;

    vistaAuthActual = null;

    if (limpiarHistorial) {
        history.replaceState(
            { pagina: 'principal', autenticado: false },
            '',
            location.pathname + location.search
        );
    }

    actualizarNavegacionUsuario();
    configurarNavegacionAutenticacion();

    // Reutiliza el mecanismo que ya carga el fondo desde la API.
    if (typeof cargarConfiguracion === 'function') {
        cargarConfiguracion();
    } else {
        const frame = document.getElementById('frame-fondo');
        if (frame) {
            frame.src = window.COMPLEXLAB_API + '/fondos/complejo.html';
        }
    }

    window.scrollTo(0, 0);
}

function cerrarSesion() {
    limpiarUsuarioActual();

    // No se conserva una entrada de historial a una vista de login.
    history.replaceState(
        { pagina: 'principal', autenticado: false },
        '',
        location.pathname + location.search
    );

    mostrarInicioPrincipal(false);
}

/* =========================================
   BOTÓN ATRÁS DEL NAVEGADOR
========================================= */

window.addEventListener('popstate', () => {
    if (obtenerUsuarioActual()) {
        mostrarInicioPrincipal(false);
        return;
    }

    // Si se vuelve a una vista privada o de autenticación tras cerrar
    // sesión, se fuerza el regreso a la portada pública.
    if (vistaAuthActual || location.hash === '#inicio-sesion' ||
        location.hash === '#registro') {
        history.replaceState(
            { pagina: 'principal', autenticado: false },
            '',
            location.pathname + location.search
        );

        mostrarInicioPrincipal(false);
    }
});

/* =========================================
   INICIALIZACIÓN
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    configurarNavegacionAutenticacion();
    actualizarNavegacionUsuario();

    // Si el usuario recarga mientras está en una vista de autenticación,
    // no se muestra el formulario cuando ya existe sesión.
    if (obtenerUsuarioActual()) {
        mostrarInicioPrincipal(false);
    }
});
