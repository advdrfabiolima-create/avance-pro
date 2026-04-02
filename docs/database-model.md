# Modelagem do Banco de Dados — Kumon Advance

## Diagrama de Entidades

```
usuarios ──────────────────────────────────────────┐
                                                    │
franquia ──┬── alunos ──┬── matriculas              │
           │            ├── responsaveis_aluno      │
           │            ├── sessao_alunos ──── sessoes ── usuarios
           │            └── pagamentos              │
           │                                        │
           └── turmas ──────── sessoes ─────────────┘
```

---

## Tabelas

### `usuarios`
Funcionários da unidade (franqueado, assistentes) e acesso ao sistema.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| nome | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| senha_hash | VARCHAR | |
| perfil | ENUM | `franqueado`, `assistente` |
| ativo | BOOLEAN | Default true |
| criado_em | TIMESTAMP | |

---

### `franquia`
Dados da unidade Kumon (pode suportar múltiplas unidades no futuro).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| nome | VARCHAR(150) | Nome da unidade |
| endereco | VARCHAR(255) | |
| telefone | VARCHAR(20) | |
| email | VARCHAR(150) | |
| franqueado_id | UUID FK → usuarios | |
| criado_em | TIMESTAMP | |

---

### `responsaveis`
Pais ou responsáveis legais dos alunos.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| nome | VARCHAR(100) | |
| cpf | VARCHAR(14) UNIQUE | |
| email | VARCHAR(150) | |
| telefone | VARCHAR(20) | |
| telefone_alt | VARCHAR(20) | Opcional |
| criado_em | TIMESTAMP | |

---

### `alunos`
Alunos matriculados na unidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| nome | VARCHAR(100) | |
| data_nascimento | DATE | |
| escola | VARCHAR(150) | Escola regular do aluno |
| serie_escolar | VARCHAR(50) | |
| ativo | BOOLEAN | Default true |
| criado_em | TIMESTAMP | |

---

### `responsaveis_aluno`
Relacionamento entre alunos e seus responsáveis (um aluno pode ter mais de um).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| aluno_id | UUID FK → alunos | |
| responsavel_id | UUID FK → responsaveis | |
| parentesco | VARCHAR(50) | Ex: mãe, pai, avó |
| principal | BOOLEAN | Responsável financeiro |

---

### `materias`
Matérias oferecidas (Matemática, Português, Inglês).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| nome | VARCHAR(50) | Ex: Matemática |
| codigo | VARCHAR(10) | Ex: MAT, PORT, ING |

---

### `niveis`
Níveis do método Kumon por matéria (6A, 5A, 4A, 3A, 2A, A, B, ... O).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| materia_id | UUID FK → materias | |
| codigo | VARCHAR(5) | Ex: 6A, A, B, C |
| descricao | VARCHAR(255) | O que o aluno aprende neste nível |
| ordem | INTEGER | Para ordenação progressiva |

---

### `matriculas`
Matrícula do aluno em uma matéria, com nível atual.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| aluno_id | UUID FK → alunos | |
| materia_id | UUID FK → materias | |
| nivel_atual_id | UUID FK → niveis | |
| data_inicio | DATE | |
| data_fim | DATE | Null = ativo |
| ativo | BOOLEAN | |

---

### `turmas`
Dias e horários de atendimento na unidade.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| franquia_id | UUID FK → franquia | |
| dia_semana | ENUM | `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado` |
| horario_inicio | TIME | |
| horario_fim | TIME | |
| capacidade | INTEGER | Máx de alunos por turma |

---

### `turma_alunos`
Alunos vinculados a uma turma.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| turma_id | UUID FK → turmas | |
| aluno_id | UUID FK → alunos | |
| data_inicio | DATE | |
| data_fim | DATE | Null = ativo |

---

### `sessoes`
Registro de cada sessão (dia de aula na unidade).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| turma_id | UUID FK → turmas | |
| data | DATE | Data da sessão |
| assistente_id | UUID FK → usuarios | Quem supervisionou |
| observacoes | TEXT | |
| criado_em | TIMESTAMP | |

---

### `sessao_alunos`
Desempenho individual de cada aluno em uma sessão.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| sessao_id | UUID FK → sessoes | |
| aluno_id | UUID FK → alunos | |
| matricula_id | UUID FK → matriculas | |
| presente | BOOLEAN | |
| folhas_feitas | INTEGER | Qtd de folhas completadas |
| erros | INTEGER | Total de erros |
| tempo_minutos | INTEGER | Tempo total gasto |
| nivel_id | UUID FK → niveis | Nível trabalhado na sessão |
| observacao | TEXT | |

---

### `progressao_niveis`
Histórico de mudanças de nível do aluno.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| matricula_id | UUID FK → matriculas | |
| nivel_anterior_id | UUID FK → niveis | |
| nivel_novo_id | UUID FK → niveis | |
| data | DATE | |
| usuario_id | UUID FK → usuarios | Quem registrou |
| motivo | TEXT | |

---

### `pagamentos`
Mensalidades e cobranças por aluno/matéria.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| aluno_id | UUID FK → alunos | |
| matricula_id | UUID FK → matriculas | |
| responsavel_id | UUID FK → responsaveis | Quem paga |
| mes_referencia | DATE | Primeiro dia do mês |
| valor | DECIMAL(10,2) | |
| vencimento | DATE | |
| pago_em | DATE | Null = pendente |
| forma_pagamento | ENUM | `pix`, `cartao`, `boleto`, `dinheiro` |
| observacao | TEXT | |

---

## Resumo dos relacionamentos

- 1 franquia → N turmas
- 1 turma → N sessões
- 1 aluno → N matrículas (uma por matéria)
- 1 aluno → N responsáveis (via responsaveis_aluno)
- 1 sessão → N registros de alunos (sessao_alunos)
- 1 matrícula → N pagamentos mensais
- 1 matrícula → N progressões de nível
