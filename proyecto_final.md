# Proyecto Final de Minería de Datos

**Valor:** 30% | **Año:** 2026

---

Desarrollar un proyecto de Minería de Datos en Python, siguiendo la metodología **CRISP-DM** con **datos reales** en equipos de 2 personas. Los datos deben tener mínimo **10 variables** y **400 registros**.

---

## Criterios de Evaluación

### (1.5) Metodología CRISP-DM
Aplicar todas las fases de la metodología CRISP-DM. Como ayuda se sugiere el formato adjunto. Se debe entregar un informe con todas las fases documentadas.

### (1.0) Preparación de Datos
Desarrollar un Jupyter Notebook de preparación de datos en Python, incluyendo todos los pasos vistos en clase. Documentar los resultados en el informe de la metodología. Incluir el **pandas profiling** de los datos.

### (1.5) Modelo Predictivo Avanzado
Crear un modelo predictivo avanzado en Python, donde:

- Se balancea solo el **70% de los datos** (en caso de ser necesario el balanceo)
- Se realiza una **validación cruzada** con el 70%
- Se aplican **4 métodos de aprendizaje supervisado** de máquinas
- Se aplican **3 métodos de ensamble**
- Se calculan al menos **4 medidas de calidad** de cada modelo y se comparan para seleccionar los mejores modelos. Se deben interpretar todas las medidas obtenidas.
- De los 7 modelos creados, se seleccionan los **3 mejores** mediante un proceso de **análisis de diferencia estadística significativa (ANOVA y Tukey)**.
- Los 3 modelos seleccionados deben pasar por un proceso de **hiperparametrización con GridSearch y optimización** (algoritmos genéticos / optimización bayesiana). El mejor modelo resultante se almacena para ser llevado a despliegue.
- El modelo final se debe almacenar en un **Pipe** con las operaciones de preparación de los datos para el despliegue.
- Se realiza un **despliegue con interfaz gráfica Streamlit**.

### (1.0) Sustentación
Sustentar el desarrollo completo del trabajo en **20 minutos por equipo**, mostrando los resultados de cada fase de la metodología CRISP-DM. Deben participar todos los integrantes.

---

