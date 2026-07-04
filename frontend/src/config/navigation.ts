export type ActiveSection =
  | 'dashboard'
  | 'users'
  | 'academic-years'
  | 'centres'
  | 'vocational-programmes'
  | 'academic-levels'
  | 'modules'
  | 'students'
  | 'enrolments';

export interface EnabledNavigationItem {
  id: ActiveSection;
  label: string;
  mobileLabel: string;
  permission?: string;
  disabled?: false;
}

export interface DisabledNavigationItem {
  id: string;
  label: string;
  mobileLabel?: string;
  disabled: true;
}

export type NavigationItem =
  | EnabledNavigationItem
  | DisabledNavigationItem;

export interface NavigationGroup {
  label?: string;
  items: NavigationItem[];
}

export const navigationGroups:
NavigationGroup[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Panel principal',
        mobileLabel: 'Panel',
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        id: 'users',
        label: 'Usuarios',
        mobileLabel: 'Usuarios',
        permission: 'users.list',
      },
    ],
  },
  {
    label: 'Estructura académica',
    items: [
      {
        id: 'academic-years',
        label: 'Cursos académicos',
        mobileLabel: 'Cursos',
        permission: 'academic-years.list',
      },
      {
        id: 'centres',
        label: 'Centros',
        mobileLabel: 'Centros',
        permission: 'centres.list',
      },
      {
        id: 'vocational-programmes',
        label: 'Ciclos formativos',
        mobileLabel: 'Ciclos',
        permission: 'vocational-programmes.list',
      },
      {
        id: 'academic-levels',
        label: 'Niveles',
        mobileLabel: 'Niveles',
        permission: 'academic-levels.list',
      },
      {
        id: 'modules',
        label: 'Módulos',
        mobileLabel: 'Módulos',
        permission: 'modules.list',
      },
      {
        id: 'academic-offerings',
        label: 'Ofertas académicas',
        mobileLabel: 'Ofertas',
        disabled: true,
      },
    ],
  },
  {
    label: 'Gestión académica',
    items: [
      {
        id: 'students',
        label: 'Alumnado',
        mobileLabel: 'Alumnado',
        permission: 'students.list',
      },
      {
        id: 'enrolments',
        label: 'Matrículas',
        mobileLabel: 'Matrículas',
        permission: 'enrolments.list',
      },
      {
        id: 'evaluations',
        label: 'Evaluaciones',
        mobileLabel: 'Evaluaciones',
        disabled: true,
      },
      {
        id: 'digital-twin',
        label: 'Gemelo digital',
        mobileLabel: 'Gemelo',
        disabled: true,
      },
    ],
  },
];

export function isEnabledNavigationItem(
  item: NavigationItem,
): item is EnabledNavigationItem {
  return item.disabled !== true;
}
