import { TrendingUp, TrendingDown, Minus, BarChart2, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'

interface SessaoHistorico {
  id: string
  presente: boolean
  acertos?: number | null
  erros?: number | null
  tempoMinutos?: number | null
  materialCodigo?: string | null
  sessao: { data: string }
  nivel?: { codigo: string } | null
}

interface Props {
  sessoes: SessaoHistorico[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function media(valores: number[]): number {
  if (valores.length === 0) return 0
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

type Tendencia = 'subindo' | 'caindo' | 'estavel'

function calcularTendencia(anterior: number[], recente: number[]): Tendencia {
  if (anterior.length === 0 || recente.length === 0) return 'estavel'
  const diff = media(recente) - media(anterior)
  const threshold = media([...anterior, ...recente]) * 0.1 // 10% de variação = relevante
  if (diff > threshold) return 'subindo'
  if (diff < -threshold) return 'caindo'
  return 'estavel'
}

function formatarDataCurta(dateStr: string): string {
  const p = dateStr.split('T')[0]!.split('-')
  return `${p[2]}/${p[1]}`
}

// ─── Mini Sparkline (barras CSS puras) ────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-0.5 w-full">
      <div className="flex w-full items-end" style={{ height: 36 }}>
        <div
          className={`w-full rounded-t transition-all ${color}`}
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  )
}

function Sparkline({
  label,
  values,
  dates,
  color,
  unit,
  invertido,
}: {
  label: string
  values: number[]
  dates: string[]
  color: string
  unit?: string
  invertido?: boolean // para erros: menor é melhor
}) {
  if (values.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-muted-foreground">Sem dados</p>
      </div>
    )
  }

  const max = Math.max(...values, 1)
  const ultimo = values[values.length - 1] ?? 0
  const penultimo = values[values.length - 2] ?? null

  let delta: number | null = null
  let tendencia: Tendencia = 'estavel'
  if (penultimo !== null) {
    delta = ultimo - penultimo
    if (Math.abs(delta) < max * 0.05) tendencia = 'estavel'
    else if (delta > 0) tendencia = invertido ? 'caindo' : 'subindo'
    else tendencia = invertido ? 'subindo' : 'caindo'
  }

  const TendIcon =
    tendencia === 'subindo'
      ? TrendingUp
      : tendencia === 'caindo'
      ? TrendingDown
      : Minus

  const tendColor =
    tendencia === 'subindo'
      ? 'text-green-600'
      : tendencia === 'caindo'
      ? 'text-red-500'
      : 'text-muted-foreground'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex items-center gap-1 ${tendColor}`}>
          <TendIcon className="h-3 w-3" />
          <span className="text-xs font-semibold">
            {ultimo.toFixed(unit === 'min' ? 0 : 1)}{unit ?? ''}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-0.5 h-9">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 flex items-end"
            title={`${dates[i] ?? ''}: ${v.toFixed(1)}${unit ?? ''}`}
          >
            <div
              className={`w-full rounded-sm transition-all ${
                i === values.length - 1 ? color.replace('/50', '') : color
              }`}
              style={{ height: `${Math.max(Math.round((v / max) * 100), 8)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <span className="text-[10px] text-muted-foreground">{dates[0]}</span>
        <span className="text-[10px] text-muted-foreground">{dates[dates.length - 1]}</span>
      </div>
    </div>
  )
}

// ─── Card de Tendência ─────────────────────────────────────────────────────────

interface TendenciaCardProps {
  label: string
  tendencia: Tendencia
  mediaAnterior: number | null
  mediaRecente: number | null
  unit?: string
  invertido?: boolean
}

function TendenciaCard({ label, tendencia, mediaAnterior, mediaRecente, unit = '', invertido }: TendenciaCardProps) {
  const positivo = invertido ? tendencia === 'caindo' : tendencia === 'subindo'
  const negativo = invertido ? tendencia === 'subindo' : tendencia === 'caindo'

  const Icon = tendencia === 'subindo' ? TrendingUp : tendencia === 'caindo' ? TrendingDown : Minus

  const bg = positivo ? 'bg-green-50 border-green-200' : negativo ? 'bg-red-50 border-red-200' : 'bg-muted/40 border-border'
  const textColor = positivo ? 'text-green-700' : negativo ? 'text-red-600' : 'text-muted-foreground'
  const iconColor = positivo ? 'text-green-600' : negativo ? 'text-red-500' : 'text-muted-foreground'

  const diff = mediaAnterior !== null && mediaRecente !== null ? mediaRecente - mediaAnterior : null

  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className={`text-base font-bold ${textColor}`}>
            {mediaRecente !== null ? `${mediaRecente.toFixed(1)}${unit}` : '—'}
          </p>
          {diff !== null && Math.abs(diff) >= 0.05 && (
            <p className={`text-xs mt-0.5 ${textColor}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit} vs anterior
            </p>
          )}
          {tendencia === 'estavel' && (
            <p className="text-xs mt-0.5 text-muted-foreground">Estável</p>
          )}
        </div>
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      </div>
    </div>
  )
}

// ─── Progressão de Materiais ──────────────────────────────────────────────────

function ProgressaoMateriais({ sessoes }: { sessoes: SessaoHistorico[] }) {
  // Extrai materiais únicos em ordem cronológica
  const materiais: { codigo: string; data: string }[] = []
  for (const s of [...sessoes].reverse()) {
    const codigo = s.materialCodigo ?? s.nivel?.codigo ?? null
    if (!codigo) continue
    const ultimo = materiais[materiais.length - 1]
    if (!ultimo || ultimo.codigo !== codigo) {
      materiais.push({ codigo, data: s.sessao.data })
    }
  }

  if (materiais.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2 text-center">
        Nenhum material registrado ainda.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {materiais.map((m, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`flex flex-col items-center rounded-lg border px-2.5 py-1.5 text-center ${
            i === materiais.length - 1
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-muted/40 text-muted-foreground'
          }`}>
            <span className="text-xs font-bold">{m.codigo}</span>
            <span className="text-[10px] text-muted-foreground">{formatarDataCurta(m.data)}</span>
          </div>
          {i < materiais.length - 1 && (
            <div className="h-px w-3 bg-border" />
          )}
        </div>
      ))}
      {materiais.length > 1 && (
        <span className="text-xs text-muted-foreground ml-1">
          ({materiais.length} materiais)
        </span>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AlunoEvolucao({ sessoes }: Props) {
  // Filtra apenas sessões com presença e com ao menos um dado de desempenho
  const comDados = sessoes.filter(
    (s) => s.presente && (s.acertos != null || s.erros != null || s.tempoMinutos != null),
  )

  // Últimas 8 sessões para os sparklines
  const ultimas8 = comDados.slice(0, 8).reverse()

  const acertosValues = ultimas8.map((s) => s.acertos ?? 0)
  const errosValues = ultimas8.map((s) => s.erros ?? 0)
  const tempoValues = ultimas8.map((s) => s.tempoMinutos ?? 0)
  const dates = ultimas8.map((s) => formatarDataCurta(s.sessao.data))

  // Tendência: últimas 3 vs anteriores 3
  const recentes = comDados.slice(0, 3)
  const anteriores = comDados.slice(3, 6)

  const aRec = recentes.filter((s) => s.acertos != null).map((s) => s.acertos!)
  const aAnt = anteriores.filter((s) => s.acertos != null).map((s) => s.acertos!)
  const eRec = recentes.filter((s) => s.erros != null).map((s) => s.erros!)
  const eAnt = anteriores.filter((s) => s.erros != null).map((s) => s.erros!)
  const tRec = recentes.filter((s) => s.tempoMinutos != null).map((s) => s.tempoMinutos!)
  const tAnt = anteriores.filter((s) => s.tempoMinutos != null).map((s) => s.tempoMinutos!)

  const tendAcertos = calcularTendencia(aAnt, aRec)
  const tendErros = calcularTendencia(eAnt, eRec)
  const tendTempo = calcularTendencia(tAnt, tRec)

  const semDados = comDados.length === 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart2 className="h-4 w-4 text-blue-500" />
          Evolução
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {semDados ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Sem dados de desempenho ainda</p>
            <p className="text-xs text-muted-foreground">
              Registre sessões com acertos, erros e tempo para ver a evolução aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Tendência resumida */}
            {comDados.length >= 3 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Tendência — últimas 3 vs anteriores 3 sessões
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <TendenciaCard
                    label="Acertos"
                    tendencia={tendAcertos}
                    mediaAnterior={aAnt.length > 0 ? media(aAnt) : null}
                    mediaRecente={aRec.length > 0 ? media(aRec) : null}
                  />
                  <TendenciaCard
                    label="Erros"
                    tendencia={tendErros}
                    mediaAnterior={eAnt.length > 0 ? media(eAnt) : null}
                    mediaRecente={eRec.length > 0 ? media(eRec) : null}
                    invertido
                  />
                  <TendenciaCard
                    label="Tempo"
                    tendencia={tendTempo}
                    mediaAnterior={tAnt.length > 0 ? media(tAnt) : null}
                    mediaRecente={tRec.length > 0 ? media(tRec) : null}
                    unit="min"
                    invertido
                  />
                </div>
              </div>
            )}

            {/* Sparklines */}
            {ultimas8.length >= 2 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Histórico — últimas {ultimas8.length} sessões
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {acertosValues.some((v) => v > 0) && (
                    <Sparkline
                      label="Acertos"
                      values={acertosValues}
                      dates={dates}
                      color="bg-green-400/50"
                    />
                  )}
                  {errosValues.some((v) => v > 0) && (
                    <Sparkline
                      label="Erros"
                      values={errosValues}
                      dates={dates}
                      color="bg-red-400/50"
                      invertido
                    />
                  )}
                  {tempoValues.some((v) => v > 0) && (
                    <Sparkline
                      label="Tempo (min)"
                      values={tempoValues}
                      dates={dates}
                      color="bg-blue-400/50"
                      unit="min"
                      invertido
                    />
                  )}
                </div>
              </div>
            )}

            {/* Progressão de materiais */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Progressão de materiais
              </p>
              <ProgressaoMateriais sessoes={sessoes} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
