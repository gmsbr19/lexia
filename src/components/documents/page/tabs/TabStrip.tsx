import { tabStrip, tabButton, moduleLabel } from "./TabStrip.css"

export type DocumentsTab = "criar" | "meus-documentos" | "modelos" | "timbrados"

const TABS: Array<{ id: DocumentsTab; label: string }> = [
  { id: "criar", label: "Novo documento" },
  { id: "meus-documentos", label: "Meus documentos" },
  { id: "modelos", label: "Modelos" },
  { id: "timbrados", label: "Papéis timbrados" },
]

export function DocumentsTabStrip({
  activeTab,
  onChange,
}: {
  activeTab: DocumentsTab
  onChange: (tab: DocumentsTab) => void
}) {
  return (
    <div className={tabStrip}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={tabButton({ active: activeTab === tab.id })}
        >
          {tab.label}
        </button>
      ))}
      <span className={moduleLabel}>Módulo de Documentos</span>
    </div>
  )
}
