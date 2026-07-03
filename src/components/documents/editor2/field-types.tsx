// Field-type presentation for the merge-field placeholders — maps a semantic
// `PlaceholderType` to a lucide icon + a short PT-BR label. Used by the fields
// panel (icon per chip) and the on-page fill / "posicionar campo" popovers so
// the type is legible at a glance (CPF, Endereço, Data…). Presentation only —
// the canonical types live in `lib/documents/model/types.ts`.
import {
  Braces,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Fingerprint,
  Gavel,
  Hash,
  Mail,
  MapPin,
  Scale,
  User,
  type LucideIcon,
} from "lucide-react"
import type { PlaceholderType } from "@/lib/documents/model/types"

interface FieldTypeMeta {
  label: string
  Icon: LucideIcon
}

const META: Record<PlaceholderType, FieldTypeMeta> = {
  texto: { label: "Texto", Icon: FileText },
  nome: { label: "Nome", Icon: User },
  cpf: { label: "CPF", Icon: Fingerprint },
  cnpj: { label: "CNPJ", Icon: Building2 },
  rg: { label: "RG", Icon: CreditCard },
  oab: { label: "OAB", Icon: Scale },
  data: { label: "Data", Icon: Calendar },
  valor: { label: "Valor", Icon: DollarSign },
  endereco: { label: "Endereço", Icon: MapPin },
  email: { label: "E-mail", Icon: Mail },
  processo: { label: "Processo", Icon: Gavel },
  numero: { label: "Número", Icon: Hash },
}

const FALLBACK: FieldTypeMeta = { label: "Campo", Icon: Braces }

/** Icon + PT-BR label for a placeholder's data type (falls back to a generic field). */
export function fieldTypeMeta(dataType?: PlaceholderType | null): FieldTypeMeta {
  return (dataType && META[dataType]) || FALLBACK
}

/** The list of pickable field types, in a sensible authoring order (for the "posicionar campo" form). */
export const FIELD_TYPE_OPTIONS: { value: PlaceholderType; label: string }[] = [
  "texto",
  "nome",
  "cpf",
  "cnpj",
  "rg",
  "oab",
  "data",
  "valor",
  "endereco",
  "email",
  "processo",
  "numero",
].map((value) => ({ value: value as PlaceholderType, label: META[value as PlaceholderType].label }))
