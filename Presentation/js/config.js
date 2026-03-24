// ============================================================
//  DatosParaTodos — Configuración central
//  Todos los datasets, secciones y endpoints en un solo lugar
//  ENDPOINTS VERIFICADOS contra datos.gov.co SODA API
// ============================================================

const CONFIG = {
    siteName: 'DatosParaTodos',
    siteTagline: 'Plataforma de Datos Abiertos de Medellín',
    version: '1.2.0',
    backendApiBase: 'https://datosparatodos-production.up.railway.app',
    // Gemini API — el usuario la ingresa en la UI
    geminiModel: 'gemini-2.0-flash',
    geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    // datos.gov.co base API (Socrata SODA)
    socrataBase: 'https://www.datos.gov.co/resource',
    socrataAppToken: '', // Inyectar token aquí para evitar límites de API (429)
};

// ============================================================
//  SECCIONES — cada sección tiene su página, ícono, color y datasets
//  *** Todos los endpoints han sido verificados con SODA API ***
// ============================================================
const SECTIONS = [
    {
        id: 'movilidad',
        title: 'Movilidad y Transporte',
        subtitle: 'Infraestructura vial, accidentalidad y sistemas de transporte en Medellín',
        icon: '🚦',
        color: '#1a56db',
        colorLight: '#ebf2ff',
        colorDark: '#1e3a8a',
        page: 'secciones/movilidad.html',
        stats: ['Tránsito fluido', 'Rutas Medellín', 'Siniestralidad'],
        datasets: [
            {
                id: 'accidentes_transito_antioquia',
                title: 'Accidentes de Tránsito en Antioquia',
                description: 'Accidentes de tránsito reportados en los municipios con convenio con la Gerencia de Seguridad Vial de Antioquia. Incluye clase de accidente, gravedad, zona, municipio, causante y víctimas. Datos desde 2014 con actualización anual.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/xpyu-s4ma.json',
                limit: 1000,
                tags: ['siniestralidad', 'tránsito', 'seguridad vial'],
                dateCols: ['fecha_accidente'],
                numericCols: ['numero_victima_herido', 'numero_victima_muerto', 'numero_victima_peaton', 'numero_victima_conductor'],
                categoryCols: ['municipio', 'clase_accidente', 'gravedad', 'area_accidente', 'causante_accidente']
            },
            {
                id: 'mortalidad_antioquia',
                title: 'Mortalidad General en Antioquia',
                description: 'Número de casos y tasa anual de mortalidad general por municipio en Antioquia. Incluye región, código municipal y tasa por mil habitantes. Datos desde 2005 con actualización anual.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/fuc4-tvui.json',
                limit: 1000,
                tags: ['mortalidad', 'salud', 'Antioquia'],
                dateCols: ['anio'],
                numericCols: ['numerocasos', 'tasaxmilhabitantes'],
                categoryCols: ['nombremunicipio', 'nombreregion']
            },
            {
                id: 'accidentes_detalle',
                title: 'Detalle de Accidentalidad Vial',
                description: 'Detalle de accidentes por tipo de colisión, localización, zona y estado del clima. Permite analizar condiciones de siniestralidad vial en la región.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/xpyu-s4ma.json',
                limit: 1000,
                tags: ['accidentes', 'vial', 'clima'],
                dateCols: ['fecha_accidente'],
                numericCols: ['numero_victima_herido', 'numero_victima_muerto'],
                categoryCols: ['descripcion_localizacion', 'estado_clima', 'zona_accidente', 'sector_accidente']
            },
            {
                id: 'homicidios_nacional',
                title: 'Homicidios a Nivel Nacional',
                description: 'Homicidios registrados a nivel nacional con desagregación por departamento, municipio, zona, sexo, arma empleada y caracterización. Permite filtrar datos de Medellín y Antioquia.',
                source: 'Fiscalía/Policía Nacional - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m8fd-ahd9.json',
                limit: 1000,
                tags: ['SISC', 'seguridad', 'crimen'],
                dateCols: ['fecha_hecho'],
                numericCols: ['cantidad'],
                categoryCols: ['departamento', 'municipio', 'zona', 'sexo', 'arma_medio']
            }
        ]
    },
    {
        id: 'seguridad',
        title: 'Seguridad Ciudadana',
        subtitle: 'Estadísticas de criminalidad, convivencia y acciones de seguridad en Medellín',
        icon: '🛡️',
        color: '#9f1239',
        colorLight: '#fff1f2',
        colorDark: '#881337',
        page: 'secciones/seguridad.html',
        stats: ['Comunas monitoreadas', 'Hurtos reportados', 'Homicidios'],
        datasets: [
            {
                id: 'homicidios_medellin',
                title: 'Homicidios',
                description: 'Homicidios registrados a nivel nacional con desagregación por departamento, municipio, zona, sexo, arma empleada y tipo de homicidio. Permite filtrar Medellín y Antioquia.',
                source: 'Fiscalía/Policía Nacional - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m8fd-ahd9.json',
                limit: 1000,
                tags: ['SISC', 'homicidios', 'seguridad'],
                dateCols: ['fecha_hecho'],
                numericCols: ['cantidad'],
                categoryCols: ['departamento', 'municipio', 'zona', 'sexo', 'arma_medio', 'spoa_caracterizacion']
            },
            {
                id: 'delitos_alto_impacto',
                title: 'Delitos de Alto Impacto',
                description: 'Consolidado comparativo de delitos de alto impacto: homicidios, lesiones personales, violencia intrafamiliar, hurto a personas, hurto a comercio, hurto de vehículos y motos. Incluye variación porcentual y absoluta entre periodos.',
                source: 'Policía Nacional - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/4p95-h82w.json',
                limit: 1000,
                tags: ['hurtos', 'delitos', 'convivencia'],
                dateCols: [],
                numericCols: ['casos_denuncias_anterior', 'casos_denuncias_ltimo_periodo', 'variaci_n_absoluta'],
                categoryCols: ['delito', 'a_os_comparados', 'periodo_meses_comparado', 'fuente']
            },
            {
                id: 'homicidios_por_zona',
                title: 'Homicidios por Zona y Arma',
                description: 'Análisis de homicidios segmentados por zona (urbana/rural), tipo de arma y sexo de la víctima. Permite identificar patrones territoriales de violencia homicida.',
                source: 'Fiscalía/Policía Nacional - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m8fd-ahd9.json',
                limit: 1000,
                tags: ['VIF', 'violencia', 'Medellín'],
                dateCols: ['fecha_hecho'],
                numericCols: ['cantidad'],
                categoryCols: ['zona', 'arma_medio', 'sexo', '_modalidad_presunta']
            },
            {
                id: 'accidentes_gravedad',
                title: 'Accidentes por Gravedad',
                description: 'Accidentes de tránsito desagregados por gravedad (con muertos, con heridos, solo daños), tipo de accidente y número de víctimas. Útil para analizar la severidad de la siniestralidad vial.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/xpyu-s4ma.json',
                limit: 1000,
                tags: ['accidentes', 'gravedad', 'seguridad'],
                dateCols: ['fecha_accidente'],
                numericCols: ['numero_victima_herido', 'numero_victima_muerto', 'numero_victima_pasajero'],
                categoryCols: ['gravedad', 'clase_accidente', 'municipio', 'descripcion_localizacion']
            }
        ]
    },
    {
        id: 'medioambiente',
        title: 'Medio Ambiente y Aire',
        subtitle: 'Calidad del agua, indicadores ambientales y monitoreo en Medellín y Antioquia',
        icon: '🌿',
        color: '#057a55',
        colorLight: '#e8f8f2',
        colorDark: '#014737',
        page: 'secciones/medioambiente.html',
        stats: ['Municipios monitoreados', 'Calidad agua', 'IRCA'],
        datasets: [
            {
                id: 'calidad_agua_irca',
                title: 'Calidad del Agua Potable (IRCA)',
                description: 'Índice de Riesgo de la Calidad del Agua para Consumo Humano (IRCA) en Colombia. Incluye valores por departamento y municipio, desagregando entre zona urbana y rural. Niveles de riesgo: Sin riesgo (0-5%), Bajo (5-14%), Medio (14-35%), Alto (35-80%), Inviable (80-100%).',
                source: 'Instituto Nacional de Salud - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nxt2-39c3.json',
                limit: 1000,
                tags: ['IRCA', 'agua', 'contaminación'],
                dateCols: ['a_o'],
                numericCols: ['irca', 'ircaurbano', 'ircarural'],
                categoryCols: ['departamento', 'municipio', 'nivel_de_riesgo', 'nivel_de_riesgo_urbano', 'nivel_de_riesgo_rural']
            },
            {
                id: 'irca_urbano_rural',
                title: 'IRCA Urbano vs Rural',
                description: 'Comparativo del Índice de Riesgo de la Calidad del Agua entre zonas urbanas y rurales por municipio y departamento. Permite identificar brechas de calidad entre áreas.',
                source: 'Instituto Nacional de Salud - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nxt2-39c3.json',
                limit: 1000,
                tags: ['IRCA', 'urbano', 'rural'],
                dateCols: ['a_o'],
                numericCols: ['ircaurbano', 'ircarural', 'irca'],
                categoryCols: ['municipio', 'departamento', 'nivel_de_riesgo_urbano', 'nivel_de_riesgo_rural']
            },
            {
                id: 'mortalidad_ambiental',
                title: 'Mortalidad por Municipio en Antioquia',
                description: 'Tasa de mortalidad general por municipio en Antioquia. Incluye número de casos y tasa por mil habitantes, desagregado por región. Útil para cruzar con indicadores ambientales.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/fuc4-tvui.json',
                limit: 1000,
                tags: ['mortalidad', 'municipios', 'Antioquia'],
                dateCols: ['anio'],
                numericCols: ['numerocasos', 'tasaxmilhabitantes'],
                categoryCols: ['nombremunicipio', 'nombreregion']
            },
            {
                id: 'riesgo_agua_departamentos',
                title: 'Riesgo de Agua por Departamento',
                description: 'Nivel de riesgo del agua potable consolidado por departamento. IRCA promedio anual para evaluar la situación hídrica a nivel departamental en Colombia.',
                source: 'Instituto Nacional de Salud - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nxt2-39c3.json',
                limit: 1000,
                tags: ['departamentos', 'riesgo', 'agua'],
                dateCols: ['a_o'],
                numericCols: ['irca', 'ircaurbano', 'ircarural'],
                categoryCols: ['departamento', 'nivel_de_riesgo']
            }
        ]
    },
    {
        id: 'salud',
        title: 'Salud y Bienestar',
        subtitle: 'Mortalidad, indicadores de salud y calidad del agua en Medellín y Antioquia',
        icon: '🏥',
        color: '#0e9f6e',
        colorLight: '#ecfdf5',
        colorDark: '#065f46',
        page: 'secciones/salud.html',
        stats: ['Municipios Antioquia', 'Mortalidad', 'IRCA'],
        datasets: [
            {
                id: 'mortalidad_medellin',
                title: 'Mortalidad General en Antioquia',
                description: 'Número de casos y tasa anual de mortalidad general por municipio en Antioquia (incluye Medellín). Desde 2005, desagregado por región y municipio. Permite identificar diferencias territoriales en salud.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/fuc4-tvui.json',
                limit: 1000,
                tags: ['mortalidad', 'salud pública', 'Antioquia'],
                dateCols: ['anio'],
                numericCols: ['numerocasos', 'tasaxmilhabitantes'],
                categoryCols: ['nombremunicipio', 'nombreregion']
            },
            {
                id: 'mortalidad_por_region',
                title: 'Mortalidad por Región',
                description: 'Tasa de mortalidad agrupada por las subregiones de Antioquia: Valle de Aburrá, Oriente, Urabá, Suroeste, Norte, Occidente, Nordeste, Magdalena Medio y Bajo Cauca.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/fuc4-tvui.json',
                limit: 1000,
                tags: ['regiones', 'epidemiología', 'Antioquia'],
                dateCols: ['anio'],
                numericCols: ['numerocasos', 'tasaxmilhabitantes'],
                categoryCols: ['nombreregion', 'nombremunicipio']
            },
            {
                id: 'calidad_agua_salud',
                title: 'Calidad del Agua y Salud',
                description: 'Índice de Riesgo de la Calidad del Agua (IRCA) por municipio y departamento. Indicador clave de salud pública: un IRCA alto se asocia con mayor incidencia de enfermedades gastrointestinales.',
                source: 'Instituto Nacional de Salud - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nxt2-39c3.json',
                limit: 1000,
                tags: ['IRCA', 'agua', 'salud'],
                dateCols: ['a_o'],
                numericCols: ['irca', 'ircaurbano', 'ircarural'],
                categoryCols: ['departamento', 'municipio', 'nivel_de_riesgo']
            },
            {
                id: 'mortalidad_tendencia',
                title: 'Tendencia de Mortalidad',
                description: 'Evolución temporal de la tasa de mortalidad por municipio en Antioquia. Permite analizar tendencias de largo plazo y comparar entre municipios del Valle de Aburrá.',
                source: 'Gobernación de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/fuc4-tvui.json',
                limit: 1000,
                tags: ['tendencias', 'mortalidad', 'temporal'],
                dateCols: ['anio'],
                numericCols: ['tasaxmilhabitantes', 'numerocasos'],
                categoryCols: ['nombremunicipio', 'nombreregion']
            }
        ]
    },
    {
        id: 'economia',
        title: 'Economía y Empleo',
        subtitle: 'Estructura empresarial, turismo y contratación pública en Medellín y Antioquia',
        icon: '📈',
        color: '#b45309',
        colorLight: '#fffbeb',
        colorDark: '#92400e',
        page: 'secciones/economia.html',
        stats: ['Empresas Medellín', 'Turismo', 'Contratación'],
        datasets: [
            {
                id: 'empresas_medellin',
                title: 'Estructura Empresarial de Medellín',
                description: 'Empresas registradas en Medellín por comuna y actividad económica (CIIU). Incluye distribución en las 16 comunas y 5 corregimientos. Fuente: Cámara de Comercio de Medellín.',
                source: 'Cámara de Comercio de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/pb3w-3vmc.json',
                limit: 1000,
                tags: ['Cámara Comercio', 'empresas', 'CIIU'],
                dateCols: ['a_o'],
                numericCols: ['aranjuez', 'belen', 'buenos_aires', 'castilla', 'doce_de_octubre', 'el_poblado', 'guayabal', 'la_america', 'la_candelaria', 'laureles_estadio', 'manrique', 'popular', 'robledo', 'san_javier', 'villa_hermosa'],
                categoryCols: ['descripci_n', 'ciiu']
            },
            {
                id: 'empresas_por_comuna',
                title: 'Empresas por Comuna',
                description: 'Distribución de empresas por comunas de Medellín según código CIIU. Permite comparar la densidad empresarial entre El Poblado, La Candelaria, Laureles y otras comunas.',
                source: 'Cámara de Comercio de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/pb3w-3vmc.json',
                limit: 1000,
                tags: ['comunas', 'distribución', 'emprendimiento'],
                dateCols: ['a_o'],
                numericCols: ['el_poblado', 'la_candelaria', 'laureles_estadio', 'belen', 'la_america', 'robledo', 'guayabal'],
                categoryCols: ['descripci_n', 'ciiu']
            },
            {
                id: 'turismo_extranjeros',
                title: 'Turismo — Visitantes Extranjeros',
                description: 'Llegada de extranjeros no residentes por departamento de destino, ciudad y país de residencia. Incluye Medellín como ciudad de destino. Datos mensuales desde 2015.',
                source: 'MinComercio - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/7wm8-w5ad.json',
                limit: 1000,
                tags: ['turistas', 'extranjeros', 'viajes'],
                dateCols: [],
                numericCols: ['a_o', 'cant_extranjeros_no_residentes'],
                categoryCols: ['mes', 'departamento', 'ciudad', 'paisoeeresidencia']
            },
            {
                id: 'contratacion_publica',
                title: 'Plan de Adquisiciones — Antioquia',
                description: 'Plan Anual de Adquisiciones de la Contraloría General de Antioquia. Incluye código UNSPSC, modalidad de selección, duración, fuente de recursos y valor estimado del contrato.',
                source: 'Contraloría General de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/4hiw-hk4g.json',
                limit: 1000,
                tags: ['SECOP', 'contratos', 'transparencia'],
                dateCols: [],
                numericCols: ['valor_total_estimado', 'valor_estimado_en_la_vigencia', 'ano'],
                categoryCols: ['descripci_n', 'modalidad_de_selecci_n', 'fuente_de_los_recursos', 'duraci_n_del_contrato']
            }
        ]
    },
    {
        id: 'educacion',
        title: 'Educación y Futuro',
        subtitle: 'Resultados de pruebas Saber, calidad educativa y puntajes en Colombia',
        icon: '🎓',
        color: '#5850ec',
        colorLight: '#f5f3ff',
        colorDark: '#3730a3',
        page: 'secciones/educacion.html',
        stats: ['Saber 11', 'Saber Pro', 'Puntajes'],
        datasets: [
            {
                id: 'saber_11_resultados',
                title: 'Resultados Saber 11°',
                description: 'Resultados anonimizados de las pruebas Saber 11° del ICFES. Incluye puntajes por área (matemáticas, lectura crítica, ciencias naturales, sociales, inglés), puntaje global, colegio, departamento  y municipio.',
                source: 'ICFES - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/rnvb-vnyh.json',
                limit: 1000,
                tags: ['Saber 11', 'ICFES', 'calidad'],
                dateCols: ['periodo'],
                numericCols: ['punt_global', 'punt_matematicas', 'punt_lectura_critica', 'punt_c_naturales', 'punt_sociales_ciudadanas', 'punt_ingles'],
                categoryCols: ['cole_nombre_establecimiento', 'cole_depto_ubicacion', 'cole_mcpio_ubicacion', 'cole_naturaleza', 'cole_jornada', 'estu_genero']
            },
            {
                id: 'saber_11_colegios',
                title: 'Saber 11° por Colegio',
                description: 'Análisis de resultados Saber 11° por establecimiento educativo. Incluye naturaleza del colegio (oficial/privado), jornada, área de ubicación y NSE del establecimiento.',
                source: 'ICFES - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/rnvb-vnyh.json',
                limit: 1000,
                tags: ['colegios', 'oficial', 'privado'],
                dateCols: ['periodo'],
                numericCols: ['punt_global', 'punt_matematicas', 'punt_lectura_critica'],
                categoryCols: ['cole_nombre_establecimiento', 'cole_naturaleza', 'cole_area_ubicacion', 'cole_jornada', 'cole_bilingue']
            },
            {
                id: 'saber_pro_resultados',
                title: 'Resultados Saber Pro',
                description: 'Resultados anonimizados de las pruebas Saber Pro del ICFES (competencias específicas). Incluye puntaje, nivel de desempeño y nombre de la prueba por estudiante.',
                source: 'ICFES - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/6kwm-9788.json',
                limit: 1000,
                tags: ['Saber Pro', 'universidad', 'competencias'],
                dateCols: [],
                numericCols: ['result_puntaje'],
                categoryCols: ['result_nombreprueba', 'result_desempeno', 'result_codigoprueba']
            },
            {
                id: 'saber_11_genero',
                title: 'Saber 11° por Género',
                description: 'Análisis de brechas de género en los resultados Saber 11°: comparación de puntajes entre hombres y mujeres por área del conocimiento, estrato y tipo de colegio.',
                source: 'ICFES - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/rnvb-vnyh.json',
                limit: 1000,
                tags: ['género', 'equidad', 'educación'],
                dateCols: ['periodo'],
                numericCols: ['punt_global', 'punt_matematicas', 'punt_lectura_critica', 'punt_ingles'],
                categoryCols: ['estu_genero', 'fami_estratovivienda', 'cole_naturaleza', 'cole_depto_ubicacion']
            }
        ]
    },
    {
        id: 'espacio',
        title: 'Gestión del Suelo y Espacio Público',
        subtitle: 'Estructura empresarial, contratación y datos territoriales en Medellín',
        icon: '🏙️',
        color: '#6b7280',
        colorLight: '#f3f4f6',
        colorDark: '#374151',
        page: 'secciones/espacio.html',
        stats: ['Comunas', 'Empresas', 'Contratación'],
        datasets: [
            {
                id: 'empresas_territorio',
                title: 'Distribución Empresarial por Territorio',
                description: 'Distribución de empresas registradas en Medellín por comunas y corregimientos. Cada fila detalla la actividad económica CIIU y cuántas empresas tiene cada comuna. Clave para planeación urbana.',
                source: 'Cámara de Comercio de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/pb3w-3vmc.json',
                limit: 1000,
                tags: ['comunas', 'territorio', 'empresas'],
                dateCols: ['a_o'],
                numericCols: ['el_poblado', 'la_candelaria', 'laureles_estadio', 'belen', 'guayabal', 'robledo', 'castilla', 'aranjuez', 'san_javier'],
                categoryCols: ['descripci_n', 'ciiu']
            },
            {
                id: 'actividad_economica_comunas',
                title: 'Actividad Económica por Comunas',
                description: 'Detalle de las actividades económicas (CIIU) presentes en cada comuna de Medellín. Permite identificar vocaciones económicas territoriales y clusters productivos.',
                source: 'Cámara de Comercio de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/pb3w-3vmc.json',
                limit: 1000,
                tags: ['CIIU', 'actividad', 'clusters'],
                dateCols: ['a_o'],
                numericCols: ['popular', 'santa_cruz', 'manrique', 'villa_hermosa', 'buenos_aires', 'la_america', 'doce_de_octubre'],
                categoryCols: ['descripci_n', 'ciiu']
            },
            {
                id: 'contratacion_equipamientos',
                title: 'Contratación Pública Antioquia',
                description: 'Plan Anual de Adquisiciones: bienes y servicios contratados por la Contraloría de Antioquia. Indicador de inversión pública en infraestructura, equipamientos y servicios.',
                source: 'Contraloría General de Antioquia - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/4hiw-hk4g.json',
                limit: 1000,
                tags: ['infraestructura', 'inversión', 'contratación'],
                dateCols: [],
                numericCols: ['valor_total_estimado', 'valor_estimado_en_la_vigencia', 'ano'],
                categoryCols: ['descripci_n', 'modalidad_de_selecci_n', 'fuente_de_los_recursos']
            },
            {
                id: 'irca_espacio_publico',
                title: 'Calidad Ambiental por Municipio',
                description: 'Índice de Riesgo de la Calidad del Agua por municipio y departamento. Indicador de la calidad ambiental territorial útil para cruzar con datos de espacio público.',
                source: 'Instituto Nacional de Salud - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nxt2-39c3.json',
                limit: 1000,
                tags: ['IRCA', 'municipios', 'calidad'],
                dateCols: ['a_o'],
                numericCols: ['irca', 'ircaurbano', 'ircarural'],
                categoryCols: ['departamento', 'municipio', 'nivel_de_riesgo']
            }
        ]
    },
    {
        id: 'servicios',
        title: 'Servicios y Conectividad',
        subtitle: 'Internet fijo, conectividad digital y calidad del agua en Colombia',
        icon: '⚡',
        color: '#0694a2',
        colorLight: '#ecfeff',
        colorDark: '#164e63',
        page: 'secciones/servicios.html',
        stats: ['Internet Fijo', 'Suscriptores', 'Agua potable'],
        datasets: [
            {
                id: 'internet_fijo',
                title: 'Internet Fijo — Accesos por Tecnología',
                description: 'Suscriptores de internet fijo por departamento, municipio, proveedor, tecnología (XDSL, Cable, Fibra Óptica, Satelital), velocidad de descarga/subida y segmento (residencial, corporativo). Datos trimestrales 2015–2019.',
                source: 'MinTIC - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/n48w-gutb.json',
                limit: 1000,
                tags: ['internet', 'conectividad', 'TIC'],
                dateCols: [],
                numericCols: ['anno', 'no_de_accesos'],
                categoryCols: ['departamento', 'municipio', 'proveedor', 'tecnologia', 'segmento', 'trimestre']
            },
            {
                id: 'internet_velocidad',
                title: 'Velocidad de Internet por Municipio',
                description: 'Velocidades de descarga y subida de internet fijo por municipio y proveedor. Permite comparar la brecha digital entre centros urbanos y zonas rurales de Colombia.',
                source: 'MinTIC - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/n48w-gutb.json',
                limit: 1000,
                tags: ['velocidad', 'mbps', 'brecha digital'],
                dateCols: [],
                numericCols: ['no_de_accesos', 'anno'],
                categoryCols: ['municipio', 'departamento', 'tecnologia', 'velocidad_bajada', 'velocidad_subida', 'proveedor']
            },
            {
                id: 'internet_proveedores',
                title: 'Proveedores de Internet',
                description: 'Distribución de accesos a internet fijo por proveedor y segmento (residencial/corporativo). Permite analizar la competencia en el mercado de telecomunicaciones por municipio.',
                source: 'MinTIC - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/n48w-gutb.json',
                limit: 1000,
                tags: ['proveedores', 'mercado', 'telecomunicaciones'],
                dateCols: [],
                numericCols: ['no_de_accesos', 'anno'],
                categoryCols: ['proveedor', 'segmento', 'municipio', 'departamento', 'tecnologia']
            },
            {
                id: 'calidad_agua_potable',
                title: 'Calidad del Agua Potable',
                description: 'Índice de Riesgo de la Calidad del Agua (IRCA) en Colombia por municipio. Incluye IRCA urbano, rural y general, con nivel de riesgo según Resolución 2115 de 2007.',
                source: 'Instituto Nacional de Salud - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nxt2-39c3.json',
                limit: 1000,
                tags: ['IRCA', 'agua', 'calidad'],
                dateCols: ['a_o'],
                numericCols: ['irca', 'ircaurbano', 'ircarural'],
                categoryCols: ['departamento', 'municipio', 'nivel_de_riesgo', 'nivel_de_riesgo_urbano']
            }
        ]
    }
];

// Export for use in all pages
if (typeof module !== 'undefined') module.exports = { CONFIG, SECTIONS };
