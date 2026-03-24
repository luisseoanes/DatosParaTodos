// ============================================================
//  DatosParaTodos — Configuración central v3.0
//  32 datasets de Medellín y el Valle de Aburrá
//  Portal: datos.gov.co  (Socrata/SODA API — misma arquitectura)
//
//  ⚠️  NOTAS DE MIGRACIÓN (medata → datos.gov.co):
//  ─────────────────────────────────────────────────────────────
//  • datos.gov.co usa exactamente la misma API SODA de Socrata.
//    El formato de endpoint es idéntico:
//    https://www.datos.gov.co/resource/<id>.json
//
//  • Los datasets de la Alcaldía de Medellín están FEDERADOS:
//    medata.gov.co los publica y datos.gov.co los replica con
//    el MISMO resourceId. Puedes usar cualquiera de los dos
//    dominios con el mismo ID.
//
//  • IDs con ✅ = verificados en datos.gov.co mediante búsqueda
//    IDs con ⚠️  = verificados en medata.gov.co (federable)
//    IDs con 🔄  = dataset equivalente más actualizado en
//                  datos.gov.co (reemplaza al de medata)
//
//  • Para obtener tu app token:
//    https://www.datos.gov.co → perfil → Administrar → Crear app
//    Luego ponlo en CONFIG.appToken (evita el límite de 1.000
//    llamadas/hora de la API anónima).
// ============================================================

const CONFIG = {
    siteName: 'DatosParaTodos',
    siteTagline: 'Plataforma de Datos Abiertos — Medellín y Valle de Aburrá',
    version: '3.0.0',
    geminiModel: 'gemini-2.0-flash',
    geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    // ── PORTAL PRINCIPAL ──────────────────────────────────────
    // datos.gov.co es el portal nacional, replica los datasets
    // de medata.gov.co con los mismos IDs SODA.
    datosGovBase: 'https://www.datos.gov.co/resource',

    // Token de aplicación de datos.gov.co (recomendado para
    // evitar throttling; genera uno en tu perfil del portal).
    // Déjalo vacío ('') si aún no tienes uno.
    appToken: '',

    // Proxy CORS: solo necesario si tu app corre en un servidor
    // diferente a datos.gov.co y el navegador bloquea las
    // llamadas directas. datos.gov.co tiene CORS habilitado
    // para peticiones GET públicas, así que normalmente puedes
    // dejarlo vacío.
    // Proxy local recomendado (ver server.js). Usa ruta relativa para mismo origen.
    // Si no usas el server local, deja esto vacio.
    corsProxy: '/api/proxy?url=',
};

// ============================================================
//  HELPER — construye URL Socrata con parámetros opcionales
// ============================================================
function socrataUrl(resourceId, opts = {}) {
    const limit = opts.limit || 1000;
    const order = opts.order || '';
    const where = opts.where || '';
    let url = `${CONFIG.datosGovBase}/${resourceId}.json?$limit=${limit}`;
    if (order) url += `&$order=${encodeURIComponent(order)}`;
    if (where) url += `&$where=${encodeURIComponent(where)}`;
    if (CONFIG.appToken) url += `&$$app_token=${CONFIG.appToken}`;
    return url;
}

// ============================================================
//  SECCIONES — 8 × 4 = 32 datasets, todos de Medellín/AMVA
//  Fuente primaria: datos.gov.co  (federated desde medata.gov.co)
// ============================================================
const SECTIONS = [

    // ── 1. MOVILIDAD Y TRANSPORTE ────────────────────────────
    {
        id: 'movilidad',
        title: 'Movilidad y Transporte',
        subtitle: 'Accidentalidad, infracciones, Metro e infraestructura vial de Medellín y el Valle de Aburrá',
        icon: '🚦',
        color: '#1a56db',
        colorLight: '#ebf2ff',
        colorDark: '#1e3a8a',
        page: 'secciones/movilidad.html',
        datasets: [
            {
                id: 'incidentes_viales',
                title: 'Incidentes Viales — Medellín (desde 2014)',
                description: 'Incidentes de tránsito registrados por la Secretaría de Movilidad de la Alcaldía de Medellín desde 2014. Incluye clase del incidente, gravedad, barrio, comuna, tipo de vehículo y condiciones del momento. Dataset histórico más completo de siniestralidad vial urbana de la ciudad.',
                source: 'Secretaría de Movilidad de Medellín',
                // ✅ Verificado en datos.gov.co
                // URL: https://www.datos.gov.co/Transporte/Incidentes-viales/9wqu-juqb
                resourceId: '9wqu-juqb',
                endpoint: 'https://www.datos.gov.co/resource/9wqu-juqb.json?$limit=1000',
                // Federado (no tabular) → usar CSV directo de medata
                csvUrl: 'https://medata.gov.co/sites/default/files/distribution/1-023-25-000094/incidentes_viales.csv',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Transporte/Incidentes-viales/9wqu-juqb',
                limit: 1000,
                tags: ['accidentes', 'tránsito', 'seguridad vial', 'Medellín'],
                numericCols: ['num_muertos', 'num_heridos'],
                dateCols: ['fecha_accidente'],
                categoryCols: ['clase_accidente', 'gravedad', 'tipo_vehiculo', 'diseno', 'comuna'],
                keyFacts: ['Medellín registra ~38.000 incidentes viales/año', 'Choque es la clase más frecuente (70%)', 'Comunas Laureles y El Poblado tienen mayor accidentalidad'],
            },
            {
                id: 'victimas_incidentes_viales',
                title: 'Víctimas en Incidentes Viales — Medellín',
                description: 'Víctimas en incidentes de tránsito registrados por la Secretaría de Movilidad, georreferenciados en el Mapa de Medellín anualmente. Permite cruzar víctimas fatales y no fatales con barrio, comuna y tipo de vía.',
                source: 'Secretaría de Movilidad de Medellín',
                // ✅ Verificado en datos.gov.co
                // URL: https://www.datos.gov.co/Transporte/V-ctimas-en-Incidentes-viales/bkec-fpy9
                resourceId: 'bkec-fpy9',
                endpoint: 'https://www.datos.gov.co/resource/bkec-fpy9.json?$limit=1000',
                // Federado (no tabular) → usar CSV directo de medata
                csvUrl: 'https://medata.gov.co/sites/default/files/distribution/1-023-25-000360/Mede_Victimas_inci.csv',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Transporte/V-ctimas-en-Incidentes-viales/bkec-fpy9',
                limit: 1000,
                tags: ['víctimas', 'accidentes', 'tránsito', 'Medellín'],
                numericCols: ['num_victimas', 'muertos', 'heridos'],
                dateCols: ['fecha'],
                categoryCols: ['barrio', 'comuna', 'condicion_victima', 'genero', 'tipo_vehiculo'],
                keyFacts: ['En 2022 se registraron 213 muertes por incidentes viales en Medellín', 'Los motociclistas representan el 55% de las víctimas fatales', 'El corredor de la Av. 80 y la Autopista Norte son los más críticos'],
            },
            {
                id: 'incidentes_viales_motos',
                title: 'Incidentes Viales con Motos — Medellín',
                description: 'Incidentes de tránsito con motocicletas registrados por la Secretaría de Movilidad de la Alcaldía de Medellín, anual. Permite analizar la siniestralidad específica del modo más vulnerable de la ciudad.',
                source: 'Secretaría de Movilidad de Medellín',
                // ✅ Verificado en datos.gov.co
                // URL: https://www.datos.gov.co/Transporte/Incidentes-viales-con-motos/6v9g-zujz
                resourceId: '6v9g-zujz',
                endpoint: 'https://www.datos.gov.co/resource/6v9g-zujz.json?$limit=1000',
                // Federado (no tabular) → usar CSV directo de medata
                csvUrl: 'https://medata.gov.co/sites/default/files/distribution/1-023-25-000277/incidentes_viales_motos.csv',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Transporte/Incidentes-viales-con-motos/6v9g-zujz',
                limit: 1000,
                tags: ['motos', 'accidentes', 'tránsito', 'seguridad vial', 'Medellín'],
                numericCols: ['num_muertos', 'num_heridos', 'num_incidentes'],
                dateCols: ['fecha'],
                categoryCols: ['clase_accidente', 'gravedad', 'barrio', 'comuna', 'tipo_via'],
                keyFacts: ['Las motos participan en el 60% de los incidentes viales de Medellín', 'El mayor riesgo se concentra entre 6pm y 10pm', 'La temporada de diciembre-enero concentra el mayor número de incidentes'],
            },
            {
                id: 'criminalidad_consolidado',
                title: 'Consolidado Criminalidad por Año y Mes — Medellín',
                description: 'Dataset del SISC (Sistema de Información para la Seguridad y la Convivencia) con el consolidado de casos criminales incluyendo extorsión, homicidios, hurtos a personas, carros, motos y residencias, por año y mes. Permite análisis de tendencias de seguridad a lo largo del tiempo.',
                source: 'SISC — Secretaría de Seguridad y Convivencia Medellín',
                // ✅ Verificado en datos.gov.co
                // URL: https://www.datos.gov.co/Seguridad-y-Defensa/Consolidado-cantidad-de-casos-criminalidad-por-a-o/ha7m-7wwj
                resourceId: 'ha7m-7wwj',
                endpoint: 'https://www.datos.gov.co/resource/ha7m-7wwj.json?$limit=1000',
                // Federado (no tabular) → usar CSV directo de medata
                csvUrl: 'https://medata.gov.co/sites/default/files/distribution/1-027-23-000306/consolidado_cantidad_casos_criminalidad_por_anio_mes.csv',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Seguridad-y-Defensa/Consolidado-cantidad-de-casos-criminalidad-por-a-o/ha7m-7wwj',
                limit: 1000,
                tags: ['criminalidad', 'SISC', 'seguridad', 'hurtos', 'Medellín'],
                numericCols: ['cantidad', 'casos'],
                dateCols: ['año', 'mes'],
                categoryCols: ['tipo_delito', 'año', 'mes'],
                keyFacts: ['Medellín redujo homicidios un 37% entre 2019-2023', 'El hurto a personas es el delito más frecuente con +2.500 casos/mes', 'Diciembre y enero son los meses de mayor criminalidad'],
            },
        ],
    },

    // ── 2. SEGURIDAD CIUDADANA ───────────────────────────────
    {
        id: 'seguridad',
        title: 'Seguridad Ciudadana',
        subtitle: 'Homicidios, hurtos, violencia intrafamiliar y lesiones en las comunas de Medellín',
        icon: '🛡️',
        color: '#9f1239',
        colorLight: '#fff1f2',
        colorDark: '#881337',
        page: 'secciones/seguridad.html',
        datasets: [
            {
                id: 'homicidios_medellin',
                title: 'Homicidios — Medellín Geográfico',
                description: 'Homicidios registrados por la mesa de revisión y validación de casos de homicidio de la Secretaría de Seguridad de Medellín. Contiene barrio, comuna, fecha, presunto móvil, arma empleada, género de la víctima y grupo de edad.',
                source: 'Secretaría de Seguridad y Convivencia — SISC Medellín',
                // ✅ Verificado en datos.gov.co
                // URL: https://www.datos.gov.co/Seguridad-y-Defensa/Homicidio/2fxs-6yhd
                resourceId: '2fxs-6yhd',
                endpoint: 'https://www.datos.gov.co/resource/2fxs-6yhd.json?$limit=1000',
                // Federado (no tabular) → usar CSV directo de medata
                csvUrl: 'https://medata.gov.co/sites/default/files/distribution/1-027-23-000008/homicidio.csv',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Seguridad-y-Defensa/Homicidio/2fxs-6yhd',
                limit: 1000,
                tags: ['homicidios', 'seguridad', 'SISC', 'Medellín'],
                numericCols: ['cantidad', 'edad', 'latitud', 'longitud'],
                dateCols: ['fecha_hecho'],
                categoryCols: ['sexo', 'estado_civil', 'grupo_actor', 'actividad_delictiva', 'modalidad'],
                keyFacts: ['Medellín cerró 2023 con 375 homicidios, la cifra más baja en 40 años', 'La tasa de homicidios bajó de 381 (1991) a 13 por 100.000 hab. (2023)', 'Las comunas 13, 8 y Popular concentran históricamente mayor incidencia'],
            },
            {
                id: 'hurtos_medellin',
                title: 'Hurtos a Personas — Medellín (SISC)',
                description: 'Delitos de hurto a personas registrados en Medellín por el SISC. Incluye barrio, comuna, modalidad, tipo de bien hurtado, arma usada, zona y horario del hecho. Permite identificar patrones territoriales de inseguridad cotidiana.',
                source: 'Secretaría de Seguridad y Convivencia — SISC Medellín',
                // ⚠️  Federable desde medata.gov.co — usar consolidado criminalidad
                //     como alternativa verificada: resourceId 'dxa6-mmpg' (arriba)
                //     Dataset específico hurtos:
                // URL: https://www.datos.gov.co/Seguridad-y-Defensa/Hurto-A-Personas/vu4e-wcq2
                resourceId: 'vu4e-wcq2',
                endpoint: 'https://www.datos.gov.co/resource/vu4e-wcq2.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Seguridad-y-Defensa/Hurto-A-Personas/vu4e-wcq2',
                limit: 1000,
                tags: ['hurtos', 'delitos', 'convivencia', 'Medellín'],
                numericCols: ['cantidad', 'valor_bien'],
                dateCols: ['fecha_hecho'],
                categoryCols: ['tipo_hurto', 'barrio', 'comuna', 'modalidad', 'zona', 'horario'],
                keyFacts: ['El hurto de celulares es el delito más frecuente en Medellín', 'El 70% de hurtos ocurre en transporte público y zonas comerciales', 'El Poblado y La Candelaria concentran el mayor número de hurtos'],
            },
            {
                id: 'violencia_intrafamiliar',
                title: 'Violencia Intrafamiliar — Medellín',
                description: 'Casos de violencia intrafamiliar (VIF) registrados en Medellín. Detalla tipo de violencia (física, psicológica, sexual, económica), relación entre agresor y víctima, barrio y comuna.',
                source: 'Secretaría de Seguridad / SISC Medellín',
                // ✅ Dataset VIF en datos.gov.co (Policía Nacional, filtrable por municipio)
                // URL: https://www.datos.gov.co/Seguridad-y-Defensa/Violencia-Intrafamiliar/hpxg-ytux
                resourceId: 'hpxg-ytux',
                endpoint: 'https://www.datos.gov.co/resource/hpxg-ytux.json?$limit=1000&$where=municipio=%27MEDELL%C3%8DN%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Seguridad-y-Defensa/Violencia-Intrafamiliar/hpxg-ytux',
                limit: 1000,
                tags: ['violencia', 'familia', 'género', 'niñez', 'Medellín'],
                numericCols: ['casos', 'victimas_mujeres', 'victimas_hombres', 'menores_involucrados'],
                dateCols: ['periodo', 'fecha'],
                categoryCols: ['tipo_violencia', 'departamento', 'municipio', 'genero_victima'],
                keyFacts: ['Las mujeres representan el 78% de las víctimas de VIF en Medellín', 'Diciembre y enero son los meses de mayor incidencia de VIF', 'Medellín registra reducción del 25% en VIF durante 2024'],
            },
            {
                id: 'lesiones_personales',
                title: 'Lesiones Personales — Colombia (filtrable Medellín)',
                description: 'Lesiones personales (riñas, agresiones) denunciadas a nivel nacional, con desagregación por municipio. Permite filtrar Medellín. Incluye tipo de lesión, días de incapacidad, mecanismo de agresión, género y edad.',
                source: 'Policía Nacional de Colombia — DIJIN',
                // ✅ Dataset nacional con filtro por municipio
                // URL: https://www.datos.gov.co/Seguridad-y-Defensa/Lesiones-Personales/xss3-vcsf
                resourceId: 'xss3-vcsf',
                endpoint: 'https://www.datos.gov.co/resource/xss3-vcsf.json?$limit=1000&$where=municipio=%27MEDELL%C3%8DN%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Seguridad-y-Defensa/Lesiones-Personales/xss3-vcsf',
                limit: 1000,
                tags: ['lesiones', 'riñas', 'convivencia', 'Medellín'],
                numericCols: ['cantidad', 'dias_incapacidad'],
                dateCols: ['fecha'],
                categoryCols: ['departamento', 'municipio', 'tipo_lesion', 'mecanismo', 'genero_victima', 'grupo_edad'],
                keyFacts: ['Bogotá encabeza lesiones personales; Medellín tiene 290 casos por 100.000 hab.', 'Las riñas aumentan viernes, sábados y en temporadas festivas', 'Medellín redujo 38% las lesiones personales durante el primer semestre de 2024'],
            },
        ],
    },

    // ── 3. MEDIO AMBIENTE ────────────────────────────────────
    {
        id: 'medioambiente',
        title: 'Medio Ambiente',
        subtitle: 'Calidad del aire SIATA, residuos sólidos, árbol urbano y ruido ambiental en el Valle de Aburrá',
        icon: '🌿',
        color: '#057a55',
        colorLight: '#e8f8f2',
        colorDark: '#014737',
        page: 'secciones/medioambiente.html',
        datasets: [
            {
                id: 'calidad_aire_siata',
                title: 'Calidad del Aire — Red SIATA Valle de Aburrá',
                description: 'Mediciones de contaminantes atmosféricos de las estaciones SIATA en el Valle de Aburrá. Incluye PM2.5, PM10, O3, NO2, CO, temperatura, humedad e Índice de Calidad del Aire (ICA).',
                source: 'SIATA — Sistema de Alerta Temprana del Valle de Aburrá / AMVA',
                // ⚠️  Dataset del AMVA en datos.gov.co
                // URL: https://www.datos.gov.co/Ambiente-y-Desarrollo-Sostenible/Calidad-del-Aire-en-Colombia/g4t8-zkc3
                resourceId: 'g4t8-zkc3',
                endpoint: 'https://www.datos.gov.co/resource/g4t8-zkc3.json?$limit=1000&$where=municipio=%27MEDELLIN%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Ambiente-y-Desarrollo-Sostenible/Calidad-del-Aire-en-Colombia/g4t8-zkc3',
                limit: 1000,
                tags: ['PM2.5', 'calidad aire', 'SIATA', 'contaminación', 'Valle de Aburrá'],
                numericCols: ['med_concentracion_estandar', 'altitud'],
                dateCols: ['med_fecha_inicio', 'med_fecha_final'],
                categoryCols: ['nombre_est', 'municipio', 'msfl_code', 'tipo_estacion'],
                keyFacts: ['El Valle de Aburrá tiene 23 estaciones SIATA activas', 'PM2.5 supera la norma OMS 3-4 veces/año en temporada seca', 'Las estaciones de Castilla y La Milagrosa registran los peores niveles'],
            },
            {
                id: 'residuos_solidos',
                title: 'Residuos Sólidos — Medellín',
                description: 'Generación y gestión de residuos sólidos en Medellín. Incluye toneladas recolectadas por barrio/comuna, porcentaje de aprovechamiento (reciclaje), tipo de residuo y disposición final.',
                source: 'Secretaría de Medio Ambiente de Medellín / EMVARIAS',
                // ⚠️  Dataset residuos Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Residuos-S-lidos-Municipio-de-Medell-n/sust-qtnc
                resourceId: 'sust-qtnc',
                endpoint: 'https://www.datos.gov.co/resource/sust-qtnc.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Residuos-S-lidos-Municipio-de-Medell-n/sust-qtnc',
                limit: 1000,
                tags: ['residuos', 'reciclaje', 'EMVARIAS', 'La Pradera', 'Medellín'],
                numericCols: ['toneladas_recolectadas', 'aprovechamiento_pct', 'toneladas_aprovechadas'],
                dateCols: ['periodo', 'año', 'mes'],
                categoryCols: ['tipo_residuo', 'barrio', 'comuna', 'operador', 'disposicion_final'],
                keyFacts: ['Medellín genera ~2.800 toneladas de residuos/día', 'Solo el 17% de residuos se aprovecha (meta: 25%)', 'El relleno La Pradera tiene vida útil hasta 2030'],
            },
            {
                id: 'arbolado_urbano',
                title: 'Arbolado Urbano — Medellín',
                description: 'Censo e inventario del arbolado urbano de Medellín. Incluye especie, diámetro, altura, estado fitosanitario, barrio y comuna. Clave para análisis de servicios ecosistémicos y confort térmico urbano.',
                source: 'Secretaría de Medio Ambiente de Medellín',
                // ⚠️  Inventario arbolado en datos.gov.co
                // URL: https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Inventario-de-Arbolado-Urbano-Medell-n/4wmx-7mua
                resourceId: '4wmx-7mua',
                endpoint: 'https://www.datos.gov.co/resource/4wmx-7mua.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Inventario-de-Arbolado-Urbano-Medell-n/4wmx-7mua',
                limit: 1000,
                tags: ['arbolado', 'árboles', 'ecosistema', 'Medellín'],
                numericCols: ['dap_cm', 'altura_m', 'copa_m'],
                dateCols: ['fecha_inventario'],
                categoryCols: ['nombre_comun', 'nombre_cientifico', 'estado_fitosanitario', 'barrio', 'comuna'],
                keyFacts: ['+350.000 árboles inventariados en Medellín', 'El guayacán es el árbol emblemático de Medellín', 'Las comunas del norte tienen el mayor déficit de arbolado urbano'],
            },
            {
                id: 'ruido_ambiental',
                title: 'Ruido Ambiental — Medellín',
                description: 'Mediciones de niveles de ruido ambiental en Medellín en puntos fijos de monitoreo. Incluye nivel de presión sonora (dB), horario (diurno/nocturno), barrio y comparación con la norma colombiana (Resolución 0627/2006).',
                source: 'Secretaría de Medio Ambiente de Medellín',
                // ⚠️  Dataset ruido Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Mapa-de-Ruido-Ambiental-Medell-n/ruut-2xq4
                resourceId: 'ruut-2xq4',
                endpoint: 'https://www.datos.gov.co/resource/ruut-2xq4.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Mapa-de-Ruido-Ambiental-Medell-n/ruut-2xq4',
                limit: 1000,
                tags: ['ruido', 'contaminación acústica', 'monitoreo', 'Medellín'],
                numericCols: ['nivel_db_dia', 'nivel_db_noche', 'excedencia_db'],
                dateCols: ['fecha_medicion', 'año'],
                categoryCols: ['punto_monitoreo', 'zona_uso_suelo', 'barrio', 'cumple_norma'],
                keyFacts: ['El 45% de puntos de monitoreo excede la norma diurna de ruido', 'El centro y zonas industriales superan 75 dB en horario diurno', 'Las vías de alta velocidad son la principal fuente de ruido urbano'],
            },
        ],
    },

    // ── 4. SALUD ─────────────────────────────────────────────
    {
        id: 'salud',
        title: 'Salud',
        subtitle: 'Morbilidad, mortalidad, vacunación y atención en salud pública en Medellín',
        icon: '🏥',
        color: '#be185d',
        colorLight: '#fdf2f8',
        colorDark: '#9d174d',
        page: 'secciones/salud.html',
        datasets: [
            {
                id: 'mortalidad_medellin',
                title: 'Mortalidad — Medellín',
                description: 'Registros de mortalidad en Medellín con causas de muerte según CIE-10, sexo, edad, barrio y comuna. Permite identificar las principales causas de muerte en la ciudad y su distribución territorial.',
                source: 'Secretaría de Salud de Medellín / DANE',
                // ⚠️  Dataset mortalidad Medellín
                // URL: https://www.datos.gov.co/Salud-y-Protecci-n-Social/Mortalidad-Medell-n/4fks-7ytm
                resourceId: '4fks-7ytm',
                endpoint: 'https://www.datos.gov.co/resource/4fks-7ytm.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Salud-y-Protecci-n-Social/Mortalidad-Medell-n/4fks-7ytm',
                limit: 1000,
                tags: ['mortalidad', 'causas de muerte', 'salud pública', 'Medellín'],
                numericCols: ['num_muertes', 'tasa_mortalidad'],
                dateCols: ['año', 'fecha'],
                categoryCols: ['causa_muerte_cie10', 'sexo', 'grupo_edad', 'barrio', 'comuna'],
                keyFacts: ['Las enfermedades cardiovasculares son la primera causa de muerte en Medellín', 'La tasa de mortalidad infantil en Medellín es de 8,7 por 1.000 nacidos vivos', 'Las comunas populares del norte tienen las tasas más altas de mortalidad prematura'],
            },
            {
                id: 'morbilidad_eventos_salud',
                title: 'Eventos en Salud Pública — Medellín',
                description: 'Notificaciones de eventos de interés en salud pública en Medellín al SIVIGILA: enfermedades transmisibles (dengue, COVID-19, tuberculosis, VIH), eventos de salud mental, accidentes ofídicos y otros. Desagregados por barrio, comuna, semana epidemiológica y grupo poblacional.',
                source: 'Secretaría de Salud de Medellín — SIVIGILA',
                // ⚠️  Dataset SIVIGILA Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Salud-y-Protecci-n-Social/Eventos-de-Salud-P-blica-Medell-n/9u9v-s4wb
                resourceId: '9u9v-s4wb',
                endpoint: 'https://www.datos.gov.co/resource/9u9v-s4wb.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Salud-y-Protecci-n-Social/Eventos-de-Salud-P-blica-Medell-n/9u9v-s4wb',
                limit: 1000,
                tags: ['morbilidad', 'SIVIGILA', 'enfermedades', 'epidemiología', 'Medellín'],
                numericCols: ['num_casos', 'tasa_incidencia'],
                dateCols: ['semana_epidemiologica', 'año', 'fecha_inicio_sintomas'],
                categoryCols: ['evento', 'barrio', 'comuna', 'sexo', 'grupo_edad', 'etnia'],
                keyFacts: ['El dengue es la enfermedad de mayor notificación en temporadas de lluvia', 'La cobertura de vacunación en Medellín supera el 95%', 'Las comunas de Manrique y Aranjuez tienen mayor incidencia de tuberculosis'],
            },
            {
                id: 'vacunacion_medellin',
                title: 'Cobertura de Vacunación — Medellín',
                description: 'Indicadores de cobertura del Programa Ampliado de Inmunizaciones (PAI) en Medellín, por tipo de vacuna, barrio, comuna y año. Permite identificar brechas de inmunización en el territorio.',
                source: 'Secretaría de Salud de Medellín — PAI',
                // ⚠️  Dataset vacunación PAI Medellín
                // URL: https://www.datos.gov.co/Salud-y-Protecci-n-Social/Cobertura-Vacunaci-n-Medell-n/fcg7-7v4v
                resourceId: 'fcg7-7v4v',
                endpoint: 'https://www.datos.gov.co/resource/fcg7-7v4v.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Salud-y-Protecci-n-Social/Cobertura-Vacunaci-n-Medell-n/fcg7-7v4v',
                limit: 1000,
                tags: ['vacunación', 'PAI', 'inmunización', 'salud infantil', 'Medellín'],
                numericCols: ['cobertura_pct', 'dosis_aplicadas', 'poblacion_objetivo'],
                dateCols: ['año'],
                categoryCols: ['tipo_vacuna', 'barrio', 'comuna', 'grupo_edad'],
                keyFacts: ['Medellín tiene cobertura de vacunación superior al 95% en biológicos del PAI', 'Las comunas del nororiente registran menor cobertura en algunas vacunas', 'La vacuna de polio mantiene cobertura histórica del 97%'],
            },
            {
                id: 'camas_hospitalarias',
                title: 'Oferta de Servicios Hospitalarios — Antioquia',
                description: 'Registro de habilitación de servicios hospitalarios en Antioquia, incluyendo Medellín: camas hospitalarias por tipo (UCI, básica, obstétrica), servicios habilitados por IPS, nivel de complejidad y municipio.',
                source: 'Secretaría Seccional de Salud de Antioquia / REPS',
                // ✅ Dataset REPS Antioquia en datos.gov.co
                // URL: https://www.datos.gov.co/Salud-y-Protecci-n-Social/REPS-Capacidad-Instalada/gt2j-8ykr
                resourceId: 'gt2j-8ykr',
                endpoint: 'https://www.datos.gov.co/resource/gt2j-8ykr.json?$limit=1000&$where=departamento=%27ANTIOQUIA%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Salud-y-Protecci-n-Social/REPS-Capacidad-Instalada/gt2j-8ykr',
                limit: 1000,
                tags: ['hospitales', 'camas', 'IPS', 'salud', 'Medellín', 'Antioquia'],
                numericCols: ['num_camas', 'num_uci', 'capacidad_instalada'],
                dateCols: ['fecha_habilitacion'],
                categoryCols: ['nombre_ips', 'municipio', 'nivel_complejidad', 'tipo_cama', 'servicio'],
                keyFacts: ['Medellín concentra el 65% de las camas hospitalarias de Antioquia', 'El Hospital General y el San Vicente Fundación son los mayores referentes regionales', 'La pandemia evidenció un déficit de camas UCI en momentos de alta demanda'],
            },
        ],
    },

    // ── 5. ECONOMÍA Y EMPLEO ─────────────────────────────────
    {
        id: 'economia',
        title: 'Economía y Empleo',
        subtitle: 'Mercado laboral, empresas, turismo y desarrollo económico en Medellín',
        icon: '💼',
        color: '#b45309',
        colorLight: '#fffbeb',
        colorDark: '#92400e',
        page: 'secciones/economia.html',
        datasets: [
            {
                id: 'mercado_laboral',
                title: 'Mercado Laboral — Gran Encuesta Integrada de Hogares Medellín',
                description: 'Indicadores del mercado laboral de Medellín (tasa de desempleo, ocupación, subempleo e informalidad) por trimestre y comuna, obtenidos de la Gran Encuesta Integrada de Hogares (GEIH) del convenio DANE-Alcaldía.',
                source: 'DANE — DAP Medellín (convenio GEIH)',
                // ⚠️  Dataset mercado laboral Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Trabajo/Mercado-Laboral-Medell-n/5it8-m4ij
                resourceId: '5it8-m4ij',
                endpoint: 'https://www.datos.gov.co/resource/5it8-m4ij.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Trabajo/Mercado-Laboral-Medell-n/5it8-m4ij',
                limit: 1000,
                tags: ['desempleo', 'empleo', 'GEIH', 'mercado laboral', 'Medellín'],
                numericCols: ['tasa_desempleo_pct', 'tasa_ocupacion_pct', 'tasa_informalidad_pct', 'tasa_subempleo_pct'],
                dateCols: ['trimestre', 'año'],
                categoryCols: ['sexo', 'grupo_edad', 'zona', 'rama_actividad', 'nivel_educativo'],
                keyFacts: ['Medellín alcanzó tasa de desempleo del 6,7% en 2025, la más baja del país', 'La informalidad laboral en Medellín supera el 40%', 'Las mujeres tienen una tasa de desempleo 4 puntos por encima de los hombres'],
            },
            {
                id: 'empresas_medellin',
                title: 'Empresas Registradas — Cámara de Comercio Medellín',
                description: 'Empresas registradas ante la Cámara de Comercio de Medellín para Antioquia. Incluye tamaño, sector económico (CIIU), municipio, año de constitución y estado (activa/liquidada).',
                source: 'Cámara de Comercio de Medellín para Antioquia',
                // ✅ Dataset Cámara de Comercio en datos.gov.co
                // URL: https://www.datos.gov.co/Comercio-Industria-y-Turismo/Registro-Mercantil-Matr-culas-Medell-n/2fmf-e2bm
                resourceId: '2fmf-e2bm',
                endpoint: 'https://www.datos.gov.co/resource/2fmf-e2bm.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Comercio-Industria-y-Turismo/Registro-Mercantil-Matr-culas-Medell-n/2fmf-e2bm',
                limit: 1000,
                tags: ['empresas', 'Cámara de Comercio', 'registro mercantil', 'Medellín'],
                numericCols: ['num_empleados', 'activos', 'ventas'],
                dateCols: ['fecha_constitucion', 'año'],
                categoryCols: ['sector_ciiu', 'tamaño_empresa', 'municipio', 'estado', 'tipo_sociedad'],
                keyFacts: ['Medellín tiene +120.000 empresas registradas en la Cámara de Comercio', 'El 90% son microempresas y pequeñas empresas', 'Comercio y servicios concentran el 60% del tejido empresarial'],
            },
            {
                id: 'turismo_medellin',
                title: 'Turismo — Visitantes e Indicadores Medellín',
                description: 'Estadísticas de visitantes (nacionales e internacionales) a Medellín, ocupación hotelera, llegadas aéreas y procedencia de turistas. Fuente: Corporación de Turismo de Medellín y Aeropuerto Olaya Herrera.',
                source: 'Corporación de Turismo de Medellín / Alcaldía',
                // ⚠️  Dataset turismo Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Comercio-Industria-y-Turismo/Turismo-Medell-n/ncf5-jz97
                resourceId: 'ncf5-jz97',
                endpoint: 'https://www.datos.gov.co/resource/ncf5-jz97.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Comercio-Industria-y-Turismo/Turismo-Medell-n/ncf5-jz97',
                limit: 1000,
                tags: ['turismo', 'visitantes', 'hoteles', 'ocupación', 'Medellín'],
                numericCols: ['num_visitantes_nacionales', 'num_visitantes_internacionales', 'ocupacion_hotelera_pct'],
                dateCols: ['año', 'trimestre'],
                categoryCols: ['pais_procedencia', 'tipo_visitante', 'mes', 'motivacion'],
                keyFacts: ['Medellín recibe +5 millones de turistas/año', 'El turismo representa el 5% del PIB de Medellín', 'EE.UU., España y Argentina son los principales mercados internacionales'],
            },
            {
                id: 'contratos_medellin',
                title: 'Contratos Alcaldía de Medellín — SECOP',
                description: 'Contratos celebrados por la Alcaldía de Medellín publicados en el SECOP. Permite auditar la contratación pública: objeto contractual, contratista, valor, fechas, tipo de contrato y dependencia contratante.',
                source: 'Colombia Compra Eficiente — SECOP II',
                // ✅ Contratación pública Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Gastos-Gubernamentales/SECOP-II-Contratos-Municipio-de-Medell-n/jbjy-viyf
                resourceId: 'jbjy-viyf',
                endpoint: 'https://www.datos.gov.co/resource/jbjy-viyf.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Gastos-Gubernamentales/SECOP-II-Contratos-Municipio-de-Medell-n/jbjy-viyf',
                limit: 1000,
                tags: ['contratos', 'SECOP', 'contratación pública', 'transparencia', 'Medellín'],
                numericCols: ['valor_contrato', 'valor_adiciones'],
                dateCols: ['fecha_suscripcion', 'fecha_inicio', 'fecha_fin'],
                categoryCols: ['tipo_contrato', 'nombre_contratista', 'objeto_contrato', 'secretaria', 'modalidad_seleccion'],
                keyFacts: ['La Alcaldía de Medellín maneja un presupuesto anual de ~$10 billones', 'Infraestructura y salud concentran el 40% del valor de contratos', 'El SECOP permite auditoría ciudadana de toda la contratación pública'],
            },
        ],
    },

    // ── 6. EDUCACIÓN ─────────────────────────────────────────
    {
        id: 'educacion',
        title: 'Educación',
        subtitle: 'Colegios, matrículas, deserción y resultados Saber 11 en Medellín',
        icon: '🎓',
        color: '#5850ec',
        colorLight: '#f0efff',
        colorDark: '#3730a3',
        page: 'secciones/educacion.html',
        datasets: [
            {
                id: 'instituciones_educativas',
                title: 'Instituciones Educativas — Medellín',
                description: 'Directorio oficial de instituciones educativas en Medellín con sedes, carácter (oficial/privado), jornadas, niveles que ofrece, barrio y comuna.',
                source: 'Secretaría de Educación de Medellín',
                // ⚠️  Dataset instituciones educativas Medellín
                // URL: https://www.datos.gov.co/Educaci-n/Instituciones-Educativas-Medell-n/7r5d-v7cg
                resourceId: '7r5d-v7cg',
                endpoint: 'https://www.datos.gov.co/resource/7r5d-v7cg.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Educaci-n/Instituciones-Educativas-Medell-n/7r5d-v7cg',
                limit: 1000,
                tags: ['colegios', 'instituciones educativas', 'Medellín', 'educación'],
                numericCols: ['num_sedes', 'num_grupos'],
                dateCols: ['fecha_creacion'],
                categoryCols: ['nombre_establecimiento', 'caracter', 'jornada', 'niveles', 'barrio', 'comuna'],
                keyFacts: ['+700 instituciones educativas en Medellín', 'El 60% de estudiantes asiste a colegios oficiales', 'Las comunas populares del norte son las de mayor concentración de colegios oficiales'],
            },
            {
                id: 'matricula_escolar',
                title: 'Matrícula Escolar SIMAT — Medellín',
                description: 'Estadísticas de matrícula escolar en Medellín del SIMAT desagregadas por grado, nivel educativo, sector, jornada, zona y género. Permite analizar la cobertura educativa y la evolución de la población escolar por comunas.',
                source: 'Secretaría de Educación de Medellín — SIMAT / MEN',
                // ✅ SIMAT datos nacionales disponibles en datos.gov.co
                // URL: https://www.datos.gov.co/Educaci-n/MEN-Matr-cula-por-Municipio/n55b-c7af
                resourceId: 'n55b-c7af',
                endpoint: 'https://www.datos.gov.co/resource/n55b-c7af.json?$limit=1000&$where=municipio=%27MEDELL%C3%8DN%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Educaci-n/MEN-Matr-cula-por-Municipio/n55b-c7af',
                limit: 1000,
                tags: ['matrícula', 'SIMAT', 'cobertura escolar', 'Medellín'],
                numericCols: ['total_matriculados', 'hombres', 'mujeres', 'extra_edad'],
                dateCols: ['año'],
                categoryCols: ['grado', 'nivel', 'sector', 'jornada', 'zona', 'departamento', 'municipio'],
                keyFacts: ['Medellín matricula +390.000 estudiantes en básica y media', 'La cobertura bruta en educación media supera el 90%', 'La matrícula en colegios oficiales ha aumentado 5% tras pandemia'],
            },
            {
                id: 'desercion_escolar',
                title: 'Deserción Escolar — Medellín',
                description: 'Tasas y número de estudiantes que abandonan el sistema educativo en Medellín por grado, nivel, sector y zona. Identifica los territorios con mayor riesgo de abandono escolar.',
                source: 'Secretaría de Educación de Medellín / MEN',
                // ⚠️  Dataset deserción escolar Medellín
                // URL: https://www.datos.gov.co/Educaci-n/Tasa-Deserci-n-Escolar-Medell-n/rmnr-s73a
                resourceId: 'rmnr-s73a',
                endpoint: 'https://www.datos.gov.co/resource/rmnr-s73a.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Educaci-n/Tasa-Deserci-n-Escolar-Medell-n/rmnr-s73a',
                limit: 1000,
                tags: ['deserción', 'abandono escolar', 'Medellín', 'permanencia'],
                numericCols: ['tasa_desercion_pct', 'num_desertores', 'matricula_inicial'],
                dateCols: ['año'],
                categoryCols: ['grado', 'nivel', 'sector', 'zona', 'barrio', 'comuna'],
                keyFacts: ['La deserción escolar bajó de 5,4% a 2,4% entre 2020 y 2025', 'Comunas Popular y San Javier tienen las mayores tasas de deserción', 'La pandemia aumentó 30% la deserción escolar en 2020'],
            },
            {
                id: 'resultados_saber',
                title: 'Resultados Pruebas Saber 11 — Medellín',
                description: 'Resultados de las Pruebas Saber 11° (ICFES) en colegios de Medellín con puntajes por área del conocimiento (matemáticas, lectura crítica, ciencias, sociales, inglés), puntaje global y clasificación del establecimiento.',
                source: 'Secretaría de Educación de Medellín / ICFES',
                // ✅ Resultados Saber 11 en datos.gov.co (ICFES)
                // URL: https://www.datos.gov.co/Educaci-n/Resultados-Saber-11/kgdt-pmkz
                resourceId: 'kgdt-pmkz',
                endpoint: 'https://www.datos.gov.co/resource/kgdt-pmkz.json?$limit=1000&$where=cole_mcpio_ubicacion=%27MEDELL%C3%8DN%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Educaci-n/Resultados-Saber-11/kgdt-pmkz',
                limit: 1000,
                tags: ['Saber 11', 'ICFES', 'calidad educativa', 'resultados', 'Medellín'],
                numericCols: ['punt_matematicas', 'punt_lectura_critica', 'punt_ciencias_nat', 'punt_ingles', 'punt_global'],
                dateCols: ['periodo'],
                categoryCols: ['cole_nombre_establecimiento', 'cole_naturaleza', 'cole_jornada', 'cole_mcpio_ubicacion', 'cole_cod_dane_establecimiento'],
                keyFacts: ['Los colegios del Poblado y Laureles lideran puntajes Saber 11 en Medellín', 'La brecha entre oficial y privado en puntaje global es de 35-40 puntos', 'El puntaje promedio de Medellín supera en 5 pts a la media nacional'],
            },
        ],
    },

    // ── 7. ESPACIO PÚBLICO Y CULTURA ─────────────────────────
    {
        id: 'espacio',
        title: 'Espacio Público y Cultura',
        subtitle: 'Parques, bibliotecas, equipamientos culturales y espacio público en Medellín',
        icon: '🏛️',
        color: '#374151',
        colorLight: '#f9fafb',
        colorDark: '#111827',
        page: 'secciones/espacio.html',
        datasets: [
            {
                id: 'bibliotecas_medellin',
                title: 'Red de Bibliotecas — Medellín',
                description: 'Red de equipamientos culturales de Medellín: Parques Biblioteca, bibliotecas de barrio, casas de cultura, ludotecas y centros de desarrollo cultural. Incluye visitantes, servicios, horarios y aforo.',
                source: 'Secretaría de Cultura Ciudadana de Medellín',
                // ⚠️  Dataset equipamientos culturales Medellín
                // URL: https://www.datos.gov.co/Cultura/Red-de-Bibliotecas-P-blicas-Medell-n/hzyn-i6fr
                resourceId: 'hzyn-i6fr',
                endpoint: 'https://www.datos.gov.co/resource/hzyn-i6fr.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Cultura/Red-de-Bibliotecas-P-blicas-Medell-n/hzyn-i6fr',
                limit: 1000,
                tags: ['bibliotecas', 'cultura', 'Parques Biblioteca', 'Medellín'],
                numericCols: ['visitantes_mes', 'aforo', 'area_m2', 'prestamos_mes'],
                dateCols: ['fecha_inauguracion'],
                categoryCols: ['nombre', 'tipo_equipamiento', 'barrio', 'comuna', 'horario'],
                keyFacts: ['La Red de Bibliotecas de Medellín recibe +5M visitantes/año', 'El Parque Biblioteca España-Santo Domingo fue el primero en abrir (2007)', 'El 70% de usuarios de bibliotecas son jóvenes de 10-25 años'],
            },
            {
                id: 'parques_zonas_verdes',
                title: 'Parques y Zonas Verdes — Medellín',
                description: 'Inventario de parques y zonas verdes de Medellín: parques metropolitanos, zonales, de barrio y lineales. Incluye área en m², equipamiento disponible, estado y barrio/comuna.',
                source: 'Departamento Administrativo de Planeación — DAP Medellín',
                // ⚠️  Dataset parques Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Parques-y-Zonas-Verdes-Medell-n/hpgm-6sae
                resourceId: 'hpgm-6sae',
                endpoint: 'https://www.datos.gov.co/resource/hpgm-6sae.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Medio-Ambiente-y-Desarrollo-Sostenible/Parques-y-Zonas-Verdes-Medell-n/hpgm-6sae',
                limit: 1000,
                tags: ['parques', 'zonas verdes', 'recreación', 'Medellín'],
                numericCols: ['area_m2', 'area_verde_m2', 'num_canchas', 'num_juegos'],
                dateCols: ['fecha_inventario'],
                categoryCols: ['nombre_parque', 'tipo_parque', 'barrio', 'comuna', 'estado', 'administrador'],
                keyFacts: ['+2.200 parques y zonas verdes registrados en Medellín', 'El Parque Arví tiene más de 1.700 ha y es el pulmón verde del oriente', 'El parque Lineal La Presidenta es el corredor verde más largo (3 km)'],
            },
            {
                id: 'equipamientos_colectivos',
                title: 'Equipamientos Colectivos — Medellín',
                description: 'Inventario de infraestructura comunitaria en Medellín: centros comunitarios, UVA, centros de atención al ciudadano, sedes JAC, hogares infantiles, CAI policiales, estaciones de bomberos y equipamientos religiosos.',
                source: 'Departamento Administrativo de Planeación — DAP Medellín',
                // ⚠️  Dataset equipamientos colectivos Medellín
                // URL: https://www.datos.gov.co/Vivienda-Ciudad-y-Territorio/Equipamientos-Colectivos-Medell-n/bj6g-xy9g
                resourceId: 'bj6g-xy9g',
                endpoint: 'https://www.datos.gov.co/resource/bj6g-xy9g.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Vivienda-Ciudad-y-Territorio/Equipamientos-Colectivos-Medell-n/bj6g-xy9g',
                limit: 1000,
                tags: ['equipamientos', 'infraestructura comunitaria', 'UVA', 'JAC', 'Medellín'],
                numericCols: ['area_m2', 'num_beneficiarios'],
                dateCols: ['fecha_construccion', 'fecha_actualizacion'],
                categoryCols: ['nombre', 'tipo_equipamiento', 'sector', 'barrio', 'comuna', 'estado'],
                keyFacts: ['+4.000 equipamientos colectivos en Medellín', 'Las UVA de EPM cubren 20 comunas', 'Las comunas populares del norte tienen el mayor déficit de equipamientos per cápita'],
            },
            {
                id: 'espacio_publico_efectivo',
                title: 'Espacio Público Efectivo — Medellín',
                description: 'Indicadores de espacio público efectivo por habitante en Medellín desglosados por barrio y comuna. Incluye m² de espacio público por persona, tipo de espacio y déficit frente al estándar ONU de 15 m²/hab.',
                source: 'Departamento Administrativo de Planeación DAP Medellín',
                // ⚠️  Dataset espacio público Medellín
                // URL: https://www.datos.gov.co/Vivienda-Ciudad-y-Territorio/Espacio-P-blico-Efectivo-Medell-n/qc3n-bpex
                resourceId: 'qc3n-bpex',
                endpoint: 'https://www.datos.gov.co/resource/qc3n-bpex.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Vivienda-Ciudad-y-Territorio/Espacio-P-blico-Efectivo-Medell-n/qc3n-bpex',
                limit: 1000,
                tags: ['espacio público', 'habitabilidad', 'urbanismo', 'm² por habitante', 'Medellín'],
                numericCols: ['m2_por_habitante', 'area_total_m2', 'poblacion', 'deficit_m2'],
                dateCols: ['año'],
                categoryCols: ['barrio', 'comuna', 'tipo_espacio', 'cumple_estandar_onu'],
                keyFacts: ['Medellín tiene 4,5 m² de espacio público por habitante (meta ONU: 15 m²)', 'El Poblado tiene 18 m²/hab mientras Manrique tiene 1,2 m²/hab', 'El déficit total de espacio público en Medellín supera los 7 millones de m²'],
            },
        ],
    },

    // ── 8. SERVICIOS PÚBLICOS ────────────────────────────────
    {
        id: 'servicios',
        title: 'Servicios Públicos',
        subtitle: 'Energía, acueducto, internet y gas natural — EPM y operadores del Valle de Aburrá',
        icon: '⚡',
        color: '#0694a2',
        colorLight: '#ecfeff',
        colorDark: '#164e63',
        page: 'secciones/servicios.html',
        datasets: [
            {
                id: 'estratificacion_medellin',
                title: 'Estratificación Socioeconómica — Medellín',
                description: 'Estratificación socioeconómica (1 al 6) de los predios residenciales de Medellín por barrio y comuna. Permite cruzar con indicadores de servicios públicos, cobertura y tarifas.',
                source: 'Departamento Administrativo de Planeación — DAP Medellín',
                // ✅ Dataset estratificación Medellín en datos.gov.co
                // URL: https://www.datos.gov.co/Vivienda-Ciudad-y-Territorio/Estratificaci-n-Socioecon-mica-Medell-n/e6pb-f43n
                resourceId: 'e6pb-f43n',
                endpoint: 'https://www.datos.gov.co/resource/e6pb-f43n.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Vivienda-Ciudad-y-Territorio/Estratificaci-n-Socioecon-mica-Medell-n/e6pb-f43n',
                limit: 1000,
                tags: ['estratificación', 'socioeconómico', 'tarifas', 'predios', 'Medellín'],
                numericCols: ['estrato', 'num_predios', 'num_habitantes'],
                dateCols: ['año_actualizacion'],
                categoryCols: ['barrio', 'comuna', 'zona', 'tipo_predio'],
                keyFacts: ['El 55% de los predios residenciales de Medellín son estrato 1, 2 o 3', 'El Poblado concentra la mayor cantidad de predios estrato 6', 'La estratificación define los subsidios y contribuciones en servicios públicos'],
            },
            {
                id: 'cobertura_servicios_epm',
                title: 'Cobertura Servicios Públicos — EPM Valle de Aburrá',
                description: 'Cobertura de energía eléctrica, acueducto, alcantarillado y gas natural en el Valle de Aburrá por municipio y estrato. Incluye número de usuarios, consumo promedio y tarifas de EPM.',
                source: 'EPM — Empresas Públicas de Medellín',
                // ✅ Dataset EPM servicios en datos.gov.co
                // URL: https://www.datos.gov.co/Ordenamiento-Territorial/Cobertura-Servicios-P-blicos-EPM/h5si-pq97
                resourceId: 'h5si-pq97',
                endpoint: 'https://www.datos.gov.co/resource/h5si-pq97.json?$limit=1000',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Ordenamiento-Territorial/Cobertura-Servicios-P-blicos-EPM/h5si-pq97',
                limit: 1000,
                tags: ['EPM', 'servicios públicos', 'cobertura', 'energía', 'acueducto', 'Valle de Aburrá'],
                numericCols: ['usuarios', 'cobertura_pct', 'consumo_promedio'],
                dateCols: ['año', 'periodo'],
                categoryCols: ['municipio', 'servicio', 'estrato', 'zona'],
                keyFacts: ['EPM tiene cobertura del 99,9% en energía en el Valle de Aburrá', 'El agua de Medellín tiene certificación de calidad ICA nivel 5 (sin riesgo)', 'El gas natural llega al 85% de los hogares de Medellín'],
            },
            {
                id: 'internet_medellin',
                title: 'Conectividad a Internet — Antioquia (MINTIC)',
                description: 'Indicadores de acceso a internet fijo y móvil en Antioquia y sus municipios (incluye Medellín): suscriptores por tecnología, velocidades promedio de descarga y carga, penetración porcentual y brecha digital entre estratos.',
                source: 'MinTIC — Boletín Trimestral de TIC Colombia',
                // ✅ Dataset conectividad MinTIC en datos.gov.co
                // URL: https://www.datos.gov.co/Telecomunicaciones/Suscriptores-Internet-Fijo-por-Departamento-y-Muni/j4hv-5xdb
                resourceId: 'j4hv-5xdb',
                endpoint: 'https://www.datos.gov.co/resource/j4hv-5xdb.json?$limit=1000&$where=departamento=%27ANTIOQUIA%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Telecomunicaciones/Suscriptores-Internet-Fijo-por-Departamento-y-Muni/j4hv-5xdb',
                limit: 1000,
                tags: ['internet', 'conectividad', 'TIC', 'MinTIC', 'Medellín', 'Antioquia'],
                numericCols: ['suscriptores_fijos', 'penetracion_pct', 'velocidad_bajada_mbps'],
                dateCols: ['trimestre', 'año'],
                categoryCols: ['departamento', 'municipio', 'tecnologia', 'operador', 'rango_velocidad'],
                keyFacts: ['La penetración de internet en Medellín supera el 75%', 'La brecha digital entre estrato 1-2 y 5-6 en Medellín es del 40%', 'Medellín tiene más de 1.200 puntos de WiFi gratuito en zonas públicas'],
            },
            {
                id: 'calidad_agua_potable',
                title: 'Calidad del Agua Potable — SIVICAP Colombia',
                description: 'Índice de Riesgo de la Calidad del Agua para Consumo Humano (IRCA) en Colombia, incluyendo Medellín y municipios del Valle de Aburrá. Indicadores: turbiedad, cloro residual, pH, coliformes y nivel de riesgo.',
                source: 'INS / SIVICAP — SSPD Colombia',
                // ✅ Dataset IRCA agua potable en datos.gov.co
                // URL: https://www.datos.gov.co/Salud-y-Protecci-n-Social/IRCA-Nacional-SIVICAP/gdh9-gqmb
                resourceId: 'gdh9-gqmb',
                endpoint: 'https://www.datos.gov.co/resource/gdh9-gqmb.json?$limit=1000&$where=departamento=%27ANTIOQUIA%27',
                portal: 'datos.gov.co',
                portalUrl: 'https://www.datos.gov.co/Salud-y-Protecci-n-Social/IRCA-Nacional-SIVICAP/gdh9-gqmb',
                limit: 1000,
                tags: ['agua potable', 'IRCA', 'calidad agua', 'acueducto', 'Medellín', 'Antioquia'],
                numericCols: ['irca_pct', 'turbiedad', 'cloro_residual', 'ph'],
                dateCols: ['año', 'periodo'],
                categoryCols: ['departamento', 'municipio', 'municipio_acueducto', 'nivel_riesgo', 'fuente_abastecimiento'],
                keyFacts: ['El agua de Medellín tiene IRCA en nivel SIN RIESGO (<5%)', 'Las fuentes La Fe, Piedras Blancas y Manantiales abastecen el 90% de Medellín', 'EPM es referente nacional en calidad del agua en grandes ciudades'],
            },
        ],
    },

];

// ── HELPERS ───────────────────────────────────────────────────
function getSectionById(id) { return SECTIONS.find(s => s.id === id); }
function getDatasetById(secId, dsId) {
    const s = getSectionById(secId);
    return s?.datasets.find(d => d.id === dsId);
}
function getAllDatasets() {
    return SECTIONS.flatMap(s => s.datasets.map(d => ({ ...d, sectionId: s.id, sectionTitle: s.title })));
}

if (typeof module !== 'undefined') module.exports = { CONFIG, SECTIONS, socrataUrl, getSectionById, getDatasetById, getAllDatasets };
