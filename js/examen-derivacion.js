(function () {
    "use strict";

    const TOTAL_PREGUNTAS = 10;
    let preguntas = [];
    let examenEvaluado = false;
    let puntuacion = 0;

    function aleatorio(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function elegir(arreglo) {
        return arreglo[aleatorio(0, arreglo.length - 1)];
    }

    function mezclar(arreglo) {
        return arreglo
            .map(valor => ({ valor, orden: Math.random() }))
            .sort((a, b) => a.orden - b.orden)
            .map(el => el.valor);
    }

    function sinDuplicados(arreglo) {
        return [...new Set(arreglo)];
    }

    function escaparHTML(texto) {
        return String(texto)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizar(texto) {
        return String(texto).replace(/\s+/g, "").replace(/−/g, "-");
    }

    function complejo(a, b) {
        let strA = String(a);
        let strB = String(b);
        if (strA === "0" && strB === "0") return "0";
        if (strB === "0") return strA;
        if (strA === "0") {
            if (strB === "1") return "i";
            if (strB === "-1") return "-i";
            return `${strB}i`;
        }
        const esNegativo = strB.startsWith("-");
        const signo = esNegativo ? "-" : "+";
        const valor = esNegativo ? strB.substring(1) : strB;
        const parteImaginaria = valor === "1" ? "i" : `${valor}i`;
        return `${strA} ${signo} ${parteImaginaria}`;
    }

    function generarDerivadaPolinomioPunto() {
        const a = elegir([-3, -2, 2, 3, 4]);
        const b = elegir([-5, -4, -3, 3, 4, 5]);
        const c = aleatorio(-6, 6);
        const x0 = elegir([-2, -1, 1, 2]);
        const y0 = elegir([-2, -1, 1, 2]);

        const real = 2 * a * x0 + b;
        const imag = 2 * a * y0;
        const correcta = complejo(real, imag);

        let opciones = sinDuplicados([
            correcta,
            complejo(a * x0 + b, a * y0),
            complejo(2 * a * x0 + b + c, 2 * a * y0),
            complejo(2 * a * x0 - b, -2 * a * y0)
        ]);

        while (opciones.length < 4) {
            opciones.push(complejo(real + aleatorio(-4, 4), imag + elegir([-2, 2, 4])));
            opciones = sinDuplicados(opciones);
        }

        const signoB = b >= 0 ? `+ ${b}z` : `- ${Math.abs(b)}z`;
        const signoC = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;

        return {
            tipo: "Bases de Derivación Compleja",
            enunciado: `Calcula f'(z₀) para z₀ = ${complejo(x0, y0)} dada la función:`,
            expresion: `f(z) = ${a}z² ${signoB} ${signoC}`,
            correcta,
            opciones: mezclar(opciones)
        };
    }

    function generarConceptoDerivabilidad() {
        const banco = [
            {
                enunciado: "¿Cuál de las siguientes funciones NO es derivable en ningún punto del plano complejo ℂ?",
                expresion: "Selecciona la función no compleja-diferenciable:",
                correcta: "f(z) = z̄ (conjugado de z)",
                opciones: [
                    "f(z) = z̄ (conjugado de z)",
                    "f(z) = z³ - 4iz + 1",
                    "f(z) = e^(2z) + cos(z)",
                    "f(z) = (z + 1) / (z - 2) para z ≠ 2"
                ]
            },
            {
                enunciado: "¿En qué puntos del plano complejo es derivable la función módulo al cuadrado?",
                expresion: "f(z) = |z|² = z · z̄",
                correcta: "Únicamente en z₀ = 0 (con f'(0) = 0)",
                opciones: [
                    "Únicamente en z₀ = 0 (con f'(0) = 0)",
                    "En todo el plano complejo ℂ",
                    "Sobre todo el eje real y = 0",
                    "En ningún punto de ℂ"
                ]
            },
            {
                enunciado: "Para que exista f'(z₀) en el plano complejo, el límite del cociente incremental cuando Δz → 0 debe:",
                expresion: "lim (Δz → 0) [f(z₀ + Δz) - f(z₀)] / Δz",
                correcta: "Ser idéntico por cualquier trayectoria de acercamiento",
                opciones: [
                    "Ser idéntico por cualquier trayectoria de acercamiento",
                    "Existir únicamente sobre el eje real Δx → 0",
                    "Ser siempre un número real puro",
                    "Tener módulo igual a 1"
                ]
            }
        ];

        const item = elegir(banco);
        return {
            tipo: "Bases y Definición de Derivada",
            enunciado: item.enunciado,
            expresion: item.expresion,
            correcta: item.correcta,
            opciones: mezclar(item.opciones)
        };
    }
    function generarReglaCadenaTrascendentes() {
        const k = elegir([2, 3, 4, 5]);
        const tipoFunc = aleatorio(1, 3);

        if (tipoFunc === 1) {
            const correcta = `${2 * k}iz · e^(i${k}z²)`;
            const opciones = mezclar([
                correcta,
                `${k}iz · e^(i${k}z²)`,
                `${2 * k}z · e^(i${k}z²)`,
                `i${k}z² · e^(i${k}z²)`
            ]);
            return {
                tipo: "Derivación Nivel Medio (Regla de la Cadena)",
                enunciado: "Obtén la derivada f'(z) de la siguiente función exponencial:",
                expresion: `f(z) = e^(i${k}z²)`,
                correcta,
                opciones
            };
        } else if (tipoFunc === 2) {
            const correcta = `-${k}sen(${k}z) + i${k}cos(${k}z)`;
            const opciones = mezclar([
                correcta,
                `${k}sen(${k}z) - i${k}cos(${k}z)`,
                `-sen(${k}z) + icos(${k}z)`,
                `${k}cos(${k}z) - i${k}sen(${k}z)`
            ]);
            return {
                tipo: "Derivación Nivel Medio (Trigonométricas)",
                enunciado: "Calcula la derivada f'(z) aplicando reglas trigonométricas:",
                expresion: `f(z) = cos(${k}z) + i·sen(${k}z)`,
                correcta,
                opciones
            };
        } else {
            const correcta = `${k}z^${k - 1} / (z^${k} + 1)`;
            const opciones = mezclar([
                correcta,
                `1 / (z^${k} + 1)`,
                `${k}z^${k} / (z^${k} + 1)`,
                `z^${k - 1} / (z^${k} + 1)`
            ]);
            return {
                tipo: "Derivación Nivel Medio (Logaritmo Principal)",
                enunciado: "Calcula f'(z) en el dominio donde está definida la rama principal:",
                expresion: `f(z) = Log(z^${k} + 1)`,
                correcta,
                opciones
            };
        }
    }

    function generarCauchyRiemannConstante() {
        const a = elegir([-4, -3, -2, 2, 3, 4]);
        const b = elegir([-5, -3, -2, 2, 3, 5]);
        const c = -b;
        const kCorrecta = a;

        const correcta = `k = ${kCorrecta}`;
        let opciones = sinDuplicados([
            correcta,
            `k = ${-kCorrecta}`,
            `k = ${b}`,
            `k = ${c}`
        ]);

        while (opciones.length < 4) {
            opciones.push(`k = ${aleatorio(-8, 8)}`);
            opciones = sinDuplicados(opciones);
        }

        const signoB = b >= 0 ? `+ ${b}y` : `- ${Math.abs(b)}y`;
        const signoC = c >= 0 ? `${c}x` : `-${Math.abs(c)}x`;

        return {
            tipo: "Ecuaciones de Cauchy-Riemann",
            enunciado: "Determina el valor de k para que f(z) sea analítica en todo ℂ:",
            expresion: `f(x + iy) = (${a}x ${signoB}) + i(${signoC} + ky)`,
            correcta,
            opciones: mezclar(opciones)
        };
    }

    function generarDerivadaDesdeUV() {
        const a = elegir([2, 3, 4]);
        const x0 = elegir([-2, -1, 1, 2]);
        const y0 = elegir([-2, -1, 1, 2]);

        const ux = 2 * a * x0;
        const vx = 2 * a * y0;
        const correcta = complejo(ux, vx);

        let opciones = sinDuplicados([
            correcta,
            complejo(ux, -vx),
            complejo(vx, ux),
            complejo(a * x0, a * y0)
        ]);

        while (opciones.length < 4) {
            opciones.push(complejo(ux + elegir([-2, 2]), vx + elegir([-2, 2])));
            opciones = sinDuplicados(opciones);
        }

        return {
            tipo: "Analiticidad y Fórmula f'(z) = uₓ + ivₓ",
            enunciado: `Dada la función analítica f(x+iy) = ${a}(x² - y²) + i(${2 * a}xy), calcula f'(${complejo(x0, y0)}):`,
            expresion: `u(x,y) = ${a}(x² - y²),   v(x,y) = ${2 * a}xy`,
            correcta,
            opciones: mezclar(opciones)
        };
    }

    function generarLaplaceYArmonica() {
        const caso = aleatorio(1, 2);

        if (caso === 1) {
            const a = elegir([2, 3, 4, 5]);
            const correcta = `u(x, y) = ${a}x² - ${a}y² + 2x`;
            const opciones = mezclar([
                correcta,
                `u(x, y) = ${a}x² + ${a}y²`,
                `u(x, y) = x³ + y³`,
                `u(x, y) = e^(x) + e^(y)`
            ]);
            return {
                tipo: "Ecuación de Laplace (∇²u = 0)",
                enunciado: "¿Cuál de las siguientes funciones satisface la ecuación de Laplace y es armónica en ℝ²?",
                expresion: "∂²u/∂x² + ∂²u/∂y² = 0",
                correcta,
                opciones
            };
        } else {
            const k = elegir([2, 4, 6, 8]);
            const mitad = k / 2;
            const correcta = `v(x, y) = ${mitad}y² - ${mitad}x² + C`;
            const opciones = mezclar([
                correcta,
                `v(x, y) = ${mitad}x² - ${mitad}y² + C`,
                `v(x, y) = ${k}x² + ${k}y² + C`,
                `v(x, y) = -${mitad}y² - ${mitad}x² + C`
            ]);
            return {
                tipo: "Función Armónica Conjugada",
                enunciado: `Si u(x, y) = ${k}xy es la parte real de una función analítica, ¿cuál es su armónica conjugada v(x, y)?`,
                expresion: `u(x, y) = ${k}xy`,
                correcta,
                opciones
            };
        }
    }
    function generarExamen() {
        const generadores = [
            generarDerivadaPolinomioPunto,
            generarConceptoDerivabilidad,
            generarReglaCadenaTrascendentes,
            generarReglaCadenaTrascendentes,
            generarCauchyRiemannConstante,
            generarCauchyRiemannConstante,
            generarDerivadaDesdeUV,
            generarDerivadaDesdeUV,
            generarLaplaceYArmonica,
            generarLaplaceYArmonica
        ];

        preguntas = mezclar(generadores.map(gen => gen()));
        examenEvaluado = false;
        puntuacion = 0;
        renderizarExamen();
    }

    function renderizarExamen() {
        const contenedor = document.getElementById("contenedorPreguntas");
        contenedor.innerHTML = "";

        preguntas.forEach((pregunta, indice) => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta-pregunta";
            tarjeta.dataset.numero = indice;

            const opciones = pregunta.opciones.map((opcion, idxOp) => {
                const letra = String.fromCharCode(65 + idxOp);
                return `
                    <label class="opcion-respuesta">
                        <input type="radio" name="pregunta-${indice}" value="${escaparHTML(opcion)}">
                        <span class="letra-opcion">${letra}</span>
                        <span>${escaparHTML(opcion)}</span>
                    </label>
                `;
            }).join("");

            tarjeta.innerHTML = `
                <div>
                    <span class="numero-pregunta">${indice + 1}</span>
                    <span class="texto-pregunta">${escaparHTML(pregunta.enunciado)}</span>
                </div>
                <div class="tipo-pregunta">${escaparHTML(pregunta.tipo)}</div>
                <div class="expresion-matematica">${escaparHTML(pregunta.expresion)}</div>
                <div class="opciones-pregunta">${opciones}</div>
            `;
            contenedor.appendChild(tarjeta);
        });

        agregarEventosOpciones();
        actualizarProgreso();
    }

    function agregarEventosOpciones() {
        document.querySelectorAll(".opcion-respuesta").forEach(opcion => {
            opcion.addEventListener("click", () => {
                if (examenEvaluado) return;
                const tarjeta = opcion.closest(".tarjeta-pregunta");
                tarjeta.querySelectorAll(".opcion-respuesta").forEach(otra => otra.classList.remove("seleccionada"));
                opcion.classList.add("seleccionada");
                opcion.querySelector("input").checked = true;
                actualizarProgreso();
            });
        });
    }

    function actualizarProgreso() {
        let respondidas = 0;
        for (let i = 0; i < TOTAL_PREGUNTAS; i++) {
            if (document.querySelector(`input[name="pregunta-${i}"]:checked`)) respondidas++;
        }
        const porcentaje = (respondidas / TOTAL_PREGUNTAS) * 100;
        document.getElementById("contadorPregunta").textContent = `${respondidas} de ${TOTAL_PREGUNTAS} respondidas`;
        document.getElementById("barraProgreso").style.width = `${porcentaje}%`;
    }

    function evaluarExamen() {
        if (examenEvaluado) return;
        let sinResponder = 0;
        preguntas.forEach((_, i) => {
            if (!document.querySelector(`input[name="pregunta-${i}"]:checked`)) sinResponder++;
        });
        if (sinResponder > 0) {
            alert(`Aún tienes ${sinResponder} pregunta(s) sin responder.`);
            return;
        }

        puntuacion = 0;
        preguntas.forEach((pregunta, indice) => {
            const tarjeta = document.querySelector(`.tarjeta-pregunta[data-numero="${indice}"]`);
            const seleccionada = tarjeta.querySelector("input:checked");
            tarjeta.querySelectorAll(".opcion-respuesta").forEach(opcion => {
                const valor = opcion.querySelector("input").value;
                opcion.classList.remove("correcta", "incorrecta");
                if (normalizar(valor) === normalizar(pregunta.correcta)) {
                    opcion.classList.add("correcta");
                }
            });

            if (normalizar(seleccionada.value) === normalizar(pregunta.correcta)) {
                puntuacion++;
            } else {
                seleccionada.closest(".opcion-respuesta").classList.add("incorrecta");
            }
        });

        examenEvaluado = true;
        document.querySelectorAll(".opcion-respuesta input").forEach(input => input.disabled = true);
        mostrarResultado();
    }

    function mostrarResultado() {
        const modal = document.getElementById("modalResultado");
        const contenido = document.getElementById("resultadoContenido");
        const puntuacionElemento = document.getElementById("puntuacionFinal");
        const mensaje = document.getElementById("mensajeResultado");

        contenido.classList.remove("resultado-rojo", "resultado-amarillo", "resultado-verde");
        if (puntuacion < 6) {
            contenido.classList.add("resultado-rojo");
            mensaje.textContent = "Necesitas reforzar las ecuaciones de Cauchy-Riemann y reglas de derivación.";
        } else if (puntuacion <= 7) {
            contenido.classList.add("resultado-amarillo");
            mensaje.textContent = "Buen trabajo. Repasa los detalles de analiticidad y funciones armónicas.";
        } else {
            contenido.classList.add("resultado-verde");
            mensaje.textContent = "¡Excelente trabajo! Dominas la Derivación en Variable Compleja.";
        }

        puntuacionElemento.textContent = `${puntuacion}/10`;
        modal.classList.add("visible");
    }

    function mostrarRespuestas() {
        const resumen = document.getElementById("resumenRespuestas");
        resumen.innerHTML = "";
        preguntas.forEach((pregunta, indice) => {
            const tarjeta = document.querySelector(`.tarjeta-pregunta[data-numero="${indice}"]`);
            const seleccionada = tarjeta.querySelector("input:checked");
            const respuestaUsuario = seleccionada ? seleccionada.value : "Sin responder";
            const correcta = seleccionada && normalizar(seleccionada.value) === normalizar(pregunta.correcta);

            const bloque = document.createElement("div");
            bloque.className = correcta ? "resumen-pregunta correcta" : "resumen-pregunta incorrecta";
            bloque.innerHTML = `
                <h4>Pregunta ${indice + 1}</h4>
                <p><strong>Tipo:</strong> ${escaparHTML(pregunta.tipo)}</p>
                <p>${escaparHTML(pregunta.enunciado)}</p>
                <div class="expresion-matematica">${escaparHTML(pregunta.expresion)}</div>
                <p class="${correcta ? "respuesta-correcta" : "respuesta-usuario"}">Tu respuesta: ${escaparHTML(respuestaUsuario)}</p>
                <p class="respuesta-correcta">Respuesta correcta: ${escaparHTML(pregunta.correcta)}</p>
            `;
            resumen.appendChild(bloque);
        });
        document.getElementById("modalResultado").classList.remove("visible");
        document.getElementById("modalRespuestas").classList.add("visible");
    }

    function regresarResultado() {
        document.getElementById("modalRespuestas").classList.remove("visible");
        document.getElementById("modalResultado").classList.add("visible");
    }

    function nuevoExamen() {
        document.getElementById("modalResultado").classList.remove("visible");
        generarExamen();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function regresarDerivacion() {
        try {
            const respuesta = await fetch((window.COMPLEXLAB_API || "") + "/api/variable-compleja/derivacion");
            const datos = await respuesta.json();
            const heroContent = document.querySelector(".hero-content");

            const cssAnterior = document.getElementById("css-dinamico");
            if (cssAnterior) cssAnterior.remove();

            const css = document.createElement("link");
            css.id = "css-dinamico";
            css.rel = "stylesheet";
            css.href = datos.cssUrl;
            document.head.appendChild(css);

            heroContent.innerHTML = datos.html;
            heroContent.querySelectorAll("script").forEach(scriptViejo => {
                const scriptNuevo = document.createElement("script");
                scriptNuevo.text = scriptViejo.text;
                document.body.appendChild(scriptNuevo);
                scriptNuevo.remove();
            });
        } catch (error) {
            console.error("Error al regresar a Derivación:", error);
        }
    }

    document.getElementById("btnEvaluar").addEventListener("click", evaluarExamen);
    document.getElementById("btnVerRespuestas").addEventListener("click", mostrarRespuestas);
    document.getElementById("btnVolverIntentar").addEventListener("click", nuevoExamen);
    document.getElementById("btnGuardarPuntuacion").addEventListener("click", () => alert("Función para guardar puntuación pendiente."));
    document.getElementById("btnCerrarRespuestas").addEventListener("click", regresarResultado);
    document.getElementById("btnRegresarResultado").addEventListener("click", regresarResultado);
    document.getElementById("btnRegresarDerivacion").addEventListener("click", regresarDerivacion);

    generarExamen();
})();
