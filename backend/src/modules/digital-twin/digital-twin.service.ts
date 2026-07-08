import {
  digitalTwinIntentSchema,
  type DigitalTwinIntent,
  type DigitalTwinMessageInput,
} from './digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  DigitalTwinResponse,
  DigitalTwinStatus,
} from './digital-twin.types.js';

import {
  getAcademicOverviewContext,
} from './tools/academic-overview.tool.js';

import {
  getAttendanceContext,
} from './tools/attendance.tool.js';

import {
  getCurriculumContext,
} from './tools/curriculum.tool.js';

import {
  getEmailAudienceContext,
} from './tools/email-audience.tool.js';

import {
  getEvaluationContext,
} from './tools/evaluations.tool.js';

import {
  getPlacementIncidentsContext,
} from './tools/placement-incidents.tool.js';

import {
  getStudentsContext,
} from './tools/students.tool.js';

import {
  getWorkPlacementContext,
} from './tools/work-placements.tool.js';

type AiRole = 'system' | 'user' | 'assistant';

interface AiMessage {
  role: AiRole;
  content: string;
}

interface AiTextRequest {
  messages: AiMessage[];
  temperature?: number;
}

interface AiJsonRequest extends AiTextRequest {
  instruction: string;
}

interface AiProvider {
  readonly name: string;
  readonly model: string;

  generateText(request: AiTextRequest): Promise<string>;

  generateJson(request: AiJsonRequest): Promise<unknown>;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

class OllamaProvider implements AiProvider {
  public readonly name = 'ollama';

  public readonly model: string;

  private readonly baseUrl: string;

  private readonly timeoutMs: number;

  public constructor() {
    this.baseUrl = (
      process.env.OLLAMA_BASE_URL
      ?? 'http://127.0.0.1:11434'
    ).replace(/\/$/, '');

    this.model = process.env.OLLAMA_MODEL ?? 'llama3.2';

    const timeoutText = process.env.OLLAMA_TIMEOUT_MS ?? '45000';
    const parsedTimeout = Number.parseInt(timeoutText, 10);

    this.timeoutMs = Number.isInteger(parsedTimeout)
      && parsedTimeout > 0
      ? parsedTimeout
      : 45000;
  }

  public async generateText(
    request: AiTextRequest,
  ): Promise<string> {
    const response = await this.callChat(request.messages, {
      temperature: request.temperature ?? 0.2,
    });

    const content = response.message?.content;

    if (typeof content !== 'string') {
      throw new Error(
        'Ollama no ha devuelto contenido textual válido.',
      );
    }

    return content.trim();
  }

  public async generateJson(
    request: AiJsonRequest,
  ): Promise<unknown> {
    const response = await this.callChat(
      [
        ...request.messages,
        {
          role: 'user',
          content: request.instruction,
        },
      ],
      {
        temperature: request.temperature ?? 0,
        format: 'json',
      },
    );

    const content = response.message?.content;

    if (typeof content !== 'string') {
      throw new Error(
        'Ollama no ha devuelto JSON textual válido.',
      );
    }

    return JSON.parse(extractJson(content));
  }

  private async callChat(
    messages: AiMessage[],
    options: {
      temperature: number;
      format?: 'json';
    },
  ): Promise<OllamaChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          format: options.format,
          options: {
            temperature: options.temperature,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Ollama ha respondido con estado ${response.status}.`,
        );
      }

      return await response.json() as OllamaChatResponse;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `No se ha podido obtener respuesta de Ollama: ${error.message}`,
        );
      }

      throw new Error(
        'No se ha podido obtener respuesta de Ollama.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractJson(content: string): string {
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error(
      'La respuesta del modelo no contiene un objeto JSON válido.',
    );
  }

  return content.slice(firstBrace, lastBrace + 1);
}

function getAiProvider(): AiProvider {
  const provider = (
    process.env.AI_PROVIDER ?? 'ollama'
  ).toLowerCase();

  if (provider === 'ollama') {
    return new OllamaProvider();
  }

  throw new Error(
    `El proveedor de IA "${provider}" no está implementado todavía. `
    + 'Usa AI_PROVIDER=ollama.',
  );
}

async function classifyRequest(
  provider: AiProvider,
  input: DigitalTwinMessageInput,
): Promise<{
  intent: DigitalTwinIntent;
  warnings: string[];
}> {
  const fallbackIntent = getFallbackIntent(input.message);

  try {
    const rawIntent = await provider.generateJson({
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Eres el clasificador de intención de SAFA Twin. '
            + 'Devuelves solo JSON válido, sin explicaciones.',
        },
        {
          role: 'user',
          content:
            'Clasifica esta petición académica y extrae filtros. '
            + 'Los ciclos pueden ser DAM o DAW. El curso académico '
            + 'se expresa como 1, 2, primero o segundo. La evaluación '
            + 'puede aparecer como primera, segunda, tercera, final, EV1, EV2 o EV3. '
            + 'Las peticiones sobre faltas, ausencias, absentismo o asistencia son ATTENDANCE_REPORT. '
            + 'Las peticiones sobre incidencias son INCIDENTS_SUMMARY.\n\n'
            + `Petición: ${input.message}`,
        },
      ],
      instruction:
        'Devuelve exactamente un objeto JSON con esta forma: '
        + '{"intent":"GENERAL_QUERY|STUDENTS_QUERY|EVALUATION_REPORT|ATTENDANCE_REPORT|INCIDENTS_SUMMARY|WORK_PLACEMENT_SUMMARY|EMAIL_DRAFT|CURRICULUM_QUERY",'
        + '"programmeAcronyms":["DAM","DAW"],'
        + '"academicLevelNumber":1,'
        + '"evaluationCode":"EV1|EV2|EV3|FINAL|null",'
        + '"topic":"texto breve o null",'
        + '"confidence":0.0}.',
    });

    const validation = digitalTwinIntentSchema.safeParse(rawIntent);

    if (!validation.success) {
      return {
        intent: fallbackIntent,
        warnings: [
          'Ollama respondió, pero la intención no tenía el formato esperado. Se ha usado clasificación interna.',
        ],
      };
    }

    return {
      intent: validation.data,
      warnings: [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Error desconocido al clasificar la petición.';

    return {
      intent: fallbackIntent,
      warnings: [
        `No se ha podido clasificar con Ollama. Se ha usado clasificación interna. Detalle: ${message}`,
      ],
    };
  }
}

function getFallbackIntent(
  message: string,
): DigitalTwinIntent {
  const normalizedMessage = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const programmeAcronyms: string[] = [];

  if (/\bdam\b/.test(normalizedMessage)) {
    programmeAcronyms.push('DAM');
  }

  if (/\bdaw\b/.test(normalizedMessage)) {
    programmeAcronyms.push('DAW');
  }

  let academicLevelNumber: number | null = null;

  if (/\b1\b|primero|primer/.test(normalizedMessage)) {
    academicLevelNumber = 1;
  }

  if (/\b2\b|segundo/.test(normalizedMessage)) {
    academicLevelNumber = 2;
  }

  let evaluationCode: string | null = null;

  if (/primera|\bev1\b/.test(normalizedMessage)) {
    evaluationCode = 'EV1';
  } else if (/segunda|\bev2\b/.test(normalizedMessage)) {
    evaluationCode = 'EV2';
  } else if (/tercera|\bev3\b/.test(normalizedMessage)) {
    evaluationCode = 'EV3';
  } else if (/final|ordinaria/.test(normalizedMessage)) {
    evaluationCode = 'FINAL';
  }

  let intent: DigitalTwinIntent['intent'] = 'GENERAL_QUERY';

  if (/correo|email|mail|mensaje/.test(normalizedMessage)) {
    intent = 'EMAIL_DRAFT';
  } else if (/asistencia|absentismo|ausencia|ausencias|falta|faltas/.test(normalizedMessage)) {
    intent = 'ATTENDANCE_REPORT';
  } else if (/incidencia|incidencias|conflicto|conflictos|parte disciplinario|partes disciplinarios/.test(normalizedMessage)) {
    intent = 'INCIDENTS_SUMMARY';
  } else if (/evaluacion|nota|calificacion|aprobado|suspenso|rendimiento/.test(normalizedMessage)) {
    intent = 'EVALUATION_REPORT';
  } else if (/practica|empresa|formacion en empresa|estancia/.test(normalizedMessage)) {
    intent = 'WORK_PLACEMENT_SUMMARY';
  } else if (/curriculo|ra|resultado de aprendizaje|ce|criterio|af|accion formativa/.test(normalizedMessage)) {
    intent = 'CURRICULUM_QUERY';
  } else if (/alumno|alumna|alumnado|estudiante|matricula/.test(normalizedMessage)) {
    intent = 'STUDENTS_QUERY';
  }

  return {
    intent,
    programmeAcronyms,
    academicLevelNumber,
    evaluationCode,
    topic: message,
    confidence: 0.35,
  };
}

async function getContextForIntent(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  if (intent.intent === 'EVALUATION_REPORT') {
    return await getEvaluationContext(intent);
  }

  if (intent.intent === 'ATTENDANCE_REPORT') {
    return await getAttendanceContext(intent);
  }

  if (intent.intent === 'INCIDENTS_SUMMARY') {
    return await getPlacementIncidentsContext(intent);
  }

  if (intent.intent === 'EMAIL_DRAFT') {
    return await getEmailAudienceContext(intent);
  }

  if (intent.intent === 'WORK_PLACEMENT_SUMMARY') {
    return await getWorkPlacementContext(intent);
  }

  if (intent.intent === 'CURRICULUM_QUERY') {
    return await getCurriculumContext(intent);
  }

  if (intent.intent === 'STUDENTS_QUERY') {
    return await getStudentsContext(intent);
  }

  return await getAcademicOverviewContext(intent);
}

function buildSystemPrompt(): string {
  return [
    'Eres el Gemelo Digital académico de SAFA Twin.',
    'Respondes en español, con tono formal, claro y didáctico.',
    'Trabajas únicamente con los datos recibidos desde SAFA Twin.',
    'No inventes cifras, alumnos, módulos, evaluaciones, faltas, incidencias ni conclusiones.',
    'Si faltan datos o una tabla no está implementada, indícalo expresamente.',
    'Distingue siempre entre tasa de éxito y tasa de rendimiento.',
    'No conviertas estados no numéricos en notas.',
    'Si la petición implica enviar correos, redacta solo un borrador y deja claro que requiere confirmación humana.',
  ].join(' ');
}

function buildUserPrompt(
  message: string,
  intent: DigitalTwinIntent,
  context: DigitalTwinContext,
  classificationWarnings: string[],
): string {
  return JSON.stringify(
    {
      originalRequest: message,
      interpretedIntent: intent,
      classificationWarnings,
      context,
      expectedOutput:
        'Devuelve una respuesta útil para el usuario. Si procede, estructura el resultado como informe, resumen o borrador de correo.',
    },
    null,
    2,
  );
}

function buildFallbackAssistantMessage(
  context: DigitalTwinContext,
  warnings: string[],
): string {
  const warningText = warnings.length > 0
    ? `\n\nAdvertencias:\n${warnings.map((warning) => `- ${warning}`).join('\n')}`
    : '';

  return [
    `${context.title}.`,
    context.summary,
    'No se ha podido completar la redacción con Ollama, pero SAFA Twin sí ha preparado el contexto de datos solicitado.',
    warningText,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getProposedAction(
  intent: DigitalTwinIntent,
): DigitalTwinResponse['proposedAction'] {
  if (intent.intent === 'EMAIL_DRAFT') {
    return {
      type: 'EMAIL_DRAFT',
      label: 'Borrador de correo pendiente de revisión y confirmación',
      status: 'preview_only',
    };
  }

  if (intent.intent === 'EVALUATION_REPORT') {
    return {
      type: 'DOCUMENT_PREVIEW',
      label: 'Vista previa de informe académico',
      status: 'preview_only',
    };
  }

  if (intent.intent === 'ATTENDANCE_REPORT') {
    return {
      type: 'ATTENDANCE_REPORT_PREVIEW',
      label: 'Vista previa de informe de asistencia',
      status: 'requires_attendance_module',
    };
  }

  if (intent.intent === 'INCIDENTS_SUMMARY') {
    return {
      type: 'INCIDENTS_SUMMARY_PREVIEW',
      label: 'Vista previa de resumen de incidencias',
      status: 'preview_only',
    };
  }

  return null;
}

export function getDigitalTwinStatus(): DigitalTwinStatus {
  const provider = (
    process.env.AI_PROVIDER ?? 'ollama'
  ).toLowerCase();

  return {
    provider,
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
    baseUrl: provider === 'ollama'
      ? process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
      : null,
    enabled: provider === 'ollama',
  };
}

export async function processDigitalTwinMessage(
  input: DigitalTwinMessageInput,
): Promise<DigitalTwinResponse> {
  const provider = getAiProvider();

  const classification = await classifyRequest(
    provider,
    input,
  );

  const context = await getContextForIntent(
    classification.intent,
  );

  const allWarnings = [
    ...classification.warnings,
    ...context.warnings,
  ];

  let assistantMessage: string;

  try {
    assistantMessage = await provider.generateText({
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: buildUserPrompt(
            input.message,
            classification.intent,
            context,
            classification.warnings,
          ),
        },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Error desconocido al generar la respuesta.';

    assistantMessage = buildFallbackAssistantMessage(
      context,
      [
        ...allWarnings,
        message,
      ],
    );
  }

  return {
    provider: {
      name: provider.name,
      model: provider.model,
    },
    intent: classification.intent,
    assistantMessage,
    context: {
      ...context,
      warnings: allWarnings,
    },
    requiresConfirmation:
      classification.intent.intent === 'EMAIL_DRAFT',
    proposedAction: getProposedAction(
      classification.intent,
    ),
  };
}
