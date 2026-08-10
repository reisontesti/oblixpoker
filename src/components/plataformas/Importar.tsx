"use client";

import { useRef, useState } from "react";
import { anunciar } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { Folha } from "@/components/ui/Folha";
import { digitaisImportadas, importar } from "@/lib/data/repositorio";
import { planejar, type Plano } from "@/lib/integracoes/importar";
import { lerArquivo } from "@/lib/integracoes/registro";
import { moeda, ordinal } from "@/lib/format";

/**
 * O fluxo de importação, do arquivo ao painel.
 *
 * O ARQUIVO NÃO SAI DO APARELHO. A leitura acontece no navegador, com
 * `FileReader`; o que sobe para a conta são o torneio e os contadores. O texto
 * com as cartas de todo mundo na mesa nunca chega a servidor nenhum — e isso é
 * dito na tela, porque é a primeira dúvida de quem vai arrastar um histórico
 * de poker para um site.
 *
 * Nada é gravado antes da confirmação. O plano mostra o que entrou, o que já
 * existe e o que ficou faltando; só então o jogador escolhe. Uma importação
 * que grava enquanto explica não tem como ser cancelada no meio.
 */

type Etapa = "escolher" | "conferir" | "pronto";

export function Importar({ aoFechar }: { aoFechar: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>("escolher");
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [candidatos, setCandidatos] = useState<string[]>([]);
  const [heroi, setHeroi] = useState<string>("");
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{ torneios: number; observacoes: number } | null>(
    null,
  );
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function receber(arquivos: FileList | null) {
    const arquivo = arquivos?.[0];
    if (!arquivo) return;
    setErro(null);
    setLendo(true);

    try {
      const texto = await arquivo.text();
      const { leitura, erro: falha } = lerArquivo(texto, arquivo.name);
      if (falha || !leitura) {
        setErro(falha ?? "Não consegui ler este arquivo.");
        return;
      }

      const nomes = leitura.candidatosAHeroi;
      const escolhido = nomes.length === 1 ? nomes[0] : "";
      setCandidatos(nomes);
      setHeroi(escolhido);

      if (escolhido) {
        const p = planejar(leitura, escolhido, digitaisImportadas());
        setPlano(p);
        setEscolhidos(p.torneios.filter((t) => !t.duplicado).map((t) => t.digital));
        setEtapa("conferir");
      } else if (nomes.length === 0) {
        setErro(
          "Não achei nenhuma mão sua neste arquivo. O histórico do PokerStars marca as suas cartas com “Dealt to”; sem essa linha não dá para saber quem é você.",
        );
      } else {
        // Mais de um nome: perguntar. Escolher errado inverteria todas as
        // estatísticas do jogador com as de um adversário.
        setPlano(null);
        setEtapa("conferir");
        // Guarda a leitura para replanejar quando o nome for escolhido.
        leituraPendente.current = leitura;
      }
    } catch {
      setErro("Não consegui abrir este arquivo. Ele precisa ser um .txt exportado pela sala.");
    } finally {
      setLendo(false);
    }
  }

  const leituraPendente = useRef<Parameters<typeof planejar>[0] | null>(null);

  function confirmarHeroi(nome: string) {
    setHeroi(nome);
    const leitura = leituraPendente.current;
    if (!leitura) return;
    const p = planejar(leitura, nome, digitaisImportadas());
    setPlano(p);
    setEscolhidos(p.torneios.filter((t) => !t.duplicado).map((t) => t.digital));
  }

  function gravar() {
    if (!plano) return;
    const r = importar(plano, escolhidos);
    setResultado(r);
    setEtapa("pronto");
    anunciar(
      `${r.torneios} ${r.torneios === 1 ? "torneio importado" : "torneios importados"}.`,
    );
  }

  return (
    <Folha
      titulo="Importar do PokerStars"
      descricao={
        etapa === "escolher"
          ? "O arquivo é lido aqui no seu navegador. O texto das mãos não sai do aparelho — o que fica guardado são o torneio e as estatísticas."
          : undefined
      }
      largura="larga"
      aoFechar={aoFechar}
      rodape={
        etapa === "conferir" && plano ? (
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Botao tom="discreto" aoClicar={aoFechar}>
              Cancelar
            </Botao>
            <Botao tom="primario" desabilitado={escolhidos.length === 0} aoClicar={gravar}>
              {escolhidos.length === 1
                ? "Importar 1 torneio"
                : `Importar ${escolhidos.length} torneios`}
            </Botao>
          </div>
        ) : etapa === "pronto" ? (
          <Botao tom="primario" largo href="/painel">
            Ver no painel
          </Botao>
        ) : undefined
      }
    >
      {etapa === "escolher" && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              void receber(e.dataTransfer.files);
            }}
            className={`grid min-h-[11rem] place-items-center rounded-2xl border border-dashed px-5 py-8 text-center transition-colors duration-200 ${
              arrastando ? "border-[var(--color-positivo)] bg-realce" : "border-hairline-strong"
            }`}
          >
            <div>
              <p className="text-[15px] font-medium text-ink">
                {lendo ? "Lendo o arquivo…" : "Arraste o arquivo aqui"}
              </p>
              <p className="mt-1.5 text-[12.5px] text-ink-muted">
                Histórico de mãos ou resumo de torneio, em .txt
              </p>
              <Botao className="mt-4" aoClicar={() => entrada.current?.click()}>
                Selecionar arquivo
              </Botao>
            </div>
          </div>

          <input
            ref={entrada}
            type="file"
            accept=".txt,text/plain"
            className="sr-only"
            aria-label="Escolher arquivo de histórico"
            onChange={(e) => {
              void receber(e.target.files);
              e.target.value = "";
            }}
          />

          {erro && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-hairline bg-sunken px-4 py-3 text-[13px] leading-relaxed"
              style={{ color: "var(--color-negativo)" }}
            >
              {erro}
            </p>
          )}

          <div className="mt-5 rounded-xl border border-hairline bg-sunken p-4">
            <p className="rotulo">Onde achar o arquivo</p>
            <ol className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-ink-secondary">
              <li>
                1. No cliente do PokerStars, abra <strong className="text-ink">Configurações ›
                Histórico de mãos</strong> e marque para salvar.
              </li>
              <li>
                2. Os arquivos ficam na pasta <strong className="text-ink">HandHistory</strong>,
                separados por conta e por dia.
              </li>
              <li>
                3. Para um torneio específico, use{" "}
                <strong className="text-ink">Requisitar histórico de torneio</strong> — a sala
                manda por e-mail.
              </li>
            </ol>
          </div>
        </>
      )}

      {etapa === "conferir" && !plano && candidatos.length > 1 && (
        <>
          <p className="text-[15px] leading-relaxed text-ink">
            Encontrei mais de um jogador possível neste arquivo. Qual é você?
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            Escolher errado inverteria as suas estatísticas com as de um adversário, então o
            Oblix prefere perguntar.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {candidatos.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => confirmarHeroi(nome)}
                className="min-h-[var(--toque)] cursor-pointer rounded-xl border border-hairline bg-sunken px-4 text-left text-[14px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong"
              >
                {nome}
              </button>
            ))}
          </div>
        </>
      )}

      {etapa === "conferir" && plano && (
        <>
          <div className="rounded-xl border border-hairline bg-sunken px-4 py-3">
            <p className="text-[13.5px] text-ink">
              Você é <strong className="font-semibold">{heroi}</strong> ·{" "}
              {plano.torneios.length}{" "}
              {plano.torneios.length === 1 ? "torneio encontrado" : "torneios encontrados"} ·{" "}
              {plano.torneios.reduce((a, t) => a + t.maos, 0)} mãos lidas
            </p>
          </div>

          {plano.avisos.length > 0 && (
            <ul className="mt-3 space-y-2">
              {plano.avisos.map((a) => (
                <li
                  key={a}
                  className="rounded-xl border border-hairline px-4 py-3 text-[12.5px] leading-relaxed text-ink-secondary"
                  style={{ borderColor: "color-mix(in oklab, var(--color-atencao) 35%, transparent)" }}
                >
                  {a}
                </li>
              ))}
            </ul>
          )}

          <ul className="mt-4 divide-y divide-hairline">
            {plano.torneios.map((t) => {
              const marcado = escolhidos.includes(t.digital);
              return (
                <li key={t.digital} className="py-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() =>
                        setEscolhidos((atual) =>
                          marcado
                            ? atual.filter((d) => d !== t.digital)
                            : [...atual, t.digital],
                        )
                      }
                      className="mt-1 size-4 shrink-0 accent-[var(--color-positivo)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">
                        {t.torneio.nome}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-ink-muted">
                        {t.maos} mãos · {t.adversarios.length} adversários
                        {t.torneio.colocacao !== null && ` · ${ordinal(t.torneio.colocacao)}`}
                        {t.torneio.premiacao > 0 && ` · ${moeda(t.torneio.premiacao)}`}
                      </span>
                      {t.duplicado && (
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-medium"
                          style={{
                            color: "var(--color-atencao)",
                            background: "color-mix(in oklab, var(--color-atencao) 14%, transparent)",
                          }}
                        >
                          Este torneio já está no Oblix
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {etapa === "pronto" && resultado && (
        <>
          <p className="text-[17px] leading-snug font-medium text-ink">
            Seu jogo foi adicionado ao Oblix.
          </p>
          <ul className="mt-4 space-y-2 text-[13.5px] text-ink-secondary">
            <li>
              ✓ {resultado.torneios}{" "}
              {resultado.torneios === 1 ? "torneio entrou" : "torneios entraram"} no histórico
            </li>
            <li>✓ Banca, ROI e ITM recalculados</li>
            <li>✓ {resultado.observacoes - resultado.torneios} adversários atualizados no banco</li>
          </ul>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
            Os adversários entraram com os números medidos e SEM perfil atribuído: sólido,
            maníaco e pão-duro são leitura sua, não conclusão de estatística. O Oblix mostra o
            que mediu e deixa a classificação com você.
          </p>
        </>
      )}
    </Folha>
  );
}
