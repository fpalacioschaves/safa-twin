import type {
  DigitalTwinIntent,
} from '../digital-twin.schemas.js';

import type {
  NumberLike,
} from '../digital-twin.types.js';

export function toNumber(value: NumberLike): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

export function toNullableNumber(
  value: NumberLike,
): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

export function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeProgrammeAcronyms(
  acronyms: string[],
): string[] {
  return Array.from(
    new Set(
      acronyms
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z0-9]+$/.test(item)),
    ),
  );
}

export function addProgrammeAndLevelFilters(
  clauses: string[],
  values: unknown[],
  intent: DigitalTwinIntent,
): void {
  const acronyms = normalizeProgrammeAcronyms(
    intent.programmeAcronyms,
  );

  if (acronyms.length > 0) {
    clauses.push(
      `vp.acronym IN (${acronyms.map(() => '?').join(', ')})`,
    );

    values.push(...acronyms);
  }

  if (intent.academicLevelNumber !== null) {
    clauses.push('al.number = ?');
    values.push(intent.academicLevelNumber);
  }
}

export function getWhereSql(clauses: string[]): string {
  return clauses.length === 0
    ? ''
    : `WHERE ${clauses.join(' AND ')}`;
}
