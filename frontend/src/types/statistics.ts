export interface AcademicStatisticsParameters {
  academicYearId?: number;
  centreId?: number;
  vocationalProgrammeId?: number;
  academicLevelId?: number;
  moduleId?: number;
  evaluationId?: number;
}

export interface AcademicStatisticsFilters {
  academicYearId?: number;
  centreId?: number;
  vocationalProgrammeId?: number;
  academicLevelId?: number;
  moduleId?: number;
  evaluationId?: number;
}

export interface StatusDistributionItem {
  code: string;
  name: string;
  count: number;
  isEvaluable: boolean | null;
  countsAsPassed: boolean | null;
  countsAsNoShow: boolean | null;
}

export interface GradeDistributionItem {
  key: string;
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface AcademicStatisticsMetrics {
  enrolled: number;
  gradeRecords: number;
  evaluated: number;
  numericEvaluated: number;
  statusPassed: number;
  passed: number;
  failed: number;
  notEvaluated: number | null;
  noShow: number;
  nonEvaluable: number;
  averageGrade: number | null;
  minGrade: number | null;
  maxGrade: number | null;
  successRate: number | null;
  performanceRate: number | null;
  coverageRate: number | null;
  statusDistribution: StatusDistributionItem[];
  gradeDistribution: GradeDistributionItem[];
}

export interface GroupedAcademicStatisticsItem {
  id: number;
  code: string;
  name: string;
  acronym?: string | null;
  sortOrder?: number;
  metrics: AcademicStatisticsMetrics;
}

export interface AcademicStatisticsResponse {
  filters: AcademicStatisticsFilters;
  warnings: string[];
  summary: AcademicStatisticsMetrics;
  byProgramme: GroupedAcademicStatisticsItem[];
  byLevel: GroupedAcademicStatisticsItem[];
  byModule: GroupedAcademicStatisticsItem[];
}
