# Funcionalidades — Kumon Advance

## Perfis de acesso

| Perfil | Acesso |
|---|---|
| `franqueado` | Acesso total ao sistema |
| `assistente` | Operacional (sessões, presença, desempenho) |
| `responsavel` | Portal web — visualização do filho |

---

## MVP (Versão 1.0)

Funcionalidades essenciais para o sistema entrar em produção.

### 1. Autenticação e Controle de Acesso
- Login com email e senha
- Perfis: franqueado e assistente
- Sessão com JWT
- Troca de senha

### 2. Cadastro de Alunos
- Criar, editar, desativar aluno
- Dados pessoais e escola
- Vincular responsáveis (com parentesco e flag de responsável financeiro)
- Listar alunos com filtros (ativo, matéria, nível, turma)

### 3. Cadastro de Responsáveis
- Criar, editar responsável
- Vincular a um ou mais alunos
- Dados de contato

### 4. Matrículas
- Matricular aluno em uma ou mais matérias
- Definir nível inicial
- Encerrar matrícula
- Histórico de matrículas

### 5. Turmas
- Criar turmas com dia da semana e horário
- Vincular alunos a turmas
- Controlar capacidade máxima

### 6. Registro de Sessões
- Criar sessão para uma turma/data
- Registrar presença por aluno
- Registrar desempenho: folhas feitas, erros, tempo
- Registrar nível trabalhado na sessão
- Adicionar observações por aluno

### 7. Progressão de Nível
- Registrar avanço ou regressão de nível
- Histórico de progressão por aluno/matéria

### 8. Gestão de Pagamentos
- Gerar mensalidade por aluno/matéria
- Registrar pagamento (data, forma, valor)
- Listar inadimplentes
- Filtros por mês, status e aluno

### 9. Dashboard (Franqueado)
- Total de alunos ativos
- Sessões da semana
- Inadimplência do mês
- Alunos com melhor/pior desempenho recente

---

## Versão 2.0 (pós-MVP)

Funcionalidades de valor agregado após consolidação do MVP.

### 10. Portal do Responsável (Web/Mobile)
- Login com email
- Ver desempenho do filho por sessão
- Ver nível atual e histórico de progressão
- Ver situação do pagamento
- Receber notificações

### 11. Relatórios
- Desempenho por aluno (período)
- Evolução de nível por matéria
- Frequência mensal
- Receita mensal e inadimplência
- Exportação em PDF e CSV

### 12. Comunicação
- Envio de avisos para responsáveis (email ou notificação)
- Registro de ocorrências/observações por aluno

### 13. Controle de Material
- Estoque de folhas por nível/matéria
- Registro de entrega de material ao aluno
- Alerta de estoque baixo

### 14. Modo Offline (Desktop)
- Registro de sessão sem internet
- Sincronização automática quando reconectar

### 15. Configurações da Unidade
- Dados da franquia
- Valores de mensalidade por matéria
- Dias e feriados sem aula
- Logo e personalização

---

## Priorização

```
MVP ──────────────────────────── v2.0
 1  2  3  4  5  6  7  8  9     10 11 12 13 14 15
[Auth][Alunos][Matrículas][Sessões][Pagamentos][Dashboard]
```

### Ordem de desenvolvimento sugerida:
1. Estrutura do projeto + banco de dados + autenticação
2. Alunos + Responsáveis + Matrículas
3. Turmas + Sessões + Desempenho
4. Pagamentos + Inadimplência
5. Dashboard
6. Portal do responsável
7. Relatórios
8. Demais funcionalidades v2.0
