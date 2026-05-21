export function Letterhead() {
  return (
    <div style={{
      overflow: "hidden",
      height: 72,
      background: "#FFFFFF",
      position: "relative",
    }}>
      <img
        src="/letterhead.png"
        alt="Papel timbrado Leonardo Collares Advocacia"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          objectFit: "cover",
          objectPosition: "top",
        }}
      />
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
