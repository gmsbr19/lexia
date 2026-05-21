import { Letterhead, ContractParagraph } from "./Letterhead";

interface DraftPreviewProps {
  pulse?: boolean;
  showPlaceholders?: boolean;
}

function Placeholder({ children, filled }: { children: string; filled?: boolean }) {
  return (
    <span style={{
      background: filled ? "transparent" : "rgba(192,161,71,0.18)",
      color: filled ? "#020D25" : "#9a7f2e",
      padding: "0 2px", borderRadius: 2,
      fontWeight: filled ? "inherit" : 500,
    }}>{children}</span>
  );
}

export function DraftPreview({ pulse, showPlaceholders }: DraftPreviewProps) {
  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 6,
      boxShadow: "0 1px 3px rgba(2, 13, 37, 0.06), 0 12px 36px rgba(2, 13, 37, 0.08)",
      width: "100%",
      aspectRatio: "210/297",
      overflow: "hidden",
      color: "#020D25",
      position: "relative",
    }}>
      <Letterhead />
      <div style={{ padding: "24px 36px" }}>
        <div style={{
          textAlign: "center", fontFamily: "Georgia, serif", fontWeight: 700,
          fontSize: 12, letterSpacing: "0.08em", marginBottom: 18, color: "#020D25",
        }}>
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS
        </div>

        <ContractParagraph indent>
          Pelo presente instrumento particular, de um lado{" "}
          {showPlaceholders
            ? <><Placeholder filled><strong>HELENA MARIA VARGAS</strong></Placeholder>, brasileira, empresária, portadora do RG <Placeholder filled>28.451.227-8 SSP/SP</Placeholder> e CPF <Placeholder filled>312.984.760-15</Placeholder>, residente e domiciliada na <Placeholder>{"{{ENDERECO_CONTRATANTE}}"}</Placeholder></>
            : <><strong>HELENA MARIA VARGAS</strong>, brasileira, empresária, portadora do RG 28.451.227-8 SSP/SP e CPF 312.984.760-15, residente e domiciliada na Rua Oscar Freire, 1.205, ap. 92, São Paulo/SP</>
          }, doravante denominada simplesmente <strong>CONTRATANTE</strong>;
        </ContractParagraph>

        <ContractParagraph indent>
          E, de outro lado, <strong>MORAES &amp; ASSOCIADOS SOCIEDADE DE ADVOGADOS</strong>, inscrita na OAB/SP sob o nº 12.348, com sede na Av. Paulista, 1.842, 14º andar, São Paulo/SP, neste ato representada por seu sócio Rafael Moraes, doravante denominada <strong>CONTRATADA</strong>;
        </ContractParagraph>

        <ContractParagraph indent>
          Resolvem celebrar o presente <em>Contrato de Prestação de Serviços Advocatícios</em>, que se regerá pelas cláusulas e condições seguintes.
        </ContractParagraph>

        <div style={{ height: 6 }} />

        <div style={{ fontWeight: 700, fontSize: "9.5px", marginBottom: 6, letterSpacing: "0.02em" }}>
          CLÁUSULA PRIMEIRA — DO OBJETO
        </div>
        <ContractParagraph indent>
          A CONTRATADA prestará à CONTRATANTE serviços de{" "}
          {showPlaceholders
            ? <Placeholder>{"{{OBJETO_SERVICOS}}"}</Placeholder>
            : "consultoria e assessoria jurídica nas áreas cível, contratual e empresarial"
          }, incluindo a elaboração de pareceres, contratos e demais documentos necessários.
        </ContractParagraph>

        <div style={{ fontWeight: 700, fontSize: "9.5px", marginBottom: 6, letterSpacing: "0.02em" }}>
          CLÁUSULA SEGUNDA — DOS HONORÁRIOS
        </div>
        <ContractParagraph indent>
          Pela prestação dos serviços, a CONTRATANTE pagará à CONTRATADA o valor mensal de{" "}
          <span style={{
            background: pulse ? "rgba(192,161,71,0.25)" : "transparent",
            padding: "0 2px", borderRadius: 2,
            transition: "background 0.3s",
          }}>
            {showPlaceholders
              ? <Placeholder filled>R$ 8.500,00 (oito mil e quinhentos reais)</Placeholder>
              : "R$ 8.500,00 (oito mil e quinhentos reais)"
            }
          </span>, vencível todo dia{" "}
          {showPlaceholders ? <Placeholder>{"{{DIA_PAGAMENTO}}"}</Placeholder> : "10"}
          {" "}de cada mês...
        </ContractParagraph>

        {pulse && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "7.5px", color: "#9a7f2e", marginTop: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#C0A147", display: "inline-block" }} />
            IA escrevendo cláusula 3...
          </div>
        )}
      </div>
    </div>
  );
}

export function FullDocumentPreview() {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 6,
      boxShadow: "0 1px 3px rgba(2, 13, 37, 0.06), 0 18px 50px rgba(2, 13, 37, 0.12)",
      width: "100%", aspectRatio: "210/297", overflow: "hidden", color: "#020D25", position: "relative",
    }}>
      <Letterhead />
      <div style={{ padding: "32px 56px 32px" }}>
        <div style={{
          textAlign: "center", fontFamily: "Georgia, serif", fontWeight: 700,
          fontSize: 14, letterSpacing: "0.08em", marginBottom: 24,
        }}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</div>

        <ContractParagraph indent>
          Pelo presente instrumento particular, de um lado <strong>HELENA MARIA VARGAS</strong>, brasileira, empresária, portadora do RG 28.451.227-8 SSP/SP e CPF 312.984.760-15, residente e domiciliada na Rua Oscar Freire, 1.205, ap. 92, São Paulo/SP, doravante denominada simplesmente <strong>CONTRATANTE</strong>;
        </ContractParagraph>
        <ContractParagraph indent>
          E, de outro lado, <strong>MORAES &amp; ASSOCIADOS SOCIEDADE DE ADVOGADOS</strong>, inscrita na OAB/SP sob o nº 12.348, com sede na Av. Paulista, 1.842, 14º andar, São Paulo/SP, neste ato representada por seu sócio Rafael Moraes, doravante denominada <strong>CONTRATADA</strong>;
        </ContractParagraph>
        <ContractParagraph indent>
          Resolvem celebrar o presente <em>Contrato de Prestação de Serviços Advocatícios</em>, que se regerá pelas cláusulas e condições seguintes.
        </ContractParagraph>
        <div style={{ height: 8 }} />
        {[
          ["CLÁUSULA PRIMEIRA — DO OBJETO", "A CONTRATADA prestará à CONTRATANTE serviços de consultoria e assessoria jurídica nas áreas cível, contratual e empresarial, incluindo a elaboração de pareceres, contratos e demais documentos necessários ao bom andamento da atuação descrita no presente instrumento."],
          ["CLÁUSULA SEGUNDA — DOS HONORÁRIOS", "Pela prestação dos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor mensal de R$ 8.500,00 (oito mil e quinhentos reais), vencível todo dia 10 de cada mês, mediante depósito bancário ou PIX em conta de titularidade da CONTRATADA."],
          ["CLÁUSULA TERCEIRA — DA VIGÊNCIA", "O presente contrato vigerá pelo prazo de 12 (doze) meses, a contar de 1º de abril de 2026, sendo renovado automaticamente por iguais períodos, salvo manifestação em contrário de qualquer das partes mediante aviso prévio de 30 (trinta) dias."],
          ["CLÁUSULA QUARTA — DO REAJUSTE", "O valor dos honorários será reajustado anualmente, no mês de aniversário do contrato, pela variação positiva do IPCA acumulado nos últimos doze meses, ou outro índice oficial que vier a substituí-lo."],
        ].map(([title, body]) => (
          <div key={title}>
            <div style={{ fontWeight: 700, fontSize: "10.5px", marginBottom: 6, letterSpacing: "0.02em" }}>{title}</div>
            <ContractParagraph indent>{body}</ContractParagraph>
          </div>
        ))}
      </div>
    </div>
  );
}
