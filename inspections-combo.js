// ============================================================================
//  COMBOBOX REUTILIZABLE  (modulo de inspecciones)
// ============================================================================
//  Sustituye a los <input type="number"> que obligaban a escribir ids a mano.
//
//  No es una libreria nueva: es el mismo estilo del proyecto (mismo modal,
//  mismas clases, mismos colores) aplicado a un campo de texto con busqueda.
//
//  Acepta lista de objetos { id, label, sub }. Guarda el id real seleccionado
//  en el input oculto que se le pase, y escribe el nombre en el campo visible.
//
//  Permite escribir algo que no esta en la lista: es el caso de un inspector
//  externo o un responsable que no es un empleado. En ese caso el id queda
//  vacio y se marca el campo, para que el backend sepa que es texto libre.
(function () {
    'use strict';

    const abiertos = new Map();     // id del combo -> elemento de la lista
    let contador = 0;

    // -----------------------------------------------------------------------
    //  Construye un combobox dentro de un contenedor.
    // -----------------------------------------------------------------------
    //  opciones: [{ id, label, sub, meta }]
    function crear(contenedor, opciones, config) {
        config = config || {};
        const id = 'cbx-' + (++contador);
        const oculto = config.oculto || null;
        const placeholder = config.placeholder || 'Buscar…';
        const permiteLibre = config.permiteLibre !== false;

        contenedor.innerHTML =
            '<div class="insp-cbx" data-cbx="' + id + '">' +
                '<input type="text" class="insp-cbx-text" autocomplete="off" role="combobox"' +
                    ' aria-expanded="false" aria-autocomplete="list"' +
                    ' placeholder="' + escAttr(placeholder) + '" />' +
                '<div class="insp-cbx-list" role="listbox" hidden></div>' +
            '</div>' +
            '<div class="insp-cbx-hint" hidden></div>';

        const raiz  = contenedor.querySelector('.insp-cbx');
        const texto = contenedor.querySelector('.insp-cbx-text');
        const lista = contenedor.querySelector('.insp-cbx-list');
        const hint  = contenedor.querySelector('.insp-cbx-hint');
        if (oculto) oculto.value = '';

        let todas = opciones || [];
        let seleccion = null;

        // --- Pintar las opciones que encajan con lo que se escribe ----------
        function filtrar() {
            const q = texto.value.trim().toLowerCase();
            let vis = todas;
            if (q) {
                vis = todas.filter(o =>
                    String(o.label).toLowerCase().includes(q) ||
                    (o.sub && String(o.sub).toLowerCase().includes(q)) ||
                    (o.meta && String(o.meta).toLowerCase().includes(q))
                );
            }
            if (!vis.length) {
                lista.innerHTML = permiteLibre
                    ? '<div class="insp-cbx-none">Sin coincidencias. Se guardará como texto libre.</div>'
                    : '<div class="insp-cbx-none">Sin coincidencias</div>';
            } else {
                lista.innerHTML = vis.slice(0, 60).map(o =>
                    '<div class="insp-cbx-opt" role="option" data-id="' + escAttr(o.id == null ? '' : o.id) + '">' +
                        '<span class="insp-cbx-opt-label">' + esc(o.label) + '</span>' +
                        (o.sub ? '<span class="insp-cbx-opt-sub">' + esc(o.sub) + '</span>' : '') +
                    '</div>'
                ).join('');
            }
            lista.hidden = false;
            texto.setAttribute('aria-expanded', 'true');
        }

        function cerrar() {
            lista.hidden = true;
            texto.setAttribute('aria-expanded', 'false');
            abiertos.delete(id);
        }

        function elegir(idOpt) {
            const o = todas.find(x => String(x.id) === String(idOpt));
            if (!o) return;
            seleccion = o;
            texto.value = o.label;
            if (oculto) oculto.value = o.id == null ? '' : o.id;
            hint.hidden = true;
            cerrar();
            texto.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function textoLibre(valor) {
            seleccion = null;
            if (oculto) oculto.value = '';
            hint.hidden = !valor;
            hint.innerHTML = valor
                ? 'Se guardará como nombre: <strong>' + esc(valor) + '</strong>'
                : '';
            texto.dispatchEvent(new Event('change', { bubbles: true }));
        }

        texto.addEventListener('focus', () => { filtrar(); abiertos.set(id, raiz); });
        texto.addEventListener('input', () => {
            // Si el texto ya no coincide con lo elegido, se trata como escrito a mano.
            if (seleccion && texto.value !== seleccion.label) seleccion = null;
            if (oculto) oculto.value = '';
            filtrar();
        });
        texto.addEventListener('blur', () => {
            // Un poco de margen para que el clic en la opción cuente como clic.
            setTimeout(() => {
                if (seleccion) cerrar();
                else { textLibre(texto.value.trim()); cerrar(); }
            }, 140);
        });
        texto.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') { cerrar(); return; }
            if (ev.key === 'Enter') {
                ev.preventDefault();
                const primera = lista.querySelector('.insp-cbx-opt');
                if (primera) elegir(primera.dataset.id);
                else textLibre(texto.value.trim());
            }
        });
        lista.addEventListener('mousedown', (ev) => {
            const opt = ev.target.closest('.insp-cbx-opt');
            if (opt) { ev.preventDefault(); elegir(opt.dataset.id); }
        });

        // API minima para que el resto del modulo lo use.
        raiz._inspCbx = {
            setValue(idBuscado, etiqueta) {
                const o = todas.find(x => String(x.id) === String(idBuscado));
                seleccion = o || null;
                texto.value = o ? o.label : (etiqueta || '');
                if (oculto) oculto.value = o ? (o.id == null ? '' : o.id) : '';
                hint.hidden = true;
            },
            getTexto() { return texto.value.trim(); },
            recargar(nuevas) { todas = nuevas || []; },
            limpiar() { texto.value = ''; seleccion = null; if (oculto) oculto.value = ''; hint.hidden = true; }
        };
        return raiz._inspCbx;
    }

    // --- utilidades ---------------------------------------------------------
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function escAttr(v) { return esc(v); }

    // Cierra cualquier combobox abierto al pulsar fuera.
    document.addEventListener('click', (ev) => {
        for (const [id, raiz] of abiertos) {
            if (!raiz.contains(ev.target)) {
                const lista = raiz.querySelector('.insp-cbx-list');
                const texto = raiz.querySelector('.insp-cbx-text');
                if (lista) lista.hidden = true;
                if (texto) texto.setAttribute('aria-expanded', 'false');
                abiertos.delete(id);
            }
        }
    });

    window.InspectorCombo = { crear };
})();