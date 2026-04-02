# Kumon Advance

Sistema de gestão para unidades Kumon — monorepo híbrido (Web + Desktop + API).

## Estrutura do Projeto

```
kumon_advance/
├── apps/
│   ├── web/                  # Aplicação web (React + TypeScript) — browser e mobile
│   │   └── src/
│   │       ├── pages/        # Páginas da aplicação (roteamento)
│   │       ├── components/   # Componentes específicos do web
│   │       ├── hooks/        # Custom hooks React
│   │       ├── services/     # Chamadas à API (fetch/axios)
│   │       ├── store/        # Gerenciamento de estado (Zustand ou Context)
│   │       └── styles/       # Estilos globais e temas
│   │
│   ├── desktop/              # Aplicação desktop (Tauri + React)
│   │   └── src/              # Configurações Tauri e comandos nativos
│   │
│   └── api/                  # Backend REST (Node.js + Fastify + TypeScript)
│       └── src/
│           ├── modules/
│           │   ├── alunos/         # CRUD de alunos e níveis
│           │   ├── responsaveis/   # Pais e responsáveis
│           │   ├── turmas/         # Turmas/sessões recorrentes
│           │   ├── sessoes/        # Registro de presença e desempenho
│           │   ├── pagamentos/     # Mensalidades e financeiro
│           │   └── usuarios/       # Usuários do sistema (staff)
│           ├── shared/
│           │   ├── middlewares/    # Auth, validação, erros
│           │   ├── utils/          # Funções auxiliares
│           │   └── config/         # Variáveis de ambiente e configurações
│           └── database/
│               ├── migrations/     # Migrations do banco (PostgreSQL)
│               └── seeds/          # Dados iniciais (níveis, matérias etc.)
│
├── packages/
│   ├── ui/                   # Componentes React compartilhados (shadcn/ui base)
│   │   └── src/              # Botões, tabelas, modais, formulários reutilizáveis
│   │
│   ├── types/                # Tipos TypeScript compartilhados entre apps
│   │   └── src/              # Interfaces: Aluno, Sessao, Pagamento etc.
│   │
│   ├── utils/                # Funções utilitárias compartilhadas
│   │   └── src/              # Formatação de datas, cálculos de nível etc.
│   │
│   └── db/                   # Cliente de banco de dados compartilhado
│       └── src/              # Configuração Prisma/Drizzle ORM
│
├── docs/                     # Documentação técnica e de negócio
└── package.json              # Configuração do monorepo (pnpm workspaces)
```

## Apps

| App | Tecnologia | Público-alvo |
|---|---|---|
| `web` | React + TypeScript + Tailwind | Pais, franqueado (remoto) |
| `desktop` | Tauri + React | Franqueado e assistentes (unidade) |
| `api` | Node.js + Fastify + TypeScript | — |

## Banco de Dados

- **PostgreSQL** — produção
- **SQLite** — modo offline no desktop (via Tauri)
- **ORM:** Prisma

## Como rodar (futuro)

```bash
pnpm install
pnpm --filter api dev      # API na porta 3333
pnpm --filter web dev      # Web na porta 5173
pnpm --filter desktop dev  # Desktop (Tauri)
```
