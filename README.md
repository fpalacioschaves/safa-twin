# SAFA Twin

**SAFA Twin** es un gemelo digital académico para Formación Profesional. El proyecto busca centralizar y ordenar información clave de un centro o ciclo formativo: estructura académica, alumnado, matrículas, evaluaciones, formación en empresa, currículo RA/CE/AF, documentos generados y asistencia interna a tareas de gestión.

El proyecto está planteado como una aplicación full stack mantenible, desarrollada con tecnologías web conocidas y sin depender de Laravel ni Docker.

---

## Objetivo del proyecto

SAFA Twin nace como una herramienta de gestión académica orientada a FP, especialmente a ciclos DAM/DAW y entornos donde es necesario conectar:

- estructura académica,
- alumnado,
- módulos,
- resultados de aprendizaje,
- criterios de evaluación,
- acciones formativas,
- formación en empresa,
- documentación institucional,
- informes y memorias,
- consultas internas tipo asistente.

La idea principal es disponer de un sistema que ayude a transformar datos académicos dispersos en información organizada, consultable y documentable.

---

## Funcionalidades desarrolladas

El proyecto incluye, entre otros bloques funcionales:

- Autenticación de usuarios.
- Gestión de usuarios, roles y permisos.
- Estructura académica: cursos, centros, ciclos, niveles, grupos y módulos.
- Gestión de alumnado y matrículas modulares.
- Evaluaciones, estados y sistemas de calificación.
- Calificaciones por matrícula modular.
- Estadísticas académicas y paneles de consulta.
- Formación en empresa: empresas, tutores laborales, estancias, seguimientos, incidencias e informes.
- Historial documental.
- Generación de documentos académicos.
- Currículo RA/CE/AF.
- Plantillas documentales.
- Ayuda interna de la aplicación.
- Base para asistente interno o gemelo digital académico.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Base de datos | MySQL / MariaDB |
| Frontend | React, Vite, TypeScript |
| Validación | Zod |
| Seguridad | bcryptjs, sesiones, roles y permisos |
| IA local / asistente | Preparado para integración con Ollama |

---

## Arquitectura general

El repositorio se organiza en dos grandes bloques:

```txt
safa-twin/
├── backend/    # API REST, Prisma, modelos, autenticación y lógica de negocio
└── frontend/   # Aplicación React + Vite + TypeScript
```

El backend expone una API REST para la gestión de los datos académicos. El frontend consume esa API y proporciona las pantallas de administración, consulta y generación documental.

---

## Backend

El backend utiliza Node.js, Express, TypeScript y Prisma.

Scripts principales:

```bash
cd backend
npm install
npm run dev
npm run build
npm run start
```

Otros scripts relevantes:

```bash
npm run typecheck
npm run sync:permissions
npm run seed:evaluation-criteria
```

El backend requiere un archivo `.env` basado en `backend/.env.example`.

Variables principales:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
DATABASE_URL="mysql://USUARIO:CONTRASENA@127.0.0.1:3306/safa_twin"
SHADOW_DATABASE_URL="mysql://USUARIO:CONTRASENA@127.0.0.1:3306/safa_twin_shadow"
ADMIN_NAME="Nombre del administrador"
ADMIN_EMAIL="administrador@ejemplo.com"
ADMIN_PASSWORD="CONTRASENA_SEGURA_DE_AL_MENOS_12_CARACTERES"
```

---

## Frontend

El frontend utiliza React, Vite y TypeScript.

Scripts principales:

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

---

## Modelo de datos

El modelo de datos está definido con Prisma y cubre entidades como:

- usuarios,
- roles,
- permisos,
- sesiones,
- centros,
- cursos académicos,
- ciclos,
- módulos,
- alumnado,
- matrículas,
- evaluaciones,
- calificaciones,
- empresas,
- tutores,
- estancias,
- seguimientos,
- incidencias,
- documentos,
- resultados de aprendizaje,
- criterios de evaluación,
- acciones formativas.

El objetivo es que el sistema pueda representar tanto la estructura académica como los procesos administrativos y documentales asociados.

---

## Enfoque educativo

SAFA Twin no está pensado solo como una aplicación de gestión. También funciona como proyecto demostrativo de arquitectura full stack aplicada a un problema real de Formación Profesional.

Permite trabajar conceptos como:

- diseño de APIs REST,
- modelado relacional,
- autenticación y autorización,
- validación de datos,
- componentes React,
- gestión de estado,
- generación documental,
- trazabilidad de procesos,
- separación frontend/backend,
- evolución incremental por fases.

---

## Estado del proyecto

Proyecto en evolución activa.

Bloques completados o avanzados:

- base técnica,
- autenticación,
- roles y permisos,
- estructura académica,
- alumnado,
- evaluaciones,
- formación en empresa,
- estadísticas,
- documentos,
- currículo RA/CE/AF,
- base de gemelo digital.

---

## Desarrollo local

Requisitos recomendados:

- Node.js 22,
- MySQL o MariaDB,
- npm,
- entorno local tipo XAMPP, MariaDB independiente o equivalente.

Pasos generales:

```bash
git clone https://github.com/fpalacioschaves/safa-twin.git
cd safa-twin
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

> Nota: antes de arrancar el backend es necesario configurar la base de datos y las variables de entorno correspondientes.

---

## Seguridad

Este repositorio no debe incluir credenciales reales, contraseñas locales ni datos personales de alumnado. Las credenciales de desarrollo deben mantenerse siempre fuera del repositorio mediante archivos `.env` locales.

---

## Autor

**Francisco Palacios Chaves**

Docente FP TIC y desarrollador web. Proyecto desarrollado como herramienta académica y como demostración de aplicación full stack aplicada a la gestión educativa.

- CV online: https://fpalacioschaves.github.io/cv-react/
- GitHub: https://github.com/fpalacioschaves
