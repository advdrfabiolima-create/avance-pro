import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/layout/AppLayout'

// Páginas existentes
const LoginPage = lazy(() => import('./pages/Login'))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const AlunosPage = lazy(() => import('./pages/Alunos/index'))
const AlunoDetalhePage = lazy(() => import('./pages/Alunos/AlunoDetalhe'))
const ResponsaveisPage = lazy(() => import('./pages/Responsaveis/index'))
const ResponsavelDetalhePage = lazy(() => import('./pages/Responsaveis/ResponsavelDetalhe'))
const TurmasPage = lazy(() => import('./pages/Turmas/index'))
const SessoesPage = lazy(() => import('./pages/Sessoes/index'))
const SessaoDetalhePage = lazy(() => import('./pages/Sessoes/SessaoDetalhe'))
const PagamentosPage = lazy(() => import('./pages/Pagamentos/index'))
const UsuariosPage = lazy(() => import('./pages/Usuarios/index'))
const ConfiguracoesPage = lazy(() => import('./pages/Configuracoes/index'))

// Novas páginas — Fase 1
const DisciplinasPage = lazy(() => import('./pages/Disciplinas/index'))
const AuxiliaresPage = lazy(() => import('./pages/Auxiliares/index'))
const ReunioesPage = lazy(() => import('./pages/Reunioes/index'))
const QuadroHorariosPage = lazy(() => import('./pages/QuadroHorarios/index'))
const PresencaPage = lazy(() => import('./pages/Presenca/index'))

// Novas páginas — Fase 2
const MovimentosPage = lazy(() => import('./pages/Movimentos/index'))
const CobrancasPage = lazy(() => import('./pages/Cobrancas/index'))
const RecorrenciasPage = lazy(() => import('./pages/Recorrencias/index'))
const RelatoriosPage = lazy(() => import('./pages/Relatorios/index'))

// Novas páginas — Fase 3
const NotasFiscaisPage = lazy(() => import('./pages/NotasFiscais/index'))
const ImportacoesPage = lazy(() => import('./pages/Importacoes/index'))
const ReajustesPage = lazy(() => import('./pages/Reajustes/index'))

const GuiaPage = lazy(() => import('./pages/Guia/index'))

// Novas páginas — Fase 4: Exercícios
const ExerciciosPage = lazy(() => import('./pages/Exercicios/index'))
const ExercicioDetalhePage = lazy(() => import('./pages/Exercicios/ExercicioDetalhe'))
const ExercicioExecucaoPage = lazy(() => import('./pages/Exercicios/ExercicioExecucao'))
const TentativaResultadoPage = lazy(() => import('./pages/Exercicios/TentativaResultado'))
const OcrUploadPage = lazy(() => import('./pages/Exercicios/OcrUpload'))
const OcrRevisaoPage = lazy(() => import('./pages/Exercicios/OcrRevisao'))

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <span className="text-muted-foreground text-sm">Carregando...</span>
        </div>
      }
    >
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas protegidas */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Alunos */}
            <Route path="/alunos" element={<AlunosPage />} />
            <Route path="/alunos/:id" element={<AlunoDetalhePage />} />

            {/* Responsáveis */}
            <Route path="/responsaveis" element={<ResponsaveisPage />} />
            <Route path="/responsaveis/:id" element={<ResponsavelDetalhePage />} />

            {/* Operacional */}
            <Route path="/turmas" element={<TurmasPage />} />
            <Route path="/disciplinas" element={<DisciplinasPage />} />
            <Route path="/sessoes" element={<SessoesPage />} />
            <Route path="/sessoes/:id" element={<SessaoDetalhePage />} />
            <Route path="/quadro-horarios" element={<QuadroHorariosPage />} />
            <Route path="/presenca" element={<PresencaPage />} />
            <Route path="/reunioes" element={<ReunioesPage />} />

            {/* Equipe */}
            <Route path="/auxiliares" element={<AuxiliaresPage />} />

            {/* Financeiro */}
            <Route path="/pagamentos" element={<PagamentosPage />} />
            <Route path="/movimentos" element={<MovimentosPage />} />
            <Route path="/cobrancas" element={<CobrancasPage />} />
            <Route path="/recorrencias" element={<RecorrenciasPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />

            {/* Avançado */}
            <Route path="/notas-fiscais" element={<NotasFiscaisPage />} />
            <Route path="/importacoes" element={<ImportacoesPage />} />
            <Route path="/reajustes" element={<ReajustesPage />} />

            {/* Exercícios */}
            <Route path="/exercicios" element={<ExerciciosPage />} />
            <Route path="/exercicios/:id" element={<ExercicioDetalhePage />} />
            <Route path="/exercicios/:exercicioId/executar/:alunoId" element={<ExercicioExecucaoPage />} />
            <Route path="/tentativas/:id" element={<TentativaResultadoPage />} />

            {/* OCR — correção por foto */}
            <Route path="/ocr/upload" element={<OcrUploadPage />} />
            <Route path="/ocr/:id/revisar" element={<OcrRevisaoPage />} />

            {/* Admin */}
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/guia" element={<GuiaPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
