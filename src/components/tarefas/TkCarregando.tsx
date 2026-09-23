// Tarefas — estado "Carregando" (esqueleto com a geometria da linha-resumo e dos
// cartões). Sem contexto, sem hooks: usado pelos loading.tsx das rotas.
import "./tk.css"

const COLUNAS = ["A fazer", "Em andamento", "Aguardando", "Concluído"]

function CartaoEsqueleto() {
  return (
    <div className="tk-card" style={{ pointerEvents: "none", gap: 8 }} aria-hidden>
      <div className="skeleton" style={{ height: 10, width: "45%" }} />
      <div className="skeleton" style={{ height: 14, width: "85%" }} />
      <div className="skeleton" style={{ height: 10, width: "30%" }} />
    </div>
  )
}

export function TkCarregando({ titulo = "Quadro" }: { titulo?: string }) {
  return (
    <div className="tk-scope tk-root" aria-busy="true">
      <aside className="tk-side" aria-hidden>
        <div className="tk-side-head">Tarefas</div>
        <div className="skeleton" style={{ height: 34, marginBottom: 10 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: 14, margin: "10px 10px", width: "60%" }} />
        ))}
      </aside>
      <main className="tk-main">
        <div className="tk-head">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 className="tk-h1">{titulo}</h1>
            <div className="skeleton" style={{ height: 14, width: 220 }} />
          </div>
          <div className="skeleton" style={{ height: 28, width: 160 }} />
        </div>
        <div className="tk-colheads">
          <div className="tk-cols">
            {COLUNAS.map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", height: 36, fontSize: 12, fontWeight: 500 }}>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div className="tk-body">
          <div className="tk-cols">
            {COLUNAS.map((c, i) => (
              <div key={c} className="tk-col">
                {Array.from({ length: i === 3 ? 1 : 4 }, (_, k) => (
                  <CartaoEsqueleto key={k} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
