// Núcleo puro do painel de reconciliação — bucket de semana (segunda-feira,
// ISO-ish) para agrupar contagens "por semana e por estágio". Sem
// Prisma/React — testável isoladamente.

/** Segunda-feira da semana que contém `d`, como "AAAA-MM-DD" (UTC, estável
 *  independente do fuso do processo). */
export function inicioDaSemana(d: Date): string {
  const diaSemana = d.getUTCDay() // 0=domingo..6=sábado
  const deltaParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana
  const seg = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + deltaParaSegunda))
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${seg.getUTCFullYear()}-${pad(seg.getUTCMonth() + 1)}-${pad(seg.getUTCDate())}`
}

/** As últimas N semanas (mais recente primeiro), como chaves "AAAA-MM-DD"
 *  (segunda-feira) — usado para garantir que semanas sem nenhum evento ainda
 *  apareçam no painel (zero, não ausentes). */
export function ultimasSemanas(agora: Date, n: number): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    out.push(inicioDaSemana(new Date(agora.getTime() - i * 7 * 86_400_000)))
  }
  return out
}
