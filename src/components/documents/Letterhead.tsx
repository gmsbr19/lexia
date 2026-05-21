export function Letterhead() {
  return (
    <div style={{
      padding: "16px 28px 12px",
      borderBottom: "1.5px solid #C0A147",
      display: "flex", alignItems: "center", gap: 12,
      background: "#FFFFFF",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: "linear-gradient(135deg, #C0A147 0%, #9a7f2e 100%)",
        color: "#020D25",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14,
      }}>M</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 11, fontWeight: 600, color: "#020D25", letterSpacing: "0.02em" }}>
          MORAES & ASSOCIADOS
        </div>
        <div style={{ fontSize: 7, color: "#020D25", opacity: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Sociedade de Advogados — OAB/SP 12.348
        </div>
      </div>
      <div style={{ fontSize: 7, color: "#020D25", opacity: 0.6, textAlign: "right" }}>
        Av. Paulista, 1842 · 14º andar<br />São Paulo · SP · 01310-100
      </div>
    </div>
  );
}

export function ContractParagraph({ children, indent }: { children: React.ReactNode; indent?: boolean }) {
  return (
    <p style={{
      margin: "0 0 10px",
      fontSize: "9.5px",
      lineHeight: 1.7,
      color: "#020D25",
      textAlign: "justify",
      textIndent: indent ? 18 : 0,
      letterSpacing: 0,
    }}>{children}</p>
  );
}
