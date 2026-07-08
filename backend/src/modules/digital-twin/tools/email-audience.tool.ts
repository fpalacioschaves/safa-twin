import { prisma } from '../../../config/database.js';

import type {
  DigitalTwinIntent,
} from '../digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  NumberLike,
} from '../digital-twin.types.js';

import {
  addProgrammeAndLevelFilters,
  getWhereSql,
  toNumber,
} from './digital-twin-tool.helpers.js';

interface EmailAudienceRow {
  id: NumberLike;
  full_name: string;
  email: string | null;
  programme_acronym: string;
  academic_level_number: NumberLike;
}

export async function getEmailAudienceContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const clauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    's.deleted_at IS NULL',
    's.is_active = TRUE',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  const rows = await prisma.$queryRawUnsafe<EmailAudienceRow[]>(
    `
      SELECT DISTINCT
        s.id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS full_name,
        s.email,
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number
      FROM students s
      INNER JOIN enrolments en ON en.student_id = s.id
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN modules m ON m.id = en.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(clauses)}
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC
      LIMIT 250
    `,
    ...values,
  );

  const recipients = rows.map((row) => ({
    id: toNumber(row.id),
    name: row.full_name,
    email: row.email,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
  }));

  const withEmail = recipients.filter(
    (recipient) => Boolean(recipient.email),
  );

  const withoutEmail = recipients.filter(
    (recipient) => !recipient.email,
  );

  const warnings: string[] = [];

  if (recipients.length === 0) {
    warnings.push(
      'No se han encontrado alumnos con los filtros interpretados.',
    );
  }

  if (withoutEmail.length > 0) {
    warnings.push(
      `${withoutEmail.length} alumnos no tienen correo electrónico registrado.`,
    );
  }

  return {
    kind: 'email-audience',
    title: 'Audiencia para borrador de correo',
    summary:
      `Se han localizado ${recipients.length} alumnos; ${withEmail.length} tienen email registrado.`,
    warnings,
    data: {
      filters: intent,
      topic: intent.topic,
      recipientsTotal: recipients.length,
      recipientsWithEmail: withEmail.length,
      recipientsWithoutEmail: withoutEmail.length,
      recipientPreview: withEmail.slice(0, 25),
      missingEmailPreview: withoutEmail.slice(0, 10),
    },
  };
}
