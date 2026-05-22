import { tabStrip, tabButton } from "./TabStrip.css"

export type DocumentsTab = "criar" | "meus-documentos" | "modelos"

const TABS: Array<{ id: DocumentsTab; label: string }> = [
  { id: "criar", label: "Criar" },
  { id: "meus-documentos", label: "Meus documentos (142)" },
  { id: "modelos", label: "Modelos (32)" },
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
    </div>
  )
}
