export type ProgrammeCode = 'DAW' | 'DAM';

export type LearningOutcomeSeed = {
  code: string;
  title: string;
};

export type ProgrammeSeed = {
  code: ProgrammeCode;
  name: string;
  acronym: ProgrammeCode;
  description: string;
  sourceReference: string;
};

export type ModuleSeed = {
  programmeCode: ProgrammeCode;
  programmeName: string;
  programmeAcronym: ProgrammeCode;
  programmeDescription: string;
  levelNumber: 1 | 2;
  moduleCode: string;
  moduleName: string;
  acronym: string | null;
  totalHours: number;
  weeklyHours: number | null;
  sortOrder: number;
  sourceReference: string;
  learningOutcomes: LearningOutcomeSeed[];
};
