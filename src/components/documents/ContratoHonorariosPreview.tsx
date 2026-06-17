"use client";

import React from "react";
import type {
  ContratoHonorariosData,
  Contratante,
  ContratantePF,
  ContratantePJ,
  SocioPJ,
  Honorarios,
  Genero,
  Parcela,
} from "@/lib/types/contrato-honorarios";
import { DocumentPaginator } from "./Paginator";
import {
  CLAUSULAS_GERAIS,
  CLAUSULAS_COMPROMISSO,
  resolveClausula,
} from "@/lib/documents/generators/contrato-honorarios/clausulas";

// ── change highlight ─────────────────────────────────────────────────────────

/**
 * Does any recently-changed key target this block? A block declares the field
 * paths it renders (e.g. ["honorarios"]); a flashed key matches if it equals the
 * path or is nested under it (objeto, honorarios.valorTotal, clausula.quinta…).
 */
function isFlashing(keys: string[], flash: Set<string>): boolean {
  if (flash.size === 0) return false;
  for (const f of flash) {
    for (const k of keys) {
      if (f === k || f.startsWith(`${k}.`) || k.startsWith(`${f}.`)) return true;
    }
  }
  return false;
}

/**
 * Wraps a document block so it briefly highlights (soft gold fill + left bar)
 * when the AI / form just changed one of its `keys`. Uses background + inset
 * box-shadow only, so toggling it never reflows the page (pagination is stable).
 */
function Hl({
  keys,
  flash,
  children,
}: {
  keys: string[];
  flash: Set<string>;
  children: React.ReactNode;
}) {
  const on = isFlashing(keys, flash);
  return (
    <div
      style={{
        background: on ? "rgba(192,161,71,0.18)" : "transparent",
        boxShadow: on ? "inset 3px 0 0 #C0A147" : "inset 0 0 0 transparent",
        borderRadius: 3,
        transition: "background 500ms ease-out, box-shadow 500ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fl(genero: Genero, m: string, f: string) {
  return genero === "masculino" ? m : f;
}

function Field({ value, label, bold }: { value: string; label: string; bold?: boolean }) {
  if (!value) {
    return (
      <span
        style={{
          background: "rgba(192,161,71,0.18)",
          color: "#9a7f2e",
          padding: "0 3px",
          borderRadius: 2,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    );
  }
  return bold ? <strong>{value}</strong> : <>{value}</>;
}

// ── qualificação ─────────────────────────────────────────────────────────────

function qualSocio(s: SocioPJ, idx: number) {
  const portador = fl(s.genero, "portador", "portadora");
  const inscrito  = fl(s.genero, "inscrito",  "inscrita");
  return (
    <span key={idx}>
      <Field value={s.nome} label="nome do sócio" bold />,{" "}
      <Field value={s.nacionalidade} label="nacionalidade" />,{" "}
      <Field value={s.estadoCivil}   label="estado civil"  />,{" "}
      <Field value={s.profissao}     label="profissão"     />, {portador} do RG nº{" "}
      <Field value={s.rg}  label="RG"  /> e {inscrito} no CPF sob nº{" "}
      <Field value={s.cpf} label="CPF" />
    </span>
  );
}

function QualPF({ c }: { c: ContratantePF }) {
  const portador   = fl(c.genero, "portador",  "portadora");
  const inscrito   = fl(c.genero, "inscrito",  "inscrita");
  const residente  = fl(c.genero, "residente e domiciliado", "residente e domiciliada");
  return (
    <>
      <Field value={c.nome}         label="nome do contratante" bold />,{" "}
      <Field value={c.nacionalidade} label="nacionalidade" />,{" "}
      <Field value={c.estadoCivil}   label="estado civil"  />,{" "}
      <Field value={c.profissao}     label="profissão"     />, {portador} do RG nº{" "}
      <Field value={c.rg}  label="RG"  /> e {inscrito} no CPF sob nº{" "}
      <Field value={c.cpf} label="CPF" />, {residente} a{" "}
      <Field value={c.endereco} label="endereço" />, e-mail:{" "}
      <Field value={c.email}    label="e-mail"   />
    </>
  );
}

function QualPJ({ c }: { c: ContratantePJ }) {
  const representada =
    c.socios.length > 1
      ? "representada neste ato pelos sócios"
      : "representada neste ato por seu sócio";
  return (
    <>
      <Field value={c.razaoSocial} label="razão social" bold />, pessoa jurídica de
      direito privado, inscrita no CNPJ sob nº{" "}
      <Field value={c.cnpj}     label="CNPJ"     />, com sede na{" "}
      <Field value={c.endereco} label="endereço"  />, e-mail:{" "}
      <Field value={c.email}    label="e-mail"    />, {representada}{" "}
      {c.socios.map((s, i) => (
        <span key={i}>
          {i > 0 && ", e "}
          {qualSocio(s, i)}
        </span>
      ))}
    </>
  );
}

function Qual({ c }: { c: Contratante }) {
  return c.tipo === "pf" ? <QualPF c={c} /> : <QualPJ c={c} />;
}

function denominado(c: Contratante, plural: boolean) {
  if (plural)       return "doravante conjuntamente denominados CONTRATANTES";
  if (c.tipo === "pj") return "denominada CONTRATANTE";
  return fl(c.genero, "denominado CONTRATANTE", "denominada CONTRATANTE");
}

// ── layout primitives ─────────────────────────────────────────────────────────

function P({ children, indent }: { children: React.ReactNode; indent?: boolean }) {
  return (
    <p
      style={{
        margin: "0 0 10pt",
        fontSize: "12pt",
        lineHeight: 1.5,
        color: "#020D25",
        textAlign: "justify",
        textIndent: indent ? "1.25cm" : 0,
        letterSpacing: 0,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        hyphens: "auto",
      }}
    >
      {children}
    </p>
  );
}

function ClauseTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: "12pt",
        marginBottom: "8pt",
        marginTop: "14pt",
        letterSpacing: "0.01em",
        color: "#020D25",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function ChapterTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: "center",
        fontWeight: 700,
        fontSize: "12pt",
        letterSpacing: "0.03em",
        color: "#020D25",
        margin: "16pt 0 10pt",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

// ── honorários clause ─────────────────────────────────────────────────────────

function ParagrafoExito({ percentual, base }: { percentual: string; base: string }) {
  return (
    <P indent>
      <strong>Parágrafo Único</strong> – Além dos honorários fixos acima avençados, o
      CONTRATADO fará jus a honorários de êxito correspondentes a{" "}
      <Field value={percentual} label="% de êxito" />% sobre{" "}
      <Field value={base} label="base de cálculo" />, a serem pagos no momento do
      levantamento ou recebimento dos valores pela parte CONTRATANTE.
    </P>
  );
}

function ClausulaHonorarios({ h }: { h: Honorarios }) {
  const bankInfo =
    "depositados no banco Itaú, agência nº 4088 e conta nº 15.991-0 ou no pix (11) 91014-4241";

  const fixedP1 =
    "Quaisquer outras medidas judiciais necessárias, incidentais ou não, diretas ou indiretas, decorrentes do objeto do contrato, deverão ter novos honorários estimados entre as partes.";
  const fixedP2 =
    "Os honorários de condenação (sucumbência), se houver, pertencerão ao Advogado, sem exclusão dos que ora são contratados, de conformidade com os artigos 23 da Lei nº 8.906/94 e 35, parágrafo 1º, do Código de Ética e Disciplina da Ordem dos Advogados do Brasil.";

  if (h.tipo === "avista") {
    return (
      <>
        <P indent>
          O CONTRATADO receberá a título de honorários contratados, o valor de R${" "}
          <Field value={h.valorTotal} label="valor total" />, a serem {bankInfo}, em
          parcela única, com vencimento em{" "}
          <Field value={h.dataPagamento} label="data de pagamento" />.
        </P>
        <P indent><strong>Parágrafo Primeiro</strong> – {fixedP1}</P>
        <P indent><strong>Parágrafo Segundo</strong> – {fixedP2}</P>
      </>
    );
  }

  if (h.tipo === "parcelado") {
    return (
      <>
        <P indent>
          O CONTRATADO receberá a título de honorários contratados, o valor pró-labore de
          R$ <Field value={h.valorTotal} label="valor total" />, a serem {bankInfo}, em{" "}
          <Field value={h.qtParcelas} label="nº de parcelas" /> parcelas fixas e
          sucessivas, cada uma no valor de R${" "}
          <Field value={h.valorParcelas} label="valor por parcela" />, a primeira em{" "}
          <Field value={h.dataPrimeiraParcela} label="data da 1ª parcela" />.
        </P>
        <P indent><strong>Parágrafo Primeiro</strong> – {fixedP1}</P>
        <P indent><strong>Parágrafo Segundo</strong> – {fixedP2}</P>
      </>
    );
  }

  if (h.tipo === "parcelas_diferentes") {
    return (
      <>
        <P indent>
          O CONTRATADO receberá a título de honorários contratados as seguintes parcelas,
          a serem {bankInfo}:
        </P>
        <div style={{ margin: "4px 0 8px 18px" }}>
          {h.parcelas.map((p: Parcela, i: number) => (
            <P key={i}>
              {String(i + 1).padStart(2, "0")}. R${" "}
              <Field value={p.valor} label="valor" /> – vencimento em{" "}
              <Field value={p.vencimento} label="data" />
            </P>
          ))}
        </div>
        <P indent><strong>Parágrafo Único</strong> – {fixedP1}</P>
      </>
    );
  }

  if (h.tipo === "exito") {
    return (
      <>
        <P indent>
          O CONTRATADO receberá a título de honorários de êxito, o percentual de{" "}
          <Field value={h.percentual} label="%" />% sobre{" "}
          <Field value={h.baseCalculo} label="base de cálculo" />, a serem pagos no
          momento do levantamento ou recebimento dos valores pela parte CONTRATANTE.
        </P>
        <P indent><strong>Parágrafo Único</strong> – {fixedP2}</P>
      </>
    );
  }

  if (h.tipo === "avista_exito") {
    return (
      <>
        <P indent>
          O CONTRATADO receberá a título de honorários contratados, o valor de R${" "}
          <Field value={h.valorTotal} label="valor total" />, a serem {bankInfo}, em
          parcela única, com vencimento em{" "}
          <Field value={h.dataPagamento} label="data de pagamento" />.
        </P>
        <ParagrafoExito percentual={h.percentualExito} base={h.baseCalculoExito} />
        <P indent><strong>Parágrafo Segundo</strong> – {fixedP2}</P>
      </>
    );
  }

  // parcelado_exito
  return (
    <>
      <P indent>
        O CONTRATADO receberá a título de honorários contratados, o valor pró-labore de
        R$ <Field value={h.valorTotal} label="valor total" />, a serem {bankInfo}, em{" "}
        <Field value={h.qtParcelas} label="nº de parcelas" /> parcelas fixas e
        sucessivas, cada uma no valor de R${" "}
        <Field value={h.valorParcelas} label="valor por parcela" />, a primeira em{" "}
        <Field value={h.dataPrimeiraParcela} label="data da 1ª parcela" />.
      </P>
      <ParagrafoExito percentual={h.percentualExito} base={h.baseCalculoExito} />
      <P indent><strong>Parágrafo Segundo</strong> – {fixedP2}</P>
    </>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function ContratoHonorariosPreview({
  data,
  zoom = 1,
  flashKeys,
}: {
  data: ContratoHonorariosData;
  zoom?: number;
  /** Field paths / clause ids that just changed — briefly highlighted in the A4. */
  flashKeys?: string[];
}) {
  const plural = data.contratantes.length > 1;
  const flash = React.useMemo(() => new Set(flashKeys ?? []), [flashKeys]);

  return (
    <DocumentPaginator zoom={zoom} letterhead="/letterhead.png">

      {/* ── Título ── */}
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "12pt",
          letterSpacing: "0.03em",
          marginBottom: "16pt",
          textTransform: "uppercase",
        }}
      >
        Contrato de Prestação de Serviços Advocatícios
      </div>

      {/* ── Capítulo I — Das Partes ── */}
      <ChapterTitle>Capítulo I — Das Partes</ChapterTitle>

      <Hl keys={["contratante"]} flash={flash}>
        <P indent>
          Por este instrumento particular de contrato que entre si celebram: de um
          lado,{" "}
          {data.contratantes.map((c, i) => (
            <span key={i}>
              {i > 0 && "; "}
                <Qual c={c} />
              {!plural && `, ${denominado(c, false)}`}
            </span>
          ))}
          {plural && `, ${denominado(data.contratantes[0], true)}`}; e de outro
          lado,{" "}
          <strong>LEONARDO DA COSTA ALMEIDA COLLARES MIGUEL</strong>, brasileiro,
          casado, advogado regularmente inscrito nos quadros da Ordem dos
          Advogados do Brasil – Seccional São Paulo, sob o nº 523.685, com
          escritório profissional situado na Avenida Marquês de São Vicente, 1619,
          Sala 505, Barra Funda, São Paulo – SP, CEP 01139-003, denominado{" "}
          <strong>CONTRATADO</strong>.
        </P>
      </Hl>

      <P indent>
        Que doravante serão referidos no singular apenas como{" "}
        <strong>CONTRATANTE</strong> e <strong>CONTRATADO</strong>; ajustam
        entre si, com fulcro no artigo 22 da Lei nº 8.906/94, mediante as
        seguintes cláusulas e condições:
      </P>

      {/* ── Capítulo II — Do Objeto ── */}
      <ChapterTitle>Capítulo II — Do Objeto</ChapterTitle>
      <ClauseTitle>CLÁUSULA PRIMEIRA</ClauseTitle>
      <Hl keys={["objeto"]} flash={flash}>
        <P indent>
          O CONTRATADO obriga-se, face ao mandato que lhe é outorgado, que faz
          parte integrante deste contrato, a prestar os serviços advocatícios
          concernentes a{" "}
          <Field value={data.objeto} label="objeto dos serviços" />.
        </P>
      </Hl>

      {/* ── Capítulo III — Dos Honorários ── */}
      <ChapterTitle>Capítulo III — Dos Honorários</ChapterTitle>
      <ClauseTitle>CLÁUSULA SEGUNDA</ClauseTitle>
      <Hl keys={["honorarios"]} flash={flash}>
        <ClausulaHonorarios h={data.honorarios} />
      </Hl>

      {/* ── Capítulo IV — Disposições Gerais ── */}
      <ChapterTitle>Capítulo IV — Das Disposições Gerais</ChapterTitle>
      {CLAUSULAS_GERAIS.map((def) => (
        <React.Fragment key={def.id}>
          <ClauseTitle>{def.titulo}</ClauseTitle>
          <Hl keys={[`clausula.${def.id}`]} flash={flash}>
            <P indent>{resolveClausula(data, def)}</P>
          </Hl>
        </React.Fragment>
      ))}

      {/* ── Capítulo V — Compromisso e Despesas ── */}
      <ChapterTitle>Capítulo V — Do Compromisso e Das Despesas</ChapterTitle>
      {CLAUSULAS_COMPROMISSO.map((def) => (
        <React.Fragment key={def.id}>
          <ClauseTitle>{def.titulo}</ClauseTitle>
          <Hl keys={[`clausula.${def.id}`]} flash={flash}>
            <P indent>{resolveClausula(data, def)}</P>
          </Hl>
        </React.Fragment>
      ))}

      {/* ── Capítulo VI — Foro ── */}
      <ChapterTitle>Capítulo VI — Do Foro de Eleição</ChapterTitle>
      <ClauseTitle>CLÁUSULA DÉCIMA SÉTIMA</ClauseTitle>
      <Hl keys={["foro"]} flash={flash}>
        <P indent>
          Fica eleito o foro da Comarca de{" "}
          <Field value={data.foro} label="cidade" /> para dirimir as dúvidas
          oriundas deste contrato, renunciando as partes a qualquer outro por
          mais privilegiado que seja.
        </P>
      </Hl>

      <P indent>
        E, por estarem, assim, justos e contratados, firmam o presente
        instrumento, para um só efeito.
      </P>

      {/* ── Data + Assinaturas + Testemunhas ── */}
      <Hl keys={["foro", "data"]} flash={flash}>
        <div
          style={{
            textAlign: "right",
            fontSize: "12pt",
            margin: "10pt 0 12pt",
          }}
        >
          <Field value={data.foro} label="cidade" />,{" "}
          <Field value={data.data} label="data" />.
        </div>
      </Hl>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          marginTop: 12,
          breakInside: "avoid",
        }}
      >
        {[
          ...data.contratantes.map((c, i) => ({
            nome:        c.tipo === "pf" ? c.nome : c.razaoSocial,
            label:       data.contratantes.length > 1 ? `Contratante ${i + 1}` : "Contratante",
            placeholder: c.tipo === "pf" ? "nome do contratante" : "razão social",
          })),
          { nome: "LEONARDO DA COSTA ALMEIDA COLLARES MIGUEL", label: "Contratado", placeholder: "contratado" },
        ].map(({ nome, label, placeholder }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div
              style={{
                marginTop: 42,
                borderTop: "1px solid #020D25",
                paddingTop: 8,
                fontSize: "12pt",
              }}
            >
              <Field value={nome} label={placeholder} bold />
            </div>
            <div style={{ fontSize: "10pt", color: "rgba(2,13,37,0.5)", marginTop: 4 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          breakInside: "avoid",
        }}
      >
        {["Testemunha 1", "Testemunha 2"].map((t) => (
          <div key={t} style={{ textAlign: "center" }}>
            <div
              style={{
                marginTop: 42,
                borderTop: "1px solid #020D25",
                paddingTop: 8,
                fontSize: "12pt",
              }}
            >
              &nbsp;
            </div>
            <div style={{ fontSize: "10pt", color: "rgba(2,13,37,0.5)", marginTop: 4 }}>
              {t}
            </div>
          </div>
        ))}
      </div>

    </DocumentPaginator>
  );
}
