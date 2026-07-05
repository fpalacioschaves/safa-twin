import { DocumentTemplateDefinition } from './document-template.types';

export const DOCUMENT_TEMPLATE_REGISTRY: DocumentTemplateDefinition[] = [
  {
    code: 'evaluation_group_report',
    name: 'Informe de evaluación de grupo',
    description:
      'Plantilla base para generar un informe de evaluación por grupo, módulo y periodo de evaluación, separando calificaciones numéricas de estados no evaluables.',
    category: 'evaluation',
    scope: ['academic_year', 'group', 'module'],
    outputFormats: ['docx', 'pdf', 'xlsx'],
    allowedRoles: ['Administrador', 'Jefatura', 'Coordinacion', 'Profesor', 'TutorGrupo'],
    requiredInputs: [
      {
        key: 'academicYearId',
        label: 'Curso académico',
        required: true,
        description: 'Identificador del curso académico sobre el que se genera el informe.'
      },
      {
        key: 'evaluationId',
        label: 'Evaluación',
        required: true,
        description: 'Identificador del periodo de evaluación.'
      },
      {
        key: 'groupId',
        label: 'Grupo',
        required: true,
        description: 'Identificador del grupo evaluado.'
      },
      {
        key: 'moduleId',
        label: 'Módulo',
        required: false,
        description: 'Identificador del módulo. Si no se indica, el informe puede agregarse por todos los módulos del grupo.'
      }
    ],
    variables: [
      {
        key: 'academicYear.name',
        label: 'Nombre del curso académico',
        type: 'string',
        required: true,
        description: 'Nombre visible del curso académico.',
        example: '2025/2026'
      },
      {
        key: 'evaluation.name',
        label: 'Nombre de la evaluación',
        type: 'string',
        required: true,
        description: 'Nombre del periodo de evaluación.',
        example: 'Segunda evaluación'
      },
      {
        key: 'group.name',
        label: 'Grupo',
        type: 'string',
        required: true,
        description: 'Nombre del grupo académico.',
        example: '2º DAW'
      },
      {
        key: 'module.name',
        label: 'Módulo',
        type: 'string',
        required: false,
        description: 'Nombre del módulo profesional, cuando el informe se genere por módulo.',
        example: 'Desarrollo Web en Entorno Servidor'
      },
      {
        key: 'stats.enrolled',
        label: 'Matriculados',
        type: 'number',
        required: true,
        description: 'Número de matrículas activas en el contexto del informe.'
      },
      {
        key: 'stats.evaluated',
        label: 'Evaluados',
        type: 'number',
        required: true,
        description: 'Número de alumnos con calificación numérica válida.'
      },
      {
        key: 'stats.passed',
        label: 'Aprobados',
        type: 'number',
        required: true,
        description: 'Número de alumnos aprobados.'
      },
      {
        key: 'stats.failed',
        label: 'Suspensos',
        type: 'number',
        required: true,
        description: 'Número de alumnos suspensos.'
      },
      {
        key: 'stats.notEvaluated',
        label: 'No evaluados',
        type: 'number',
        required: true,
        description: 'Número de alumnos con estados no numéricos como NE, NC, NP, PFE, convalidado, exento o baja.'
      },
      {
        key: 'stats.successRate',
        label: 'Tasa de éxito',
        type: 'number',
        required: true,
        description: 'Porcentaje de aprobados sobre evaluados.'
      },
      {
        key: 'stats.performanceRate',
        label: 'Tasa de rendimiento',
        type: 'number',
        required: true,
        description: 'Porcentaje de aprobados sobre matriculados.'
      }
    ],
    sections: [
      {
        key: 'cover',
        title: 'Portada',
        order: 1,
        required: true,
        description: 'Identificación del centro, curso, grupo, evaluación y fecha de generación.',
        variables: ['academicYear.name', 'evaluation.name', 'group.name']
      },
      {
        key: 'summary',
        title: 'Resumen ejecutivo',
        order: 2,
        required: true,
        description: 'Síntesis de resultados y advertencias sobre estados no evaluables.',
        variables: ['stats.enrolled', 'stats.evaluated', 'stats.successRate', 'stats.performanceRate']
      },
      {
        key: 'results',
        title: 'Resultados académicos',
        order: 3,
        required: true,
        description: 'Detalle de aprobados, suspensos, no evaluados y distribución de calificaciones.',
        variables: ['stats.passed', 'stats.failed', 'stats.notEvaluated']
      },
      {
        key: 'observations',
        title: 'Observaciones',
        order: 4,
        required: false,
        description: 'Comentarios del equipo docente, tutoría o coordinación.',
        variables: []
      }
    ],
    createdForPhase: '7A',
    isBaseTemplate: true,
    isActive: true
  },
  {
    code: 'final_memory_group',
    name: 'Memoria final de grupo',
    description:
      'Plantilla base para la memoria final de un grupo, con resultados académicos, evolución, absentismo, incidencias y propuestas de mejora.',
    category: 'final_memory',
    scope: ['academic_year', 'programme', 'level', 'group'],
    outputFormats: ['docx', 'pdf'],
    allowedRoles: ['Administrador', 'Jefatura', 'Coordinacion', 'TutorGrupo'],
    requiredInputs: [
      {
        key: 'academicYearId',
        label: 'Curso académico',
        required: true,
        description: 'Identificador del curso académico.'
      },
      {
        key: 'groupId',
        label: 'Grupo',
        required: true,
        description: 'Identificador del grupo del que se genera la memoria.'
      }
    ],
    variables: [
      {
        key: 'academicYear.name',
        label: 'Curso académico',
        type: 'string',
        required: true,
        description: 'Nombre del curso académico.',
        example: '2025/2026'
      },
      {
        key: 'programme.name',
        label: 'Ciclo formativo',
        type: 'string',
        required: true,
        description: 'Nombre del ciclo formativo.',
        example: 'Desarrollo de Aplicaciones Web'
      },
      {
        key: 'level.name',
        label: 'Curso',
        type: 'string',
        required: true,
        description: 'Nivel académico del grupo.',
        example: '2º'
      },
      {
        key: 'group.name',
        label: 'Grupo',
        type: 'string',
        required: true,
        description: 'Nombre del grupo.',
        example: '2º DAW'
      },
      {
        key: 'stats.enrolled',
        label: 'Alumnado matriculado',
        type: 'number',
        required: true,
        description: 'Número total de alumnos matriculados.'
      },
      {
        key: 'stats.averageGrade',
        label: 'Nota media',
        type: 'number',
        required: false,
        description: 'Nota media calculada solo con calificaciones numéricas.'
      },
      {
        key: 'attendance.absenteeismRate',
        label: 'Tasa de absentismo',
        type: 'number',
        required: false,
        description: 'Porcentaje de ausencias sobre sesiones registradas.'
      },
      {
        key: 'incidents.total',
        label: 'Incidencias',
        type: 'number',
        required: false,
        description: 'Número total de incidencias registradas durante el curso.'
      },
      {
        key: 'improvementProposals',
        label: 'Propuestas de mejora',
        type: 'array',
        required: false,
        description: 'Listado de propuestas de mejora redactadas por el equipo docente.'
      }
    ],
    sections: [
      {
        key: 'cover',
        title: 'Portada',
        order: 1,
        required: true,
        description: 'Identificación de curso, ciclo, grupo y centro.',
        variables: ['academicYear.name', 'programme.name', 'level.name', 'group.name']
      },
      {
        key: 'academic_results',
        title: 'Resultados académicos',
        order: 2,
        required: true,
        description: 'Resumen de resultados globales del grupo.',
        variables: ['stats.enrolled', 'stats.averageGrade']
      },
      {
        key: 'attendance',
        title: 'Asistencia y absentismo',
        order: 3,
        required: false,
        description: 'Análisis de asistencia, absentismo y patrones relevantes.',
        variables: ['attendance.absenteeismRate']
      },
      {
        key: 'incidents',
        title: 'Incidencias',
        order: 4,
        required: false,
        description: 'Resumen de incidencias académicas o disciplinarias.',
        variables: ['incidents.total']
      },
      {
        key: 'improvement',
        title: 'Propuestas de mejora',
        order: 5,
        required: false,
        description: 'Conclusiones y propuestas para el siguiente curso.',
        variables: ['improvementProposals']
      }
    ],
    createdForPhase: '7A',
    isBaseTemplate: true,
    isActive: true
  },
  {
    code: 'attendance_absenteeism_report',
    name: 'Informe de absentismo',
    description:
      'Plantilla base para generar informes de absentismo por alumno, grupo, módulo o periodo temporal.',
    category: 'attendance',
    scope: ['academic_year', 'group', 'module', 'student'],
    outputFormats: ['docx', 'pdf', 'xlsx', 'csv'],
    allowedRoles: ['Administrador', 'Jefatura', 'Coordinacion', 'Profesor', 'TutorGrupo'],
    requiredInputs: [
      {
        key: 'academicYearId',
        label: 'Curso académico',
        required: true,
        description: 'Identificador del curso académico.'
      },
      {
        key: 'groupId',
        label: 'Grupo',
        required: false,
        description: 'Grupo usado como filtro del informe.'
      },
      {
        key: 'studentId',
        label: 'Alumno',
        required: false,
        description: 'Alumno usado como filtro cuando el informe sea individual.'
      },
      {
        key: 'dateFrom',
        label: 'Fecha inicial',
        required: true,
        description: 'Inicio del periodo analizado.'
      },
      {
        key: 'dateTo',
        label: 'Fecha final',
        required: true,
        description: 'Fin del periodo analizado.'
      }
    ],
    variables: [
      {
        key: 'period.from',
        label: 'Desde',
        type: 'date',
        required: true,
        description: 'Fecha inicial del informe.'
      },
      {
        key: 'period.to',
        label: 'Hasta',
        type: 'date',
        required: true,
        description: 'Fecha final del informe.'
      },
      {
        key: 'attendance.totalSessions',
        label: 'Sesiones registradas',
        type: 'number',
        required: true,
        description: 'Número de sesiones con registro de asistencia.'
      },
      {
        key: 'attendance.totalAbsences',
        label: 'Ausencias',
        type: 'number',
        required: true,
        description: 'Número total de faltas de asistencia.'
      },
      {
        key: 'attendance.justifiedAbsences',
        label: 'Ausencias justificadas',
        type: 'number',
        required: false,
        description: 'Número de faltas justificadas.'
      },
      {
        key: 'attendance.unjustifiedAbsences',
        label: 'Ausencias injustificadas',
        type: 'number',
        required: false,
        description: 'Número de faltas injustificadas.'
      },
      {
        key: 'attendance.absenteeismRate',
        label: 'Tasa de absentismo',
        type: 'number',
        required: true,
        description: 'Porcentaje de ausencias sobre sesiones registradas.'
      }
    ],
    sections: [
      {
        key: 'cover',
        title: 'Portada',
        order: 1,
        required: true,
        description: 'Datos generales del informe y periodo analizado.',
        variables: ['period.from', 'period.to']
      },
      {
        key: 'summary',
        title: 'Resumen de asistencia',
        order: 2,
        required: true,
        description: 'Totales y tasa de absentismo.',
        variables: ['attendance.totalSessions', 'attendance.totalAbsences', 'attendance.absenteeismRate']
      },
      {
        key: 'detail',
        title: 'Detalle de ausencias',
        order: 3,
        required: false,
        description: 'Desglose por alumno, módulo, fecha o tipo de falta.',
        variables: ['attendance.justifiedAbsences', 'attendance.unjustifiedAbsences']
      }
    ],
    createdForPhase: '7A',
    isBaseTemplate: true,
    isActive: true
  },
  {
    code: 'student_academic_record',
    name: 'Informe individual del alumno',
    description:
      'Plantilla base para el expediente individual de un alumno con matrícula, calificaciones, asistencia, incidencias y formación en empresa.',
    category: 'student',
    scope: ['academic_year', 'student'],
    outputFormats: ['docx', 'pdf'],
    allowedRoles: ['Administrador', 'Jefatura', 'Coordinacion', 'Profesor', 'TutorGrupo', 'TutorFCT'],
    requiredInputs: [
      {
        key: 'studentId',
        label: 'Alumno',
        required: true,
        description: 'Identificador del alumno.'
      },
      {
        key: 'academicYearId',
        label: 'Curso académico',
        required: false,
        description: 'Curso académico usado para limitar el informe. Si no se indica, el expediente puede generarse como histórico.'
      }
    ],
    variables: [
      {
        key: 'student.fullName',
        label: 'Nombre completo',
        type: 'string',
        required: true,
        description: 'Nombre completo del alumno.'
      },
      {
        key: 'student.identifier',
        label: 'Identificador académico',
        type: 'string',
        required: false,
        description: 'Documento, código interno o identificador académico del alumno.'
      },
      {
        key: 'enrolments',
        label: 'Matrículas',
        type: 'array',
        required: true,
        description: 'Listado de matrículas del alumno.'
      },
      {
        key: 'grades',
        label: 'Calificaciones',
        type: 'array',
        required: false,
        description: 'Listado de calificaciones y estados.'
      },
      {
        key: 'attendance.summary',
        label: 'Resumen de asistencia',
        type: 'object',
        required: false,
        description: 'Resumen de asistencia del alumno.'
      },
      {
        key: 'incidents',
        label: 'Incidencias',
        type: 'array',
        required: false,
        description: 'Incidencias asociadas al alumno.'
      },
      {
        key: 'workPlacements',
        label: 'Formación en empresa',
        type: 'array',
        required: false,
        description: 'Estancias de formación en empresa asociadas al alumno.'
      }
    ],
    sections: [
      {
        key: 'student_data',
        title: 'Datos del alumno',
        order: 1,
        required: true,
        description: 'Identificación académica del alumno.',
        variables: ['student.fullName', 'student.identifier']
      },
      {
        key: 'enrolments',
        title: 'Matrículas',
        order: 2,
        required: true,
        description: 'Historial de matrículas.',
        variables: ['enrolments']
      },
      {
        key: 'grades',
        title: 'Calificaciones',
        order: 3,
        required: false,
        description: 'Resultados académicos y estados no numéricos.',
        variables: ['grades']
      },
      {
        key: 'attendance',
        title: 'Asistencia',
        order: 4,
        required: false,
        description: 'Resumen de asistencia.',
        variables: ['attendance.summary']
      },
      {
        key: 'work_placements',
        title: 'Formación en empresa',
        order: 5,
        required: false,
        description: 'Información de estancias, seguimientos e incidencias de empresa.',
        variables: ['workPlacements']
      }
    ],
    createdForPhase: '7A',
    isBaseTemplate: true,
    isActive: true
  },
  {
    code: 'work_placement_memory',
    name: 'Memoria de formación en empresa',
    description:
      'Plantilla base para documentar estancias de formación en empresa, seguimientos, incidencias, horas, actividades y evaluación final.',
    category: 'work_placement',
    scope: ['academic_year', 'programme', 'group', 'student', 'company', 'work_placement'],
    outputFormats: ['docx', 'pdf', 'xlsx'],
    allowedRoles: ['Administrador', 'Jefatura', 'Coordinacion', 'TutorGrupo', 'TutorFCT'],
    requiredInputs: [
      {
        key: 'academicYearId',
        label: 'Curso académico',
        required: true,
        description: 'Identificador del curso académico.'
      },
      {
        key: 'groupId',
        label: 'Grupo',
        required: false,
        description: 'Grupo de alumnado en formación en empresa.'
      },
      {
        key: 'studentId',
        label: 'Alumno',
        required: false,
        description: 'Alumno concreto cuando se genere una memoria individual.'
      },
      {
        key: 'companyId',
        label: 'Empresa',
        required: false,
        description: 'Empresa usada como filtro del informe.'
      }
    ],
    variables: [
      {
        key: 'workPlacement.totalStudents',
        label: 'Alumnos en empresa',
        type: 'number',
        required: true,
        description: 'Número de alumnos con estancia registrada.'
      },
      {
        key: 'workPlacement.totalHours',
        label: 'Horas totales',
        type: 'number',
        required: false,
        description: 'Suma de horas previstas o realizadas.'
      },
      {
        key: 'workPlacement.pendingDocuments',
        label: 'Documentación pendiente',
        type: 'array',
        required: false,
        description: 'Listado de documentos pendientes.'
      },
      {
        key: 'workPlacement.followUps',
        label: 'Seguimientos',
        type: 'array',
        required: false,
        description: 'Visitas, llamadas o controles de seguimiento.'
      },
      {
        key: 'workPlacement.incidents',
        label: 'Incidencias',
        type: 'array',
        required: false,
        description: 'Incidencias producidas durante la estancia.'
      },
      {
        key: 'workPlacement.finalAssessment',
        label: 'Evaluación final',
        type: 'object',
        required: false,
        description: 'Resultado final de la formación en empresa.'
      }
    ],
    sections: [
      {
        key: 'summary',
        title: 'Resumen general',
        order: 1,
        required: true,
        description: 'Estado general de la formación en empresa.',
        variables: ['workPlacement.totalStudents', 'workPlacement.totalHours']
      },
      {
        key: 'followups',
        title: 'Seguimientos',
        order: 2,
        required: false,
        description: 'Registro de visitas, contactos y observaciones.',
        variables: ['workPlacement.followUps']
      },
      {
        key: 'incidents',
        title: 'Incidencias',
        order: 3,
        required: false,
        description: 'Resumen de incidencias producidas.',
        variables: ['workPlacement.incidents']
      },
      {
        key: 'documents',
        title: 'Documentación pendiente',
        order: 4,
        required: false,
        description: 'Control documental de la estancia.',
        variables: ['workPlacement.pendingDocuments']
      },
      {
        key: 'assessment',
        title: 'Evaluación final',
        order: 5,
        required: false,
        description: 'Valoración final de la estancia.',
        variables: ['workPlacement.finalAssessment']
      }
    ],
    createdForPhase: '7A',
    isBaseTemplate: true,
    isActive: true
  }
];
