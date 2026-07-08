import 'dotenv/config';

import { prisma } from '../src/config/database.js';

type SourceDefinition = {
  programmeAcronym: 'DAW' | 'DAM';
  url: string;
  sourceReference: string;
};

type ParsedCriterion = {
  code: string;
  text: string;
  sortOrder: number;
};

type ParsedLearningOutcome = {
  code: string;
  title: string;
  sortOrder: number;
  criteria: ParsedCriterion[];
};

type ParsedModule = {
  code: string;
  name: string;
  learningOutcomes: ParsedLearningOutcome[];
};

type IdRow = {
  id: number | bigint;
};

const sources: SourceDefinition[] = [
  {
    programmeAcronym: 'DAW',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2010-9269',
    sourceReference:
      'BOE-A-2010-9269 · Real Decreto 686/2010',
  },
  {
    programmeAcronym: 'DAM',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2010-8067',
    sourceReference:
      'BOE-A-2010-8067 · Real Decreto 450/2010',
  },
];

function decodeHtmlEntities(input: string): string {
  const namedEntities: Record<string, string> = {
    aacute: 'á',
    Aacute: 'Á',
    eacute: 'é',
    Eacute: 'É',
    iacute: 'í',
    Iacute: 'Í',
    oacute: 'ó',
    Oacute: 'Ó',
    uacute: 'ú',
    Uacute: 'Ú',
    ntilde: 'ñ',
    Ntilde: 'Ñ',
    uuml: 'ü',
    Uuml: 'Ü',
    nbsp: ' ',
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
  };

  return input.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, entity: string) => {
      if (entity.startsWith('#x')) {
        return String.fromCodePoint(
          Number.parseInt(
            entity.slice(2),
            16,
          ),
        );
      }

      if (entity.startsWith('#')) {
        return String.fromCodePoint(
          Number.parseInt(
            entity.slice(1),
            10,
          ),
        );
      }

      return namedEntities[entity] ?? match;
    },
  );
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\t ]+/g, ' ')
      .replace(/\n[\t ]+/g, '\n')
      .replace(/[\t ]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function normalizeText(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function truncateTitle(input: string): string {
  const normalized = normalizeText(input);

  return normalized.length <= 255
    ? normalized
    : `${normalized.slice(0, 252)}...`;
}

function splitModuleBlocks(text: string): string[] {
  const moduleStartPattern = /Módulo Profesional:/gi;
  const starts: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = moduleStartPattern.exec(text)) !== null) {
    starts.push(match.index);
  }

  return starts.map((start, index) => {
    const end = starts[index + 1] ?? text.length;

    return text.slice(start, end);
  });
}

function parseCriteria(criteriaText: string): ParsedCriterion[] {
  const criteria: ParsedCriterion[] = [];
  const criterionPattern = /\n\s*([a-zñ])\)\s+([\s\S]*?)(?=\n\s*[a-zñ]\)\s+|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = criterionPattern.exec(`\n${criteriaText.trim()}`)) !== null) {
    const letter = match[1].toUpperCase();
    const text = normalizeText(match[2]);

    if (text.length === 0) {
      continue;
    }

    criteria.push({
      code: `CE${letter}`,
      text,
      sortOrder: criteria.length + 1,
    });
  }

  return criteria;
}

function parseLearningOutcomes(block: string): ParsedLearningOutcome[] {
  const marker = 'Resultados de aprendizaje y criterios de evaluación.';
  const markerIndex = block.indexOf(marker);

  if (markerIndex === -1) {
    return [];
  }

  const relevantBlock = block.slice(markerIndex + marker.length);
  const outcomePattern = /\n\s*(\d+)\.\s+([^\n]+)\n\s*Criterios de evaluación:\s*\n([\s\S]*?)(?=\n\s*\d+\.\s+[^\n]+\n\s*Criterios de evaluación:|\n\s*Duración:|\n\s*Contenidos básicos|\n\s*Orientaciones pedagógicas|$)/gi;
  const learningOutcomes: ParsedLearningOutcome[] = [];
  let match: RegExpExecArray | null;

  while ((match = outcomePattern.exec(`\n${relevantBlock}`)) !== null) {
    const number = Number.parseInt(
      match[1],
      10,
    );

    const title = normalizeText(match[2]);
    const criteria = parseCriteria(match[3]);

    if (title.length === 0) {
      continue;
    }

    learningOutcomes.push({
      code: `RA${number}`,
      title,
      sortOrder: number,
      criteria,
    });
  }

  return learningOutcomes;
}

function parseModules(text: string): ParsedModule[] {
  return splitModuleBlocks(text)
    .map((block): ParsedModule | null => {
      const nameMatch = block.match(/Módulo Profesional:\s*([^\n.]+)\.?/i);
      const codeMatch = block.match(/Código:\s*([0-9A-Z]+)\.?/i);

      if (!nameMatch || !codeMatch) {
        return null;
      }

      const learningOutcomes = parseLearningOutcomes(block);

      if (learningOutcomes.length === 0) {
        return null;
      }

      return {
        code: codeMatch[1].trim().toUpperCase(),
        name: normalizeText(nameMatch[1]),
        learningOutcomes,
      };
    })
    .filter((item): item is ParsedModule => item !== null);
}

async function fetchOfficialText(
  source: SourceDefinition,
): Promise<string> {
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(
      `No se ha podido descargar ${source.sourceReference}: ${response.status} ${response.statusText}`,
    );
  }

  return htmlToText(await response.text());
}

async function ensureEvaluationCriteriaTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS module_evaluation_criteria (
      id INT NOT NULL AUTO_INCREMENT,
      learning_outcome_id INT NOT NULL,
      code VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      source_reference VARCHAR(255) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY module_evaluation_criteria_outcome_code_unique (learning_outcome_id, code),
      KEY module_evaluation_criteria_outcome_idx (learning_outcome_id),
      KEY module_evaluation_criteria_code_idx (code),
      KEY module_evaluation_criteria_sort_idx (sort_order),
      KEY module_evaluation_criteria_active_idx (is_active),
      KEY module_evaluation_criteria_deleted_idx (deleted_at),
      CONSTRAINT module_evaluation_criteria_outcome_fk
        FOREIGN KEY (learning_outcome_id)
        REFERENCES module_learning_outcomes (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getModuleId(
  programmeAcronym: string,
  moduleCode: string,
): Promise<number | null> {
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT m.id
      FROM modules m
      INNER JOIN vocational_programmes vp
        ON vp.id = m.vocational_programme_id
      WHERE vp.acronym = ?
        AND m.code = ?
        AND m.deleted_at IS NULL
      LIMIT 1
    `,
    programmeAcronym,
    moduleCode,
  );

  const row = rows[0];

  return row
    ? Number(row.id)
    : null;
}

async function upsertLearningOutcome(
  moduleId: number,
  learningOutcome: ParsedLearningOutcome,
  sourceReference: string,
): Promise<number> {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO module_learning_outcomes (
        module_id,
        code,
        title,
        description,
        source_reference,
        sort_order,
        is_active,
        deleted_at
      ) VALUES (?, ?, ?, NULL, ?, ?, TRUE, NULL)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        source_reference = VALUES(source_reference),
        sort_order = VALUES(sort_order),
        is_active = TRUE,
        deleted_at = NULL
    `,
    moduleId,
    learningOutcome.code,
    truncateTitle(learningOutcome.title),
    sourceReference,
    learningOutcome.sortOrder,
  );

  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM module_learning_outcomes
      WHERE module_id = ?
        AND code = ?
      LIMIT 1
    `,
    moduleId,
    learningOutcome.code,
  );

  const row = rows[0];

  if (!row) {
    throw new Error(
      `No se ha podido recuperar ${learningOutcome.code}.`,
    );
  }

  return Number(row.id);
}

async function upsertCriterion(
  learningOutcomeId: number,
  criterion: ParsedCriterion,
  sourceReference: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO module_evaluation_criteria (
        learning_outcome_id,
        code,
        title,
        description,
        source_reference,
        sort_order,
        is_active,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE, NULL)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        source_reference = VALUES(source_reference),
        sort_order = VALUES(sort_order),
        is_active = TRUE,
        deleted_at = NULL
    `,
    learningOutcomeId,
    criterion.code,
    truncateTitle(criterion.text),
    criterion.text,
    sourceReference,
    criterion.sortOrder,
  );
}

async function processSource(
  source: SourceDefinition,
): Promise<{
  modulesProcessed: number;
  learningOutcomesProcessed: number;
  criteriaProcessed: number;
}> {
  const text = await fetchOfficialText(source);
  const modules = parseModules(text);

  let modulesProcessed = 0;
  let learningOutcomesProcessed = 0;
  let criteriaProcessed = 0;

  for (const module of modules) {
    const moduleId = await getModuleId(
      source.programmeAcronym,
      module.code,
    );

    if (moduleId === null) {
      continue;
    }

    modulesProcessed += 1;

    for (const learningOutcome of module.learningOutcomes) {
      const learningOutcomeId = await upsertLearningOutcome(
        moduleId,
        learningOutcome,
        source.sourceReference,
      );

      learningOutcomesProcessed += 1;

      for (const criterion of learningOutcome.criteria) {
        await upsertCriterion(
          learningOutcomeId,
          criterion,
          source.sourceReference,
        );

        criteriaProcessed += 1;
      }
    }
  }

  return {
    modulesProcessed,
    learningOutcomesProcessed,
    criteriaProcessed,
  };
}

async function main(): Promise<void> {
  await ensureEvaluationCriteriaTable();

  let totalModules = 0;
  let totalLearningOutcomes = 0;
  let totalCriteria = 0;

  for (const source of sources) {
    const result = await processSource(source);

    totalModules += result.modulesProcessed;
    totalLearningOutcomes += result.learningOutcomesProcessed;
    totalCriteria += result.criteriaProcessed;

    console.log(
      `${source.programmeAcronym}: ${result.modulesProcessed} módulos, ${result.learningOutcomesProcessed} RA y ${result.criteriaProcessed} CE procesados.`,
    );
  }

  console.log('Criterios de evaluación oficiales procesados correctamente.');
  console.log(`Módulos procesados: ${totalModules}`);
  console.log(`Resultados de aprendizaje procesados: ${totalLearningOutcomes}`);
  console.log(`Criterios de evaluación procesados: ${totalCriteria}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      'No se pudieron poblar los criterios de evaluación:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
