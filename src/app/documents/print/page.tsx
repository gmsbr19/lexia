"use client";

import { useEffect, useState } from "react";
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios";
import { newContratoData } from "@/lib/types/contrato-honorarios";
import { buildContratoHonorarios } from "@/lib/documents/generators/contrato-honorarios/content";
import type { ContentBlock } from "@/lib/documents/types";

// ── print-only document renderer ──────────────────────────────────────────────
// This page reads document data from sessionStorage and renders a clean HTML
// document suitable for Ctrl+P / "Save as PDF". No app chrome, no Paginator.

const STORAGE_KEY = "lexia_print_data";

function renderChunks(chunks: { text: string; bold?: boolean }[]) {
  return chunks.map((c, i) =>
    c.bold ? <strong key={i}>{c.text}</strong> : <span key={i}>{c.text}</span>
  );
}

function PrintDocument({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="doc">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p
              key={i}
              className={[
                "para",
                block.indent ? "indent" : "",
                block.align === "center" ? "center" : "",
                block.align === "right" ? "right" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {renderChunks(block.chunks)}
            </p>
          );
        }

        if (block.type === "heading") {
          return (
            <div
              key={i}
              className={block.level === "chapter" ? "chapter-title" : "clause-title"}
            >
              {block.text.toUpperCase()}
            </div>
          );
        }

        if (block.type === "signatures") {
          const pairs: (typeof block.rows)[] = [];
          for (let j = 0; j < block.rows.length; j += 2) {
            pairs.push(block.rows.slice(j, j + 2));
          }
          return (
            <div key={i} className="sig-section">
              <p className="sig-date">{block.dateCity}</p>
              {pairs.map((pair, pi) => (
                <div key={pi} className="sig-row">
                  {pair.map((signer, si) => (
                    <div key={si} className="sig-cell">
                      <div className="sig-line">
                        {signer.name ? <strong>{signer.name}</strong> : " "}
                      </div>
                      <div className="sig-label">{signer.label}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function PrintPage() {
  const [blocks, setBlocks] = useState<ContentBlock[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) { setError(true); return; }
      const data: ContratoHonorariosData = JSON.parse(raw);
      setBlocks(buildContratoHonorarios(data));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (blocks) {
      // Give the browser time to finish rendering before opening the print dialog
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [blocks]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial", color: "#555" }}>
        Nenhum documento encontrado. Volte ao formulário e clique em &ldquo;Download PDF&rdquo; novamente.
      </div>
    );
  }

  if (!blocks) {
    return <div style={{ padding: 40, fontFamily: "Arial", color: "#888" }}>Carregando…</div>;
  }

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 3cm 2.5cm 3cm 2.5cm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #020D25;
          background: #fff;
        }
        .doc { }
        .para {
          text-align: justify;
          margin-bottom: 10pt;
        }
        .para.indent { text-indent: 1.25cm; }
        .para.center { text-align: center; }
        .para.right  { text-align: right; }
        .chapter-title {
          text-align: center;
          font-weight: 700;
          font-size: 12pt;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          margin: 16pt 0 10pt;
        }
        .clause-title {
          font-weight: 700;
          font-size: 12pt;
          text-transform: uppercase;
          margin: 14pt 0 8pt;
        }
        .sig-section { margin-top: 16pt; }
        .sig-date { text-align: right; margin-bottom: 12pt; }
        .sig-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24pt;
          margin-bottom: 8pt;
          break-inside: avoid;
        }
        .sig-cell { text-align: center; padding-top: 28pt; }
        .sig-line {
          border-top: 1px solid #020D25;
          padding-top: 6pt;
          font-size: 12pt;
          min-height: 22pt;
        }
        .sig-label {
          font-size: 10pt;
          color: rgba(2,13,37,0.5);
          margin-top: 4pt;
        }
        @media screen {
          body { background: #f0f0f0; }
          .doc {
            background: #fff;
            max-width: 210mm;
            margin: 20px auto;
            padding: 3cm 2.5cm;
            box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          }
        }
      `}</style>
      <PrintDocument blocks={blocks} />
    </>
  );
}

// Helper exported so the caller can write to sessionStorage before navigation
export { STORAGE_KEY };
