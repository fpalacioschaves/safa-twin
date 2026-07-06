import './HelpPage.css';

interface HelpSection {
  id: string;
  title: string;
  summary: string;
  details: string[];
  tips?: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'dashboard',
    title: 'Panel principal',
    summary:
      'Es la pantalla de entrada tras iniciar sesión. Resume el estado general de la aplicación y la sesión activa.',
    details: [
      'Muestra el usuario conectado y sus roles asignados.',
      'Confirma que el frontend React y la API backend están comunicándose correctamente.',
      'Sirve como punto de partida para acceder al resto de módulos desde el menú lateral o la navegación móvil.',
    ],
    tips: [
      'Si la aplicación carga pero los datos no aparecen, revisa primero que el backend esté arrancado.',
      'Si la sesión caduca, vuelve a iniciar sesión desde la pantalla de acceso.',
    ],
  },
  {
    id: 'users',
    title: 'Usuarios',
    summary:
      'Permite administrar las cuentas que pueden entrar en la aplicación.',
    details: [
      'Se usa para crear, consultar, editar, activar, desactivar o archivar usuarios.',
      'Cada usuario puede tener roles diferentes, como administrador, coordinación, profesor o tutor.',
      'Los permisos reales se comprueban en el backend, no solo en la interfaz.',
    ],
    tips: [
      'No compartas usuarios entre personas distintas: cada acción debe poder atribuirse a una cuenta concreta.',
      'Desactiva o archiva usuarios que ya no deban acceder al sistema.',
    ],
  },
  {
    id: 'academic-years',
    title: 'Cursos académicos',
    summary:
      'Gestiona los años académicos sobre los que se organizan matrículas, evaluaciones, estadísticas y documentos.',
    details: [
      'Cada curso académico tiene fecha de inicio, fecha de fin, estado activo y puede marcarse como curso actual.',
      'Las matrículas, evaluaciones y formación en empresa se vinculan siempre a un curso académico concreto.',
      'Mantener bien este dato evita mezclar información de promociones diferentes.',
    ],
    tips: [
      'Antes de crear matrículas o evaluaciones, comprueba que el curso académico correcto existe y está activo.',
      'Solo debería haber un curso marcado como actual para evitar ambigüedades en informes.',
    ],
  },
  {
    id: 'centres',
    title: 'Centros',
    summary:
      'Permite registrar los centros educativos desde los que se gestionan alumnos, evaluaciones y formación en empresa.',
    details: [
      'Cada centro puede tener código, nombre, nombre corto, datos fiscales, dirección y datos de contacto.',
      'Las matrículas, evaluaciones y estancias en empresa quedan asociadas a un centro.',
      'El centro aparece en informes, memorias y documentos generados.',
    ],
    tips: [
      'Usa nombres cortos claros para que los documentos sean más legibles.',
      'No dupliques centros con nombres ligeramente distintos.',
    ],
  },
  {
    id: 'vocational-programmes',
    title: 'Ciclos formativos',
    summary:
      'Define los ciclos como DAW, DAM u otros programas formativos.',
    details: [
      'Cada ciclo tiene código, nombre, siglas, familia profesional, tipo y horas totales.',
      'Los módulos profesionales pertenecen a un ciclo concreto.',
      'Las estadísticas y memorias finales usan este dato para separar correctamente DAW, DAM u otros ciclos.',
    ],
    tips: [
      'No crees dos ciclos para representar el mismo plan de estudios.',
      'Revisa las siglas porque se usan en filtros, informes y futuras peticiones del gemelo digital.',
    ],
  },
  {
    id: 'academic-levels',
    title: 'Niveles académicos',
    summary:
      'Representa el curso o nivel dentro de un ciclo: por ejemplo primero o segundo.',
    details: [
      'Permite separar módulos de primer curso y segundo curso.',
      'Evita mezclar asignaturas de cursos distintos en estadísticas y memorias.',
      'Es imprescindible para generar memorias de un curso concreto de un ciclo.',
    ],
    tips: [
      'Comprueba que cada módulo está asociado al nivel correcto.',
      'Si una memoria mezcla módulos de primero y segundo, revisa primero la asociación módulo-nivel.',
    ],
  },
  {
    id: 'modules',
    title: 'Módulos profesionales',
    summary:
      'Gestiona las asignaturas o módulos que pertenecen a cada ciclo y nivel.',
    details: [
      'Cada módulo tiene código, nombre, siglas, horas y orden de visualización.',
      'Un módulo pertenece a un ciclo formativo y a un nivel académico concreto.',
      'Las matrículas, calificaciones, estadísticas e informes de evaluación dependen de esta configuración.',
    ],
    tips: [
      'No dupliques módulos dentro del mismo ciclo.',
      'El código oficial del módulo es clave para evitar confusiones en importaciones y documentos.',
    ],
  },
  {
    id: 'academic-offerings',
    title: 'Ofertas académicas',
    summary:
      'Representa la oferta concreta de un ciclo, curso, centro, modalidad y año académico.',
    details: [
      'Sirve para unir curso académico, centro, ciclo, nivel y modalidad.',
      'Está prevista como pieza estructural para controlar qué se imparte cada año.',
      'En la interfaz actual aparece como opción no activa hasta completar su pantalla de gestión.',
    ],
    tips: [
      'Cuando se active, será útil para validar que no se matriculen alumnos en ofertas inexistentes.',
    ],
  },
  {
    id: 'students',
    title: 'Alumnado',
    summary:
      'Gestiona los datos personales y académicos básicos de los alumnos.',
    details: [
      'Permite crear, consultar, editar, activar, archivar y filtrar alumnos.',
      'El alumno conserva su historial entre cursos académicos.',
      'Desde sus matrículas se relaciona con módulos, calificaciones y formación en empresa.',
    ],
    tips: [
      'Evita duplicar alumnos: revisa documento, código de alumno y correo antes de crear uno nuevo.',
      'Archivar un alumno no debe borrar su expediente histórico.',
    ],
  },
  {
    id: 'enrolments',
    title: 'Matrículas modulares',
    summary:
      'Relaciona alumnos con módulos concretos dentro de un curso académico y centro.',
    details: [
      'Cada matrícula indica qué alumno cursa qué módulo en qué año académico.',
      'El sistema permite estados como matriculado, baja, convalidado, exento, pendiente o completado.',
      'Las calificaciones se registran sobre matrículas concretas, no directamente sobre el alumno.',
    ],
    tips: [
      'Un alumno puede tener muchas matrículas porque puede cursar varios módulos.',
      'Si faltan alumnos en estadísticas o informes, revisa primero sus matrículas modulares.',
    ],
  },
  {
    id: 'evaluations',
    title: 'Evaluaciones y estados',
    summary:
      'Gestiona los periodos de evaluación y los estados de calificación.',
    details: [
      'Las evaluaciones tienen código, nombre, secuencia, fechas y estado.',
      'Los estados de calificación permiten registrar situaciones como NE, NP, NC, convalidado, exento o baja.',
      'Las evaluaciones cerradas o bloqueadas deben protegerse para evitar cambios indebidos.',
    ],
    tips: [
      'No conviertas estados no numéricos en notas.',
      'La secuencia de evaluación es importante para saber cuál es la última evaluación disponible.',
    ],
  },
  {
    id: 'assessment-schemes',
    title: 'Sistemas de calificación',
    summary:
      'Define cómo se calcula o estructura la calificación de un módulo.',
    details: [
      'Permite configurar componentes de evaluación como actividades, autoevaluaciones, foros, empresa u otros.',
      'Cada sistema pertenece a un curso académico, centro y módulo.',
      'Sirve como base para registrar notas de forma coherente y trazable.',
    ],
    tips: [
      'Comprueba que los porcentajes y componentes reflejan la programación real del módulo.',
      'No mezcles sistemas de calificación de cursos académicos distintos.',
    ],
  },
  {
    id: 'grades',
    title: 'Calificaciones',
    summary:
      'Permite registrar y consultar notas numéricas, notas finales y estados no numéricos.',
    details: [
      'Cada calificación pertenece a una matrícula y a una evaluación concreta.',
      'Puede tener nota numérica, nota final, estado, observaciones y bloqueo.',
      'Los informes y estadísticas calculan por separado evaluados, aprobados, suspensos y no evaluados.',
    ],
    tips: [
      'Una nota numérica y un estado no evaluable no significan lo mismo.',
      'Si una tasa de rendimiento parece baja, revisa los alumnos sin calificación numérica.',
    ],
  },
  {
    id: 'statistics',
    title: 'Estadísticas',
    summary:
      'Muestra indicadores académicos calculados a partir de datos reales.',
    details: [
      'Permite revisar matriculados, evaluados, aprobados, suspensos, no evaluados, tasas y distribución de notas.',
      'Ayuda a comparar ciclos, módulos, evaluaciones y evolución temporal.',
      'Los gráficos deben basarse en datos existentes; no se deben mostrar gráficos vacíos como si fueran resultados.',
    ],
    tips: [
      'Usa las estadísticas antes de generar memorias finales para detectar datos ausentes.',
      'Distingue siempre tasa de éxito y tasa de rendimiento.',
    ],
  },
  {
    id: 'company-training',
    title: 'Formación en empresa',
    summary:
      'Gestiona empresas, tutores, estancias, seguimientos e incidencias de la formación en empresa.',
    details: [
      'Permite registrar empresas colaboradoras y tutores laborales.',
      'Asocia alumnos con empresas, fechas, horarios, horas previstas, horas completadas y actividades.',
      'Incluye seguimientos, documentación pendiente, evaluación final e incidencias de empresa.',
    ],
    tips: [
      'Revisa documentación pendiente antes de cerrar una estancia.',
      'Las incidencias de empresa son distintas de las incidencias académicas generales.',
    ],
  },
  {
    id: 'company-training-reports',
    title: 'Informes de empresa',
    summary:
      'Agrupa informes específicos relacionados con la formación en empresa.',
    details: [
      'Sirve para revisar información de estancias, empresas, tutores, seguimientos e incidencias.',
      'Complementa la gestión diaria de formación en empresa.',
      'Se apoya en los datos introducidos en el módulo de formación en empresa.',
    ],
    tips: [
      'Si un informe de empresa sale incompleto, revisa primero las estancias y sus seguimientos.',
    ],
  },
  {
    id: 'document-templates',
    title: 'Plantillas documentales',
    summary:
      'Contiene el catálogo de documentos que la aplicación puede generar.',
    details: [
      'Incluye plantillas como informe de evaluación de módulo, memoria final, informe individual y memoria de formación en empresa.',
      'Cada plantilla define qué datos necesita y qué formatos puede generar.',
      'Las plantillas actuales ya se conectan con generadores reales, no con textos inventados.',
    ],
    tips: [
      'Selecciona siempre los filtros correctos antes de generar.',
      'Si la plantilla avisa de datos ausentes, revisa la fuente antes de usar el documento final.',
    ],
  },
  {
    id: 'generated-documents',
    title: 'Historial documental',
    summary:
      'Registra los documentos generados por la aplicación.',
    details: [
      'Guarda tipo de documento, usuario, fecha, parámetros, nombre de archivo, ruta, formato y tamaño.',
      'Permite descargar documentos generados previamente.',
      'Ayuda a mantener trazabilidad de informes, memorias y expedientes.',
    ],
    tips: [
      'Los archivos generados localmente no deben subirse al repositorio Git.',
      'El historial documental no sustituye a la revisión humana del contenido antes de entregar un documento oficial.',
    ],
  },
  {
    id: 'digital-twin',
    title: 'Gemelo digital',
    summary:
      'Será la capa de interpretación que permitirá pedir informes y consultas en lenguaje natural.',
    details: [
      'Su función será entender peticiones como “genera la memoria final de segundo de DAW”.',
      'Antes de generar, deberá resolver datos, detectar ambigüedades, avisar de incoherencias y pedir confirmación.',
      'No debe inventar datos: usará las mismas tablas, permisos y generadores documentales de la aplicación.',
    ],
    tips: [
      'La primera versión debe funcionar con reglas y comandos antes de conectar una IA externa.',
      'El gemelo digital será útil cuando los módulos de datos y documentos estén consolidados.',
    ],
  },
  {
    id: 'help',
    title: 'Ayuda',
    summary:
      'Esta pantalla explica el propósito y el uso de cada módulo de la aplicación.',
    details: [
      'Sirve como guía interna para usuarios nuevos o para recordar el flujo correcto de trabajo.',
      'Describe qué datos maneja cada sección y qué errores conviene evitar.',
      'Debe mantenerse actualizada cuando se añadan nuevas fases o pantallas.',
    ],
    tips: [
      'Consulta esta sección cuando no tengas claro dónde introducir o revisar un dato.',
    ],
  },
];

const recommendedWorkflow = [
  'Crear o revisar el curso académico actual.',
  'Comprobar centros, ciclos, niveles y módulos.',
  'Dar de alta o revisar alumnado.',
  'Crear matrículas modulares del alumnado.',
  'Configurar evaluaciones, estados y sistemas de calificación.',
  'Registrar calificaciones y revisar estados no numéricos.',
  'Consultar estadísticas para detectar datos ausentes o incoherentes.',
  'Gestionar formación en empresa cuando proceda.',
  'Generar documentos desde plantillas y revisar el historial documental.',
];

export function HelpPage() {
  return (
    <main className="dashboard-content help-page">
      <section className="help-hero">
        <div>
          <p className="eyebrow">Guía de uso</p>
          <h2>Ayuda de SAFA Twin</h2>
          <p>
            Esta pantalla explica cada zona de la aplicación, qué datos gestiona,
            para qué sirve y qué precauciones conviene tener antes de generar
            estadísticas, informes o documentos académicos.
          </p>
        </div>
      </section>

      <section className="help-layout">
        <aside className="help-index" aria-label="Índice de ayuda">
          <h3>Índice</h3>
          <nav>
            {helpSections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="help-content">
          <section className="help-card" id="workflow">
            <h3>Flujo recomendado de trabajo</h3>
            <ol className="help-ordered-list">
              {recommendedWorkflow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          {helpSections.map((section) => (
            <article className="help-card" id={section.id} key={section.id}>
              <p className="help-card-kicker">Módulo</p>
              <h3>{section.title}</h3>
              <p className="help-summary">{section.summary}</p>

              <h4>Qué permite hacer</h4>
              <ul>
                {section.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>

              {section.tips && section.tips.length > 0 ? (
                <div className="help-note">
                  <h4>Notas importantes</h4>
                  <ul>
                    {section.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
