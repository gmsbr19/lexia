// Pure Brazilian document/process-number validators (check digits). Wired into
// the module's zod schemas via .refine(); also used by the seed to mint valid
// CNJs. No deps, no Prisma — unit-tested in tests/cnj.test.ts.

/** Iterative mod-97 of a numeric string (avoids BigInt; IBAN-style). */
function mod97(digits: string): number {
  let r = 0
  for (let i = 0; i < digits.length; i++) {
    r = (r * 10 + (digits.charCodeAt(i) - 48)) % 97
  }
  return r
}

export interface CnjPartes {
  sequencial: string // NNNNNNN
  dv: string // DD
  ano: string // AAAA
  segmento: string // J
  tribunal: string // TR
  origem: string // OOOO
}

/** Split a CNJ number (any punctuation) into its 6 parts, or null if not 20 digits. */
export function parseCnj(numero: string): CnjPartes | null {
  const c = (numero ?? "").replace(/\D/g, "")
  if (c.length !== 20) return null
  return {
    sequencial: c.slice(0, 7),
    dv: c.slice(7, 9),
    ano: c.slice(9, 13),
    segmento: c.slice(13, 14),
    tribunal: c.slice(14, 16),
    origem: c.slice(16, 20),
  }
}

/**
 * Validate a CNJ unified process number (Res. CNJ 65/2008, mod 97).
 * Check: mod97( NNNNNNN AAAA J TR OOOO DD ) === 1.
 */
export function validarCnj(numero: string): boolean {
  const p = parseCnj(numero)
  if (!p) return false
  const base = p.sequencial + p.ano + p.segmento + p.tribunal + p.origem + p.dv
  return mod97(base) === 1
}

/** Compute the 2 check digits for the significant parts of a CNJ. */
export function calcularDvCnj(sequencial: string, ano: string, segmento: string, tribunal: string, origem: string): string {
  const base = sequencial.padStart(7, "0") + ano + segmento + tribunal.padStart(2, "0") + origem.padStart(4, "0") + "00"
  const dv = 98 - mod97(base)
  return String(dv).padStart(2, "0")
}

/** Build a formatted, valid CNJ string from its significant parts (used by the seed). */
export function montarCnj(sequencial: string, ano: string, segmento: string, tribunal: string, origem: string): string {
  const seq = sequencial.padStart(7, "0")
  const tr = tribunal.padStart(2, "0")
  const og = origem.padStart(4, "0")
  const dv = calcularDvCnj(seq, ano, segmento, tr, og)
  return `${seq}-${dv}.${ano}.${segmento}.${tr}.${og}`
}

/** Format 20 raw digits as NNNNNNN-DD.AAAA.J.TR.OOOO (returns input if not 20 digits). */
export function formatarCnj(numero: string): string {
  const p = parseCnj(numero)
  if (!p) return numero
  return `${p.sequencial}-${p.dv}.${p.ano}.${p.segmento}.${p.tribunal}.${p.origem}`
}

/** Validate a CPF (11 digits, two mod-11 check digits). Rejects all-equal sequences. */
export function validarCpf(cpf: string): boolean {
  const c = (cpf ?? "").replace(/\D/g, "")
  if (c.length !== 11) return false
  if (/^(\d)\1{10}$/.test(c)) return false
  const calc = (len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10])
}

/** Validate a CNPJ (14 digits, two mod-11 check digits). Rejects all-equal sequences. */
export function validarCnpj(cnpj: string): boolean {
  const c = (cnpj ?? "").replace(/\D/g, "")
  if (c.length !== 14) return false
  if (/^(\d)\1{13}$/.test(c)) return false
  const calc = (len: number): number => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(c[i]) * weights[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13])
}

/** Validate either a CPF or a CNPJ depending on digit count. */
export function validarCpfCnpj(doc: string): boolean {
  const c = (doc ?? "").replace(/\D/g, "")
  if (c.length === 11) return validarCpf(c)
  if (c.length === 14) return validarCnpj(c)
  return false
}
