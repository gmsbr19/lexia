// Uma tarefa criada pelo Claude tem de chegar com o ENUNCIADO pronto: quem for
// executá-la (às vezes semanas depois, sem ter visto a conversa) precisa saber o
// que fazer sem perguntar a ninguém. Então descrição deixou de ser opcional nas
// ferramentas de criação — e, como campo obrigatório convida a texto de
// enchimento ("a definir", o próprio título repetido), a regra confere o
// CONTEÚDO, não só a presença.
//
// O que se exige é a TAREFA EXECUTÁVEL, não que o usuário dite o texto: o modelo
// redige a descrição a partir do que foi pedido e só pergunta quando o pedido não
// dá nem para explicar a tarefa a quem vai executá-la ("abre uma tarefa pro
// Leandro" e mais nada). Guardrail apertado demais põe fricção em criar tarefa,
// que é justamente o que tem de ser fácil.
//
// Núcleo PURO (sem prisma/relógio) para ser exercitado por teste: a mensagem de
// recusa é parte da regra, porque é ela que ensina essa ordem — redigir primeiro,
// perguntar só o que falta — em vez de deixar o modelo inventar fato ou encher o
// campo só para satisfazer a validação.
//
// Vale só para o que o Claude cria por conversa. A TELA não passa por aqui (lá
// quem escreve é a própria pessoa, que acabou de decidir a tarefa), nem
// `aplicar_modelo` (o passo do modelo é um enunciado que o escritório já
// aprovou na tela).
import { UserError } from "@/lib/errors"
import { normalizar } from "@/lib/text"

export const DESCRICAO_MIN_CHARS = 30
export const DESCRICAO_MIN_PALAVRAS = 5

/** Texto do `.describe()` — é o que o modelo lê no schema da ferramenta. */
export const DESCRICAO_DESCRIBE =
  "OBRIGATÓRIA: o enunciado da tarefa — o que precisa ser feito, onde (caso/processo), com quem e qual é o resultado esperado. " +
  "ESCREVA você, a partir do que o usuário pediu; não peça a ele para ditar a descrição. Só pergunte quando o pedido não permitir " +
  "nem explicar a tarefa a quem vai executá-la. Não repita o título, não escreva 'a definir' e não invente fato que o usuário não " +
  "disse (prazo, número de processo, pessoa)."

/** Frases que ocupam o campo sem dizer nada (comparadas com a descrição INTEIRA). */
const VAZIAS = new Set([
  "a definir",
  "a combinar",
  "a ser definido",
  "a ser definida",
  "definir",
  "definir depois",
  "detalhar",
  "detalhar depois",
  "combinar",
  "pendente",
  "sem descricao",
  "sem detalhes",
  "nao informado",
  "nao informada",
  "na",
  "n a",
  "tbd",
  "idem",
  "idem titulo",
  "idem o titulo",
  "ver com o cliente",
  "ver com",
  "verificar",
  "conferir",
  "fazer",
  "fazer a tarefa",
  "realizar a tarefa",
  "executar",
  "conforme combinado",
  "conforme conversado",
  "conforme solicitado",
  "conforme o pedido",
])

function limpo(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

/** Só letras/números/espaço, sem acento — para comparar com as frases vazias. */
function miolo(s: string): string {
  return limpo(normalizar(s).replace(/[^\p{L}\p{N}]+/gu, " "))
}

function palavras(s: string): number {
  return miolo(s).split(" ").filter(Boolean).length
}

/** O texto, por si só, dá para executar a tarefa? (medida de tamanho, não de verdade) */
function basta(s: string): boolean {
  const t = limpo(s)
  return t.length >= DESCRICAO_MIN_CHARS && palavras(t) >= DESCRICAO_MIN_PALAVRAS
}

/**
 * O que está errado com a descrição desta tarefa, em pt-BR — null quando está
 * boa. O título entra para pegar a descrição que só o repete — e só é problema
 * quando o título, sozinho, não diz o trabalho: título já completo + descrição
 * igual é redundante, mas a tarefa está executável, e recusar aí seria fricção
 * sem ganho (o que se exige é a tarefa executável, não um texto diferente).
 */
export function problemaDescricao(titulo: string | null | undefined, descricao: string | null | undefined): string | null {
  const d = limpo(descricao ?? "")
  if (!d) return "ficou sem descrição"
  const m = miolo(d)
  if (!m) return "ficou sem descrição"
  if (VAZIAS.has(m)) return `não diz o que precisa ser feito (só "${d}")`
  if (titulo && m === miolo(titulo) && !basta(titulo)) return "só repete o título, que não diz o que fazer"
  if (d.length < DESCRICAO_MIN_CHARS) {
    return `é curta demais para ser executada (${d.length} caracteres; o mínimo é ${DESCRICAO_MIN_CHARS})`
  }
  if (palavras(d) < DESCRICAO_MIN_PALAVRAS) {
    return `é curta demais para ser executada (o mínimo é ${DESCRICAO_MIN_PALAVRAS} palavras)`
  }
  return null
}

/**
 * A recusa, escrita para o MODELO, e na ordem certa: redigir é com ele (deduzir
 * do pedido é bem-vindo), perguntar é o que sobra quando o pedido não dá para
 * explicar a tarefa a ninguém. Fato, esse sim, não se deduz. `qual` nomeia a
 * tarefa quando são várias.
 */
export function recusaDescricao(motivo: string, titulo: string, qual?: string): string {
  const quem = qual ? `${qual} ("${titulo}")` : `A tarefa "${titulo}"`
  return (
    `${quem} ${motivo}. A descrição é SUA para escrever: redija o enunciado a partir do que o usuário pediu — o que precisa ser ` +
    `feito, onde (caso/processo), com quem e qual é o resultado esperado. Se você consegue explicar a tarefa a quem vai ` +
    `executá-la, escreva e crie. Se o pedido não dá nem para isso, pergunte só o que falta, de uma vez, e crie depois — mas não ` +
    `encha o campo com palpite, com o título repetido, nem com fato que o usuário não disse (prazo, processo, pessoa).`
  )
}

/** Recusa a criação quando a descrição não serve. Usada pelas ferramentas de criação. */
export function exigirDescricao(titulo: string, descricao: string | null | undefined, qual?: string): void {
  const motivo = problemaDescricao(titulo, descricao)
  if (motivo) throw new UserError(recusaDescricao(motivo, titulo, qual))
}
