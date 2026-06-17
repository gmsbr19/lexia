"use client"

// ClientePicker — searches existing clientes (searchAll, debounced) and, on
// select, fetches GET /api/clientes/{id} to prefill contratantes[0]. Surfaces the
// linked clienteId via onClienteChange. All prefilled fields stay editable; if the
// user just types a name without picking, that's fine (the cliente is auto-created
// on "Contrato fechado" later).
import { useEffect, useRef, useState } from "react"
import { Search, X, User, Check } from "lucide-react"
import { searchAll, fetchClienteDetail } from "@/components/crm/crm-api"
import type { ContratoHonorariosData, ContratantePF, ContratantePJ } from "@/lib/types/contrato-honorarios"
import { newContratantePF, newContratantePJ } from "@/lib/types/contrato-honorarios"
import * as s from "./ClientePicker.css"

interface ClienteHit {
  id: number
  nome: string
  tipo: string
  cidade: string | null
  uf: string | null
}

interface ClientePickerProps {
  data: ContratoHonorariosData
  onChange: (data: ContratoHonorariosData) => void
  clienteId: number | null
  onClienteChange: (id: number | null, nome?: string) => void
}

function composeEndereco(h: {
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
}): string {
  const parts: string[] = []
  if (h.logradouro) parts.push(h.logradouro)
  if (h.numero) parts.push(`nº ${h.numero}`)
  if (h.complemento) parts.push(h.complemento)
  if (h.bairro) parts.push(h.bairro)
  const cidadeUf = [h.cidade, h.uf].filter(Boolean).join("/")
  if (cidadeUf) parts.push(cidadeUf)
  if (h.cep) parts.push(`CEP ${h.cep}`)
  return parts.join(", ")
}

export function ClientePicker({ data, onChange, clienteId, onClienteChange }: ClientePickerProps) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<ClienteHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkedName, setLinkedName] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Debounced search (min 2 chars).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await searchAll(q)
        setHits(r.clientes.slice(0, 8).map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, cidade: c.cidade, uf: c.uf })))
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  async function pick(hit: ClienteHit) {
    setOpen(false)
    setQuery("")
    setHits([])
    try {
      const detail = await fetchClienteDetail(hit.id)
      const h = detail.header
      const endereco = composeEndereco(h)
      const email = h.emails?.[0] ?? ""
      const existing = data.contratantes[0]
      let primeiro: ContratantePF | ContratantePJ
      if (h.tipo === "pj") {
        const base = existing?.tipo === "pj" ? existing : newContratantePJ()
        primeiro = {
          ...base,
          razaoSocial: h.nome.toUpperCase(),
          cnpj: h.cpfCnpj ?? base.cnpj,
          endereco: endereco || base.endereco,
          email: email || base.email,
        }
      } else {
        const base = existing?.tipo === "pf" ? existing : newContratantePF()
        primeiro = {
          ...base,
          nome: h.nome.toUpperCase(),
          cpf: h.cpfCnpj ?? base.cpf,
          endereco: endereco || base.endereco,
          email: email || base.email,
        }
      }
      onChange({ ...data, contratantes: [primeiro, ...data.contratantes.slice(1)] })
      setLinkedName(h.nome)
      onClienteChange(hit.id, h.nome)
    } catch {
      // Best-effort; keep the form untouched on failure.
    }
  }

  function unlink() {
    setLinkedName(null)
    onClienteChange(null)
  }

  if (clienteId && linkedName) {
    return (
      <div className={s.linkedChip}>
        <div className={s.linkedDot}>
          <Check size={14} strokeWidth={2.2} />
        </div>
        <div className={s.linkedMeta}>
          <div className={s.linkedName}>{linkedName}</div>
          <div className={s.linkedSub}>Cliente vinculado</div>
        </div>
        <button type="button" onClick={unlink} className={s.linkedUnlink} title="Desvincular">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className={s.root} ref={rootRef}>
      <div className={s.inputWrap}>
        <span className={s.inputIcon}>
          <Search size={14} />
        </span>
        <input
          className={s.input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente existente para vincular…"
        />
        {query && (
          <button type="button" className={s.clearBtn} onClick={() => { setQuery(""); setHits([]) }} title="Limpar">
            <X size={12} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className={s.menu}>
          {loading && hits.length === 0 && <div className={s.emptyState}>Buscando…</div>}
          {!loading && hits.length === 0 && <div className={s.emptyState}>Nenhum cliente encontrado</div>}
          {hits.map((hit) => (
            <button key={hit.id} type="button" className={s.item} onClick={() => void pick(hit)}>
              <div className={s.itemAvatar}>
                <User size={13} />
              </div>
              <div className={s.itemMeta}>
                <div className={s.itemName}>{hit.nome}</div>
                <div className={s.itemSub}>
                  {hit.tipo === "pj" ? "Pessoa jurídica" : "Pessoa física"}
                  {hit.cidade ? ` · ${hit.cidade}${hit.uf ? `/${hit.uf}` : ""}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className={s.helpHint}>
        Vincule um cliente do cadastro ou apenas digite os dados abaixo — um novo cadastro é criado ao fechar o contrato.
      </div>
    </div>
  )
}
