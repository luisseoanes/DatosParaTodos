// ============================================================
//  DatosParaTodos — Configuración central
//  Todos los datasets, secciones y endpoints en un solo lugar
// ============================================================

const CONFIG = {
    siteName: 'DatosParaTodos',
    siteTagline: 'Plataforma de Datos Abiertos de Medellín',
    version: '1.1.0',
    backendApiBase: 'http://127.0.0.1:8000',
    // Gemini API — el usuario la ingresa en la UI
    geminiModel: 'gemini-2.0-flash',
    geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    // datos.gov.co base API (Socrata SODA)
    socrataBase: 'https://www.datos.gov.co/resource',
    socrataAppToken: '', // Inyectar token aquí para evitar límites de API (429)
};

// ============================================================
//  SECCIONES — cada sección tiene su página, ícono, color y datasets
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
                id: 'incidentes_viales',
                title: 'Incidentes Viales',
                description: 'Incidentes de tránsito registrados por la Secretaría de Movilidad de la Alcaldía de Medellín desde 2014. Incluye clase del incidente, gravedad, barrio, comuna, tipo de vehículo y condiciones del momento. Dataset histórico más completo de siniestralidad vial urbana de la ciudad.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/9wqu-juqb.json',
                limit: 1000,
                tags: ['siniestralidad', 'tránsito', 'seguridad vial'],
                dateCols: ['fecha_incidente'],
                numericCols: ['gravedad', 'clase_incidente'],
                categoryCols: ['barrio', 'comuna', 'tipo_vehiculo']
            },
            {
                id: 'victimas_incidentes_viales',
                title: 'Víctimas en Incidentes Viales',
                description: 'Víctimas en incidentes de tránsito registrados por la Secretaría de Movilidad, georreferenciados en el Mapa de Medellín anualmente. Permite cruzar víctimas fatales y no fatales con barrio, comuna y tipo de vía.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/bkec-fpy9.json',
                limit: 1000,
                tags: ['víctimas', 'movilidad', 'Medellín'],
                dateCols: ['fecha'],
                numericCols: ['cantidad'],
                categoryCols: ['barrio', 'comuna', 'tipo_via']
            },
            {
                id: 'incidentes_viales_motos',
                title: 'Incidentes Viales con Motos',
                description: 'Incidentes de tránsito con motocicletas registrados por la Secretaría de Movilidad de la Alcaldía de Medellín, anual. Permite analizar la siniestralidad específica del modo más vulnerable de la ciudad.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/6v9g-zujz.json',
                limit: 1000,
                tags: ['motos', 'seguridad', 'Medellín'],
                dateCols: ['fecha'],
                numericCols: ['gravedad'],
                categoryCols: ['tipo_motocicleta', 'comuna']
            },
            {
                id: 'criminalidad_consolidado',
                title: 'Consolidado Criminalidad por Año y Mes',
                description: 'Dataset del SISC (Sistema de Información para la Seguridad y la Convivencia) con el consolidado de casos criminales incluyendo extorsión, homicidios, hurtos a personas, carros, motos y residencias, por año y mes. Permite análisis de tendencias de seguridad a lo largo del tiempo.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/ha7m-7wwj.json',
                limit: 1000,
                tags: ['SISC', 'seguridad', 'crimen'],
                dateCols: ['fecha'],
                numericCols: ['cantidad'],
                categoryCols: ['tipo_delito', 'zona']
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
                description: 'Homicidios registrados por la mesa de revisión y validación de casos de homicidio de la Secretaría de Seguridad de Medellín. Contiene barrio, comuna, fecha, presunto móvil, arma empleada, género de la víctima y grupo de edad.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m8fd-ahd9.json',
                limit: 1000,
                tags: ['SISC', 'homicidios', 'seguridad'],
                dateCols: ['fecha_hecho'],
                numericCols: ['cantidad'],
                categoryCols: ['zona', 'sexo', 'arma_medio', 'spoa_caracterizacion']
            },
            {
                id: 'hurtos_medellin',
                title: 'Hurtos a Personas',
                description: 'Delitos de hurto a personas registrados en Medellín por el SISC. Incluye barrio, comuna, modalidad, tipo de bien hurtado, arma usada, zona y horario del hecho. Permite identificar patrones territoriales de inseguridad cotidiana.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nvfz-tncu.json',
                limit: 1000,
                tags: ['hurtos', 'Medellín', 'convivencia'],
                dateCols: ['fecha'],
                numericCols: ['cantidad'],
                categoryCols: ['barrio', 'modalidad', 'arma_medio']
            },
            {
                id: 'violencia_intrafamiliar',
                title: 'Violencia Intrafamiliar',
                description: 'Casos de violencia intrafamiliar (VIF) registrados en Medellín. Detalla tipo de violencia (física, psicológica, sexual, económica), relación entre agresor y víctima, barrio y comuna.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/maed-tz2y.json',
                limit: 1000,
                tags: ['VIF', 'derechos', 'Medellín'],
                dateCols: ['fecha'],
                numericCols: ['cantidad'],
                categoryCols: ['tipo_violencia', 'vinculo_agresor']
            },
            {
                id: 'lesiones_personales',
                title: 'Lesiones Personales',
                description: 'Lesiones personales (riñas, agresiones) denunciadas a nivel nacional, con desagregación por municipio. Permite filtrar Medellín. Incluye tipo de lesión, días de incapacidad, mecanismo de agresión, género y edad.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/dzrc-q2v4.json',
                limit: 1000,
                tags: ['riñas', 'convivencia', 'seguridad'],
                dateCols: ['fecha'],
                numericCols: ['dias_incapacidad'],
                categoryCols: ['mecanismo_agresion', 'genero', 'edad']
            }
        ]
    },
    {
        id: 'medioambiente',
        title: 'Medio Ambiente y Aire',
        subtitle: 'Calidad del aire, recursos hídricos y monitoreo ambiental en Medellín',
        icon: '🌿',
        color: '#057a55',
        colorLight: '#e8f8f2',
        colorDark: '#014737',
        page: 'secciones/medioambiente.html',
        stats: ['Estaciones SIATA', 'Calidad aire', 'Arbolado'],
        datasets: [
            {
                id: 'calidad_aire_siata',
                title: 'Calidad del Aire',
                description: 'Mediciones de contaminantes atmosféricos de las estaciones SIATA en el Valle de Aburrá. Incluye PM2.5, PM10, O3, NO2, CO, temperatura, humedad e Índice de Calidad del Aire (ICA).',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m4ur-8xpa.json',
                limit: 1000,
                tags: ['PM2.5', 'SIATA', 'contaminación'],
                dateCols: ['fecha'],
                numericCols: ['pm25', 'pm10', 'ica'],
                categoryCols: ['estacion', 'municipio']
            },
            {
                id: 'residuos_solidos',
                title: 'Residuos Sólidos',
                description: 'Generación y gestión de residuos sólidos en Medellín. Incluye toneladas recolectadas por barrio/comuna, porcentaje de aprovechamiento (reciclaje), tipo de residuo y disposición final.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m2ah-gw6y.json',
                limit: 1000,
                tags: ['reciclaje', 'residuos', 'sostenibilidad'],
                dateCols: ['periodo'],
                numericCols: ['toneladas_recolectadas', 'pct_aprovechamiento'],
                categoryCols: ['barrio', 'tipo_residuo']
            },
            {
                id: 'arbolado_urbano',
                title: 'Arbolado Urbano',
                description: 'Censo e inventario del arbolado urbano de Medellín. Incluye especie, diámetro, altura, estado fitosanitario, barrio y comuna. Clave para análisis de servicios ecosistémicos y confort térmico urbano.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/m4wi-nn8x.json',
                limit: 1000,
                tags: ['árboles', 'verde', 'Medellín'],
                dateCols: ['fecha_censo'],
                numericCols: ['diametro', 'altura'],
                categoryCols: ['especie', 'barrio', 'comuna']
            },
            {
                id: 'ruido_ambiental',
                title: 'Ruido Ambiental',
                description: 'Mediciones de niveles de ruido ambiental en Medellín en puntos fijos de monitoreo. Incluye nivel de presión sonora (dB), horario (diurno/nocturno), barrio y comparación con la norma colombiana (Resolución 0627/2006).',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/pxmc-bbtu.json',
                limit: 1000,
                tags: ['ruido', 'sonoro', 'Medellín'],
                dateCols: ['fecha'],
                numericCols: ['db_diurno', 'db_nocturno'],
                categoryCols: ['barrio', 'horario']
            }
        ]
    },
    {
        id: 'salud',
        title: 'Salud y Bienestar',
        subtitle: 'Seguimiento epidemiológico, vacunación y servicios de salud en Medellín',
        icon: '🏥',
        color: '#0e9f6e',
        colorLight: '#ecfdf5',
        colorDark: '#065f46',
        page: 'secciones/salud.html',
        stats: ['Eventos SIVIGILA', 'Mortalidad', 'Vacunación'],
        datasets: [
            {
                id: 'mortalidad_medellin',
                title: 'Mortalidad',
                description: 'Registros de mortalidad en Medellín con causas de muerte según CIE-10, sexo, edad, barrio y comuna. Permite identificar las principales causas de muerte en la ciudad y su distribución territorial.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/3x4x-7t5t.json',
                limit: 1000,
                tags: ['mortalidad', 'CIE-10', 'salud pública'],
                dateCols: ['fecha'],
                numericCols: ['edad'],
                categoryCols: ['causa_muerte', 'sexo', 'comuna']
            },
            {
                id: 'morbilidad_eventos_salud',
                title: 'Eventos en Salud Pública',
                description: 'Notificaciones de eventos de interés en salud pública en Medellín al SIVIGILA: enfermedades transmisibles (dengue, COVID-19, tuberculosis, VIH), eventos de salud mental, accidentes ofídicos y otros. Desagregados por barrio, comuna, semana epidemiológica y grupo poblacional.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nywv-thuy.json',
                limit: 1000,
                tags: ['SIVIGILA', 'epidemiología', 'Medellín'],
                dateCols: ['semana_epidemiologica'],
                numericCols: ['cantidad'],
                categoryCols: ['evento', 'barrio', 'genero']
            },
            {
                id: 'vacunacion_medellin',
                title: 'Cobertura de Vacunación',
                description: 'Indicadores de cobertura del Programa Ampliado de Inmunizaciones (PAI) en Medellín, por tipo de vacuna, barrio, comuna y año. Permite identificar brechas de inmunización en el territorio.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/3ciz-tpgr.json',
                limit: 1000,
                tags: ['vacunas', 'PAI', 'salud'],
                dateCols: ['anio'],
                numericCols: ['cobertura_pct'],
                categoryCols: ['tipo_vacuna', 'comuna']
            },
            {
                id: 'camas_hospitalarias',
                title: 'Oferta de Servicios Hospitalarios',
                description: 'Registro de habilitación de servicios hospitalarios en Antioquia, incluyendo Medellín: camas hospitalarias por tipo (UCI, básica, obstétrica), servicios habilitados por IPS, nivel de complejidad y municipio.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/ttnc-9dzn.json',
                limit: 1000,
                tags: ['IPS', 'camas', 'UCI'],
                dateCols: ['fecha_inscripcion'],
                numericCols: ['cantidad_camas'],
                categoryCols: ['tipo_servicio', 'complejidad', 'ips']
            }
        ]
    },
    {
        id: 'economia',
        title: 'Economía y Empleo',
        subtitle: 'Precios de alimentos, mercado laboral e indicadores económicos para el ciudadano',
        icon: '📈',
        color: '#b45309',
        colorLight: '#fffbeb',
        colorDark: '#92400e',
        page: 'secciones/economia.html',
        stats: ['Mercado laboral', 'Empresas activas', 'Contratos'],
        datasets: [
            {
                id: 'mercado_laboral',
                title: 'Mercado Laboral',
                description: 'Indicadores del mercado laboral de Medellín (tasa de desempleo, ocupación, subempleo e informalidad) por trimestre y comuna, obtenidos de la Gran Encuesta Integrada de Hogares (GEIH) del convenio DANE-Alcaldía.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/gifa-4us7.json',
                limit: 1000,
                tags: ['desempleo', 'trabajo', 'GEIH'],
                dateCols: ['periodo'],
                numericCols: ['tasa_desempleo', 'tasa_ocupacion'],
                categoryCols: ['sexo', 'rango_edad', 'comuna']
            },
            {
                id: 'empresas_medellin',
                title: 'Empresas Registradas',
                description: 'Empresas registradas ante la Cámara de Comercio de Medellín para Antioquia. Incluye tamaño, sector económico (CIIU), municipio, año de constitución y estado (activa/liquidada).',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/5p3b-9c2s.json',
                limit: 1000,
                tags: ['Cámara Comercio', 'empresas', 'CIIU'],
                dateCols: ['año_constitucion'],
                numericCols: ['empleados'],
                categoryCols: ['sector', 'tamaño', 'estado']
            },
            {
                id: 'turismo_medellin',
                title: 'Turismo',
                description: 'Estadísticas de visitantes (nacionales e internacionales) a Medellín, ocupación hotelera, llegadas aéreas y procedencia de turistas. Fuente: Corporación de Turismo de Medellín y Aeropuerto Olaya Herrera.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/2c3c-rwky.json',
                limit: 1000,
                tags: ['turistas', 'hoteles', 'vuelos'],
                dateCols: ['mes'],
                numericCols: ['cantidad_visitantes', 'pct_ocupacion'],
                categoryCols: ['nacionalidad', 'procedencia']
            },
            {
                id: 'contratos_medellin',
                title: 'Contratos Alcaldía de Medellín',
                description: 'Contratos celebrados por la Alcaldía de Medellín publicados en el SECOP. Permite auditar la contratación pública: objeto contractual, contratista, valor, fechas, tipo de contrato y dependencia contratante.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/d5us-jtj3.json',
                limit: 1000,
                tags: ['SECOP', 'contratos', 'transparencia'],
                dateCols: ['fecha_inicio', 'fecha_fin'],
                numericCols: ['valor_contrato'],
                categoryCols: ['contratista', 'tipo_contrato', 'dependencia']
            }
        ]
    },
    {
        id: 'educacion',
        title: 'Educación y Futuro',
        subtitle: 'Becas, calidad educativa, matrícula y deserción escolar en Medellín',
        icon: '🎓',
        color: '#5850ec',
        colorLight: '#f5f3ff',
        colorDark: '#3730a3',
        page: 'secciones/educacion.html',
        stats: ['SIMAT Medellín', 'Pruebas Saber 11', 'Instituciones'],
        datasets: [
            {
                id: 'instituciones_educativas',
                title: 'Instituciones Educativas',
                description: 'Directorio oficial de instituciones educativas en Medellín con sedes, carácter (oficial/privado), jornadas, niveles que ofrece, barrio y comuna.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/ivx6-nzbd.json',
                limit: 1000,
                tags: ['colegios', 'escuelas', 'directorio'],
                dateCols: [],
                numericCols: [],
                categoryCols: ['caracter', 'barrio', 'jornada']
            },
            {
                id: 'matricula_escolar',
                title: 'Matrícula Escolar SIMAT',
                description: 'Estadísticas de matrícula escolar en Medellín del SIMAT desagregadas por grado, nivel educativo, sector, jornada, zona y género. Permite analizar la cobertura educativa y la evolución de la población escolar por comunas.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/vedz-2i6v.json',
                limit: 1000,
                tags: ['SIMAT', 'inscripciones', 'cobertura'],
                dateCols: ['periodo'],
                numericCols: ['cantidad'],
                categoryCols: ['grado', 'sector', 'comuna']
            },
            {
                id: 'desercion_escolar',
                title: 'Deserción Escolar',
                description: 'Tasas y número de estudiantes que abandonan el sistema educativo en Medellín por grado, nivel, sector y zona. Identifica los territorios con mayor riesgo de abandono escolar.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/68eb-25rj.json',
                limit: 1000,
                tags: ['deserción', 'permanencia', 'educación'],
                dateCols: ['anio'],
                numericCols: ['tasa_desercion'],
                categoryCols: ['sector', 'nivel', 'comuna']
            },
            {
                id: 'resultados_saber',
                title: 'Resultados Pruebas Saber 11',
                description: 'Resultados de las Pruebas Saber 11° (ICFES) en colegios de Medellín con puntajes por área del conocimiento (matemáticas, lectura crítica, ciencias, sociales, inglés), puntaje global y clasificación del establecimiento.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/n7un-ry26.json',
                limit: 1000,
                tags: ['Saber 11', 'ICFES', 'calidad'],
                dateCols: ['periodo'],
                numericCols: ['puntaje_global', 'puntaje_matematicas'],
                categoryCols: ['colegio', 'nivel_ingles', 'clasificacion']
            }
        ]
    },
    {
        id: 'espacio',
        title: 'Gestión del Suelo y Espacio Público',
        subtitle: 'Equipamientos, parques y planeación urbana en Medellín',
        icon: '🏙️',
        color: '#6b7280',
        colorLight: '#f3f4f6',
        colorDark: '#374151',
        page: 'secciones/espacio.html',
        stats: ['Parques', 'Bibliotecas', 'Espacio Público'],
        datasets: [
            {
                id: 'bibliotecas_medellin',
                title: 'Red de Bibliotecas',
                description: 'Red de equipamientos culturales de Medellín: Parques Biblioteca, bibliotecas de barrio, casas de cultura, ludotecas y centros de desarrollo cultural. Incluye visitantes, servicios, horarios y aforo.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/8tjj-vcru.json',
                limit: 1000,
                tags: ['bibliotecas', 'cultura', 'visitantes'],
                dateCols: ['fecha'],
                numericCols: ['visitantes'],
                categoryCols: ['nombre_biblioteca', 'comuna', 'horario']
            },
            {
                id: 'parques_zonas_verdes',
                title: 'Parques y Zonas Verdes',
                description: 'Inventario de parques y zonas verdes de Medellín: parques metropolitanos, zonales, de barrio y lineales. Incluye área en m², equipamiento disponible, estado y barrio/comuna.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/v5fc-trb6.json',
                limit: 1000,
                tags: ['parques', 'verde', 'planeación'],
                dateCols: [],
                numericCols: ['area_m2'],
                categoryCols: ['nombre_parque', 'barrio', 'tipo_parque']
            },
            {
                id: 'equipamientos_colectivos',
                title: 'Equipamientos Colectivos',
                description: 'Inventario de infraestructura comunitaria en Medellín: centros comunitarios, UVA, centros de atención al ciudadano, sedes JAC, hogares infantiles, CAI policiales, estaciones de bomberos y equipamientos religiosos.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/k879-7jb3.json',
                limit: 1000,
                tags: ['infraestructura', 'social', 'CAI'],
                dateCols: [],
                numericCols: [],
                categoryCols: ['tipo_equipamiento', 'comuna', 'barrio']
            },
            {
                id: 'espacio_publico_efectivo',
                title: 'Espacio Público Efectivo',
                description: 'Indicadores de espacio público efectivo por habitante en Medellín desglosados por barrio y comuna. Incluye m² de espacio público por persona, tipo de espacio y déficit frente al estándar ONU de 15 m²/hab.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/nvfz-tncu.json',
                limit: 1000,
                tags: ['ONU', 'espacio público', 'habitantes'],
                dateCols: ['periodo'],
                numericCols: ['m2_habitante'],
                categoryCols: ['barrio', 'comuna']
            }
        ]
    },
    {
        id: 'servicios',
        title: 'Servicios y Conectividad',
        subtitle: 'Servicios públicos domiciliarios y acceso a internet en Medellín',
        icon: '⚡',
        color: '#0694a2',
        colorLight: '#ecfeff',
        colorDark: '#164e63',
        page: 'secciones/servicios.html',
        stats: ['Redes EPM', 'Internet', 'Agua potable'],
        datasets: [
            {
                id: 'estratificacion_medellin',
                title: 'Estratificación Socioeconómica',
                description: 'Estratificación socioeconómica (1 al 6) de los predios residenciales de Medellín por barrio y comuna. Permite cruzar con indicadores de servicios públicos, cobertura y tarifas.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/v5fc-trb6.json',
                limit: 1000,
                tags: ['estratos', 'predios', 'Medellín'],
                dateCols: [],
                numericCols: ['estrato'],
                categoryCols: ['barrio', 'comuna']
            },
            {
                id: 'cobertura_servicios_epm',
                title: 'Cobertura Servicios Públicos',
                description: 'Cobertura de energía eléctrica, acueducto, alcantarillado y gas natural en el Valle de Aburrá por municipio y estrato. Incluye número de usuarios, consumo promedio y tarifas de EPM.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/7kz2-y32s.json',
                limit: 1000,
                tags: ['EPM', 'cobertura', 'servicios'],
                dateCols: ['periodo'],
                numericCols: ['usuarios', 'consumo_promedio'],
                categoryCols: ['municipio', 'tipo_servicio', 'estrato']
            },
            {
                id: 'internet_medellin',
                title: 'Conectividad a Internet',
                description: 'Indicadores de acceso a internet fijo y móvil en Antioquia y sus municipios (incluye Medellín): suscriptores por tecnología, velocidades promedio de descarga y carga, penetración porcentual y brecha digital entre estratos.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/d6xh-3js2.json',
                limit: 1000,
                tags: ['conectividad', 'internet', 'TIC'],
                dateCols: ['trimestre'],
                numericCols: ['velocidad_mbps', 'penetración'],
                categoryCols: ['tecnologia', 'estrato']
            },
            {
                id: 'calidad_agua_potable',
                title: 'Calidad del Agua Potable',
                description: 'Índice de Riesgo de la Calidad del Agua para Consumo Humano (IRCA) en Colombia, incluyendo Medellín y municipios del Valle de Aburrá. Indicadores: turbiedad, cloro residual, pH, coliformes y nivel de riesgo.',
                source: 'Alcaldía de Medellín - datos.gov.co',
                endpoint: 'https://www.datos.gov.co/resource/7kz2-y32s.json',
                limit: 1000,
                tags: ['IRCA', 'agua', 'calidad'],
                dateCols: ['fecha'],
                numericCols: ['irca', 'cloro_residual', 'turbiedad'],
                categoryCols: ['municipio', 'punto_muestreo']
            }
        ]
    }
];

// Export for use in all pages
if (typeof module !== 'undefined') module.exports = { CONFIG, SECTIONS };
