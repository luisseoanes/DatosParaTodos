// ============================================================
//  DatosParaTodos — Fetcher robusto para medata.gov.co
//  Estrategias: directo → proxy CORS → fallback sintético
// ============================================================

// ── ESTRATEGIA DE FETCH ───────────────────────────────────
// medata.gov.co (Socrata) envía cabeceras CORS en producción.
// Si el browser bloquea por CORS, tu back debe exponer:
//   GET /api/proxy?url=<encoded_url>
// que agrega los headers adecuados y retorna el JSON.

async function fetchDataset(dataset, limit = 1000) {
    const url = dataset.endpoint || buildSocrataUrl(dataset.resourceId, limit);
    const proxyUrl = CONFIG.corsProxy ? `${CONFIG.corsProxy}${encodeURIComponent(url)}` : null;

    // Intento 1: directo (funciona si estás en el mismo dominio o el servidor tiene CORS)
    try {
        const res = await fetchWithTimeout(url, 8000, {
            headers: {
                'Accept': 'application/json',
                'X-App-Token': '', // añade aquí un Socrata app token si tienes
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('Respuesta vacía');
        const data = sanitizeRows(raw);
        return { ok: true, data, total: data.length, source: 'api_directa', synthetic: false };
    } catch (directErr) {
        // Intento 2: a través del proxy CORS del back
        if (proxyUrl) {
            try {
                const res2 = await fetchWithTimeout(proxyUrl, 10000, { headers: { 'Accept': 'application/json' } });
                if (!res2.ok) throw new Error(`Proxy HTTP ${res2.status}`);
                const raw2 = await res2.json();
                if (!Array.isArray(raw2) || raw2.length === 0) throw new Error('Proxy vacío');
                const data2 = sanitizeRows(raw2);
                return { ok: true, data: data2, total: data2.length, source: 'proxy_cors', synthetic: false };
            } catch (proxyErr) {
                console.warn(`[DPT] Proxy falló: ${proxyErr.message}`);
            }
        }

        // Intento 3: datos sintéticos con estructura del dataset real
        console.warn(`[DPT] API ${dataset.resourceId} no disponible (${directErr.message}). Usando datos de demostración.`);
        const synthetic = generateSyntheticData(dataset, Math.min(limit, 400));
        return {
            ok: false,
            data: synthetic,
            total: synthetic.length,
            source: 'sintetico',
            synthetic: true,
            error: directErr.message,
        };
    }
}

// ── HELPERS ───────────────────────────────────────────────
function buildSocrataUrl(resourceId, limit = 1000) {
    return `${CONFIG.medataBase}/${resourceId}.json?$limit=${limit}`;
}

function fetchWithTimeout(url, ms, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

// Limpia valores problemáticos que vienen de la API Socrata
function sanitizeRows(rows) {
    return rows.map(row => {
        const clean = {};
        for (const [k, v] of Object.entries(row)) {
            // Ignorar campos de metadatos Socrata
            if (k.startsWith(':')) continue;
            // Convertir strings vacíos y 'null' a null
            if (v === '' || v === 'null' || v === 'NULL' || v === 'N/A') { clean[k] = null; continue; }
            // Si parece número, parsear
            if (typeof v === 'string' && v.trim() !== '' && !isNaN(parseFloat(v)) && isFinite(v)) {
                clean[k] = parseFloat(v);
            } else {
                clean[k] = v;
            }
        }
        return clean;
    }).filter(row => Object.keys(row).length > 0);
}

// ── GENERADOR SINTÉTICO ───────────────────────────────────
// Genera datos realistas con la estructura exacta de cada dataset
// para que el pipeline de limpieza siempre tenga algo que mostrar.

function generateSyntheticData(dataset, n = 300) {
    // Datos específicos por dataset para mayor realismo
    const MEDELLIN_DATA = {
        comunas: ['Popular', 'Santa Cruz', 'Manrique', 'Aranjuez', 'Castilla', 'Doce de Octubre',
            'Robledo', 'Villa Hermosa', 'Buenos Aires', 'La Candelaria', 'Laureles-Estadio',
            'La América', 'San Javier', 'El Poblado', 'Guayabal', 'Belén'],
        barrios: ['El Pinar', 'Las Brisas', 'Andalucía', 'La Francia', 'Pedregal', 'Florencia',
            'Manrique Oriental', 'Bermejal', 'Villa del Socorro', 'Niquitao', 'Velodromo',
            'Estadio', 'San Javier', 'Manila', 'El Poblado', 'Laureles', 'Belén Rincón'],
        municipios_amva: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella',
            'Caldas', 'Copacabana', 'Girardota', 'Barbosa'],
        clases_accidente: ['Choque', 'Atropello', 'Caída de ocupante', 'Volcamiento', 'Incendio', 'Otro'],
        tipos_vehiculo: ['Automóvil', 'Motocicleta', 'Bus', 'Camión', 'Bicicleta', 'Peatón'],
        enfermedades: ['Dengue', 'Malaria', 'Hepatitis A', 'Tuberculosis', 'VIH', 'COVID-19',
            'EDA', 'ERA', 'Varicela', 'Sarampión'],
        biologicos_pai: ['DPT', 'Polio', 'BCG', 'Triple viral', 'Varicela', 'Influenza', 'VPH',
            'Pentavalente', 'Rotavirus', 'Neumococo'],
        tipos_hurto: ['Hurto a persona', 'Hurto celular', 'Hurto de moto', 'Hurto vehículo',
            'Hurto a establecimiento', 'Piratería terrestre'],
        modalidades_hurto: ['Cosquilleo', 'Raponazo', 'Fleteo', 'Atraco', 'Descuido', 'Engaño'],
        causa_muerte: ['Enfermedades cardíacas', 'Violencia', 'Accidentes', 'Cáncer',
            'Enfermedades respiratorias', 'Diabetes', 'ECV'],
        actividad_ciiu: ['4711 - Comercio al por menor', '5611 - Restaurantes', '8610 - Hospitales',
            '6201 - Software', '8531 - Educación básica', '1811 - Imprenta',
            '4120 - Construcción edificios', '4921 - Transporte urbano'],
        grupos_alimento: ['Tubérculos y plátanos', 'Frutas', 'Verduras y hortalizas',
            'Carnes y derivados', 'Cereales y leguminosas', 'Lácteos'],
        estaciones_siata: ['Ciudadela Nuevo Occidente', 'Guayabal', 'Oleoductos', 'Villa del Socorro',
            'ISA Itagüí', 'San Antonio de Prado', 'Politécnico Jaime Isaza'],
        tipo_ips: ['Hospital', 'Clínica', 'Centro de Salud', 'Consultorio', 'Laboratorio', 'IPS Ambulatoria'],
        nivel_atencion: ['Nivel I', 'Nivel II', 'Nivel III', 'Nivel IV'],
        tipo_espacio: ['Parque metropolitano', 'Parque zonal', 'Parque de barrio', 'Parque lineal', 'Plaza pública'],
        tipo_equipamiento: ['Centro comunitario', 'Biblioteca', 'Casa de cultura', 'UVA', 'CAI',
            'Hogar infantil', 'Sede JAC', 'Estación de bomberos'],
    };

    const rows = [];
    const now = new Date('2026-03-24');

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randNum = (min, max, dec = 0) => {
        const v = min + Math.random() * (max - min);
        return dec ? +v.toFixed(dec) : Math.round(v);
    };
    const randDate = (daysBack = 365) => {
        const d = new Date(now);
        d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
        return d.toISOString().split('T')[0];
    };

    for (let i = 0; i < n; i++) {
        const row = {};
        const isOutlier = Math.random() < 0.04;
        const isNull = (pct = 0.06) => Math.random() < pct;

        // Columnas numéricas
        (dataset.numericCols || []).forEach(col => {
            const ranges = {
                num_muertos: [0, 3, 0],
                num_heridos: [0, 8, 0],
                valor_multa: [100000, 1500000, 0],
                cantidad: [1, 50, 0],
                validaciones: [1000, 45000, 0],
                pasajeros: [800, 42000, 0],
                año_modelo: [1990, 2025, 0],
                cilindraje: [50, 3000, 0],
                casos: [1, 200, 0],
                fallecidos: [0, 5, 0],
                hospitalizados: [0, 20, 0],
                cobertura_pct: [60, 99, 1],
                dosis_aplicadas: [100, 5000, 0],
                poblacion_objetivo: [200, 8000, 0],
                defunciones: [1, 150, 0],
                tasa_mortalidad: [0.5, 85, 2],
                años_vida_perdidos: [10, 500, 0],
                capacidad_camas: [5, 400, 0],
                num_servicios: [1, 60, 0],
                personal_ocupado: [1, 150, 0],
                area_m2: [20, 800, 0],
                años_operacion: [1, 40, 0],
                precio_min: [500, 15000, 0],
                precio_max: [800, 25000, 0],
                precio_promedio: [650, 20000, 0],
                area_construida_m2: [50, 5000, 0],
                valor_obra: [50000000, 5000000000, 0],
                num_pisos: [1, 35, 0],
                num_unidades: [1, 200, 0],
                tasa_desempleo: [6, 18, 1],
                tasa_ocupacion: [45, 72, 1],
                tasa_informalidad: [30, 55, 1],
                poblacion_ocupada: [50000, 1200000, 0],
                pm25: [5, 120, 1],
                pm10: [10, 180, 1],
                o3: [15, 80, 1],
                no2: [5, 60, 1],
                ica: [1, 200, 0],
                toneladas_recolectadas: [100, 3500, 1],
                porcentaje_aprovechamiento: [5, 35, 1],
                toneladas_recicladas: [10, 500, 1],
                altura_m: [2, 25, 1],
                diametro_cm: [5, 120, 1],
                copa_m: [1, 15, 1],
                nivel_db: [45, 95, 1],
                limite_norma_db: [55, 75, 0],
                exceso_db: [0, 20, 1],
                visitantes_mes: [500, 15000, 0],
                aforo: [100, 800, 0],
                prestamos_mes: [200, 3000, 0],
                m2_por_habitante: [0.5, 18, 2],
                area_total_m2: [500, 150000, 0],
                poblacion: [2000, 80000, 0],
                deficit_m2: [0, 500000, 0],
                usuarios: [1000, 80000, 0],
                consumo_kwh_promedio: [80, 600, 1],
                tarifa: [200, 900, 0],
                num_cortes: [0, 500, 0],
                cobertura_acueducto_pct: [90, 99.9, 1],
                cobertura_alcantarillado_pct: [85, 99, 1],
                continuidad_horas: [18, 24, 1],
                suscriptores_fijos: [500, 50000, 0],
                penetracion_pct: [30, 95, 1],
                velocidad_bajada_mbps: [5, 300, 1],
                velocidad_subida_mbps: [2, 150, 1],
                usuarios_residenciales: [500, 60000, 0],
                consumo_m3: [5, 25, 1],
                tarifa_cargo_fijo: [3000, 12000, 0],
                num_sedes: [1, 8, 0],
                num_grupos: [5, 60, 0],
                total_matriculados: [100, 3500, 0],
                hombres: [50, 1800, 0],
                mujeres: [50, 1800, 0],
                extra_edad: [0, 150, 0],
                tasa_desercion_pct: [0.5, 8, 2],
                num_desertores: [5, 200, 0],
                matricula_inicial: [100, 3500, 0],
                puntaje_matematicas: [30, 80, 1],
                puntaje_lectura: [35, 85, 1],
                puntaje_ciencias: [30, 80, 1],
                puntaje_ingles: [25, 85, 1],
                puntaje_global: [150, 450, 1],
                num_canchas: [0, 8, 0],
                num_juegos: [0, 12, 0],
                num_beneficiarios: [50, 5000, 0],
                puntaje_global: [200, 420, 1],
                valor_bien: [0, 3000000, 0],
                dias_incapacidad: [0, 30, 0],
                casos_vif: [1, 50, 0],
                victimas_mujeres: [0, 40, 0],
                victimas_hombres: [0, 15, 0],
                menores_involucrados: [0, 8, 0],
                area_verde_m2: [200, 80000, 0],
                num_servicios_habilitados: [1, 80, 0],
            };
            const r = ranges[col] || [0, 1000, 2];
            const base = randNum(r[0], r[1], r[2]);
            row[col] = isNull() ? null : isOutlier ? base * (Math.random() < 0.5 ? -1.5 : 8) : base;
        });

        // Columnas de fecha
        (dataset.dateCols || []).forEach(col => {
            if (col === 'año') row[col] = randNum(2018, 2025);
            else if (col === 'periodo' || col === 'trimestre') row[col] = `${randNum(2020, 2025)}-${String(randNum(1, 4)).padStart(2, '0')}`;
            else if (col === 'semana_epidemiologica') row[col] = `${randNum(2024, 2026)}-SE${String(randNum(1, 52)).padStart(2, '0')}`;
            else row[col] = isNull(0.04) ? null : randDate(730);
        });

        // Columnas categóricas — valores realistas de Medellín
        (dataset.categoryCols || []).forEach((col, ci) => {
            const maps = {
                comuna: MEDELLIN_DATA.comunas,
                barrio: MEDELLIN_DATA.barrios,
                municipio: MEDELLIN_DATA.municipios_amva,
                clase_accidente: MEDELLIN_DATA.clases_accidente,
                tipo_vehiculo: MEDELLIN_DATA.tipos_vehiculo,
                gravedad: ['Con muertos', 'Con heridos', 'Solo daños'],
                diseno: ['Curva', 'Recta', 'Intersección', 'Glorieta'],
                tipo_infraccion: ['Exceso velocidad', 'No cinturón', 'Celular conduciendo', 'Alcohol', 'Semáforo', 'Documentos'],
                dia_semana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
                linea: ['Línea A', 'Línea B', 'Tranvía de Ayacucho', 'Cable Arví', 'Cable San Javier'],
                tipo_servicio: ['Metro', 'Metroplús', 'Tranvía', 'Teleférico'],
                combustible: ['Gasolina', 'Diésel', 'Gas', 'Híbrido', 'Eléctrico'],
                genero_victima: ['Masculino', 'Femenino', 'No reportado'],
                grupo_edad: ['0-14', '15-24', '25-34', '35-44', '45-54', '55-64', '65+'],
                presunto_movil: ['Ajuste de cuentas', 'Intolerancia', 'Robo', 'Ira', 'Violencia intrafamiliar', 'Sin establecer'],
                tipo_hurto: MEDELLIN_DATA.tipos_hurto,
                modalidad: MEDELLIN_DATA.modalidades_hurto,
                zona: ['Urbana', 'Rural', 'Periurbana'],
                horario: ['Madrugada (0-6h)', 'Mañana (6-12h)', 'Tarde (12-18h)', 'Noche (18-24h)'],
                tipo_violencia: ['Física', 'Psicológica', 'Sexual', 'Económica', 'Patrimonial'],
                parentesco_agresor: ['Pareja/cónyuge', 'Expareja', 'Padre/madre', 'Hijo/a', 'Hermano/a', 'Otro familiar'],
                tipo_lesion: ['Cortopunzante', 'Contundente', 'Arma de fuego', 'Quemadura', 'Otra'],
                mecanismo: ['Riña', 'Agresión unilateral', 'Accidente doméstico', 'Otro'],
                estacion: MEDELLIN_DATA.estaciones_siata,
                clasificacion_ica: ['Buena', 'Moderada', 'Dañina grupos sensibles', 'Dañina', 'Muy dañina'],
                nivel_riesgo: ['Bajo', 'Moderado', 'Alto', 'Muy alto', 'Peligroso'],
                tipo_residuo: ['Ordinario no reciclable', 'Reciclable', 'Orgánico', 'Especial', 'Hospitalario'],
                operador: ['Emvarias', 'Empresa de la ciudad', 'EPM', 'Privado'],
                estado_fitosanitario: ['Bueno', 'Regular', 'Malo', 'Muy malo'],
                especie: ['Guayacana amarilla', 'Samán', 'Guadua', 'Caucho', 'Mango', 'Araucaria'],
                nombre_comun: ['Guayacana', 'Samán', 'Cedro', 'Yarumo', 'Nogal cafetero'],
                tipo_zona: ['Zona verde', 'Antejardín', 'Separador', 'Parque', 'Alameda'],
                tipo_zona_ruido: ['Residencial', 'Comercial', 'Industrial', 'Silencio', 'Mixto'],
                horario_ruido: ['Diurno (7-21h)', 'Nocturno (21-7h)'],
                cumple_norma: ['Sí', 'No'],
                actividad_ciiu: MEDELLIN_DATA.actividad_ciiu,
                tipo_local: ['Inmueble propio', 'Arrendado', 'Compartido', 'Vivienda'],
                estrato: ['1', '2', '3', '4', '5', '6'],
                producto: ['Plátano', 'Papa', 'Tomate', 'Cebolla', 'Zanahoria', 'Pollo', 'Res', 'Frijol', 'Arroz', 'Limón'],
                grupo_alimento: MEDELLIN_DATA.grupos_alimento,
                unidad_medida: ['Kg', 'Libra', 'Arroba', 'Unidad', 'Canastilla'],
                tipo_licencia: ['Nueva construcción', 'Ampliación', 'Adecuación', 'Demolición', 'Subdivisión'],
                uso_suelo: ['Residencial VIS', 'Residencial no VIS', 'Comercial', 'Industrial', 'Dotacional', 'Mixto'],
                sexo: ['Hombre', 'Mujer'],
                rango_edad: ['14-26 años', '27-54 años', '55 y más'],
                sector_economico: ['Comercio', 'Servicios', 'Industria', 'Construcción', 'Agricultura', 'Transporte'],
                dominio: ['Área Metropolitana de Medellín', 'Medellín ciudad'],
                enfermedad: MEDELLIN_DATA.enfermedades,
                estado_caso: ['Confirmado', 'Probable', 'Descartado', 'En estudio'],
                biologico: MEDELLIN_DATA.biologicos_pai,
                causa_cie10: MEDELLIN_DATA.causa_muerte,
                grupo_causa: ['Externas', 'Crónicas', 'Infecciosas', 'Materno-infantiles', 'Otras'],
                nombre_ips: ['Hospital General', 'Clínica Las Américas', 'IPS Comfama', 'Centro de Salud Manrique', 'Laboratorio CliniSalud'],
                nivel_atencion: MEDELLIN_DATA.nivel_atencion,
                naturaleza: ['Pública', 'Privada', 'Mixta'],
                tipo_ips: MEDELLIN_DATA.tipo_ips,
                nombre_establecimiento: ['IE José María Bernal', 'Col. Rafael Uribe', 'IE Paulo Freire', 'Col. Inem', 'Liceo El Rosario'],
                caracter: ['Oficial', 'Privado'],
                jornada: ['Mañana', 'Tarde', 'Única', 'Nocturna', 'Completa'],
                niveles: ['Preescolar-Básica-Media', 'Básica-Media', 'Solo Media', 'Adultos'],
                grado: ['Preescolar', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°'],
                nivel: ['Preescolar', 'Primaria', 'Secundaria', 'Media'],
                sector: ['Oficial', 'Privado'],
                clasificacion: ['A+', 'A', 'B', 'C', 'D'],
                tipo_equipamiento: MEDELLIN_DATA.tipo_equipamiento,
                tipo_parque: ['Metropolitano', 'Zonal', 'Barrio', 'Lineal', 'Ecológico'],
                nombre_parque: ['Parque Arví', 'Parque Lineal La Presidenta', 'Parque La Asomadera', 'Bosque de la Independencia', 'Parque Norte'],
                administrador: ['INDER Medellín', 'Parques Nacionales', 'EPM', 'Secretaría Medio Ambiente'],
                estado: ['Bueno', 'Regular', 'Malo', 'En intervención'],
                tipo_espacio: MEDELLIN_DATA.tipo_espacio,
                cumple_estandar_onu: ['Sí', 'No'],
                tipo_usuario: ['Residencial', 'Comercial', 'Industrial', 'Oficial'],
                fuente_abastecimiento: ['La Fe', 'Piedras Blancas', 'Manantiales', 'Ríogrande II', 'La Regadera'],
                tecnologia: ['Fibra óptica (FTTH)', 'Cable (HFC)', '4G LTE', '5G', 'DSL', 'Satelital'],
                tecnologia_internet: ['Fibra óptica (FTTH)', 'Cable (HFC)', '4G LTE', '5G', 'DSL'],
                marca: ['Yamaha', 'Honda', 'Chevrolet', 'Renault', 'KIA', 'Toyota', 'Bajaj', 'AKT'],
                color: ['Blanco', 'Negro', 'Gris', 'Rojo', 'Azul', 'Plata'],
            };
            const options = maps[col] || ['Tipo A', 'Tipo B', 'Tipo C', 'Sin dato'];
            row[col] = isNull(0.05) ? null : pick(options);
        });

        // ~3% de filas duplicadas para que la limpieza detecte algo
        if (i > 5 && Math.random() < 0.03) {
            rows.push({ ...rows[Math.floor(Math.random() * Math.min(i, 20))] });
        } else {
            rows.push(row);
        }
    }
    return rows;
}