"use client";

import Link from "next/link";
import { Botao } from "@/components/ui/Botao";
import { ehMesaFinal, ehTitulo, investimento, type IndiceSatelites } from "@/lib/calc/metricas";
import { ehRegistroProprio } from "@/lib/data/repositorio";
import { dataMedia, duracao, moeda, moedaComSinal, ordinal } from "@/lib/format";
import type { Satelite, Torneio, ViaEntrada } from "@/lib/types";

/**
 * O histórico de torneios em dois formatos, a partir de um único componente.
 *
 * Tabela é o formato certo para comparar linhas, e no desktop ela fica. No
 * celular ela era um defeito com três sintomas ao mesmo tempo: 768px de
 * largura mínima empurrando a página inteira para o lado, cabeçalhos a 10px, e
 * as ações de editar e apagar escondidas atrás de `hover` — que em tela de
 * toque não existe.
 *
 * Abaixo de `lg` a mesma informação vira cartão. Nada foi cortado: o que a
 * coluna dizia com posição, o cartão diz com rótulo.
 *
 * Os dois formatos vivem no mesmo arquivo de propósito. Foi assim que a versão
 * anterior divergiu — o histórico e "últimos torneios" desenhavam a mesma
 * linha com dois códigos diferentes, e um deles ficou sem o selo de "seu".
 */

export function SeloVia({ via }: { via: ViaEntrada }) {
  return (
    <span
      className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{
        color: via === "satelite" ? "var(--color-satelite)" : "var(--color-direto)",
        background: "color-mix(in oklab, currentColor 12%, transparent)",
      }}
    >
      {via === "satelite" ? "Satélite" : "Direto"}
    </span>
  );
}

/** Conquista não ganha matiz própria — ganha peso e um rótulo que se lê. */
export function Colocacao({ torneio: t }: { torneio: Torneio }) {
  const titulo = ehTitulo(t);
  const mesaFinal = ehMesaFinal(t);
  return (
    <>
      <span className={titulo || mesaFinal ? "font-semibold text-ink" : "text-ink-secondary"}>
        {t.colocacao !== null ? ordinal(t.colocacao) : "—"}
      </span>
      {titulo && (
        <span
          className="ml-1.5 text-[11px] font-semibold tracking-wide"
          style={{ color: "var(--color-atencao)" }}
        >
          TÍTULO
        </span>
      )}
      {!titulo && mesaFinal && <span className="ml-1.5 text-[12px] text-ink-secondary">MF</span>}
    </>
  );
}

interface Props {
  torneios: Torneio[];
  idx: IndiceSatelites;
  /** Sem callback, os cartões saem em modo leitura — é o caso do painel. */
  aoApagar?: (t: Torneio) => void;
  /** Mostra a coluna "investido" na tabela. O painel não precisa dela. */
  comInvestimento?: boolean;
}

export function ListaTorneios({ torneios, idx, aoApagar, comInvestimento = false }: Props) {
  const sateliteDe = (t: Torneio): Satelite | null =>
    t.sateliteId ? (idx.get(t.sateliteId) ?? null) : null;

  return (
    <>
      <ul className="lg:hidden">
        {torneios.map((t) => (
          <Cartao
            key={t.id}
            torneio={t}
            satelite={sateliteDe(t)}
            aoApagar={aoApagar ? () => aoApagar(t) : undefined}
          />
        ))}
      </ul>

      {/* A tabela rola por DENTRO de si mesma. Sem isto, a 1024px — laptop
          pequeno, tablet deitado — as sete colunas mais os 248px da lateral
          passavam da tela e empurravam a página inteira para o lado. */}
      {/* `relative` não é decoração: `sr-only` posiciona em `absolute`, e um
          absoluto só é recortado por ancestral POSICIONADO. Sem isto, a
          legenda invisível da tabela escapava do rolador, ia parar a 1072px e
          esticava o documento inteiro — 48px de rolagem horizontal cuja causa
          não aparecia em tela nenhuma. */}
      <div className="relative hidden overflow-x-auto px-4 pb-5 lg:block">
        <table className="w-full min-w-[46rem] border-collapse text-[13px]">
          <caption className="sr-only">
            Torneios registrados, com via de entrada, colocação e resultado
          </caption>
          <thead>
            <tr className="text-[11px] tracking-[0.12em] text-ink-muted uppercase">
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Data
              </th>
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Torneio
              </th>
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Entrada
              </th>
              {comInvestimento && (
                <th scope="col" className="px-3 pb-2 text-right font-semibold">
                  Investido
                </th>
              )}
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Posição
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Duração
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Resultado
              </th>
              {aoApagar && (
                <th scope="col" className="px-3 pb-2 text-right font-semibold">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {torneios.map((t) => {
              const sat = sateliteDe(t);
              const investido = investimento(t, sat);
              const saldo = t.premiacao - investido;
              const proprio = ehRegistroProprio(t.id);

              return (
                <tr
                  key={t.id}
                  className="group border-t border-hairline transition-colors duration-200 hover:bg-realce-tenue"
                >
                  <td className="numeros-tabulares px-3 py-2.5 whitespace-nowrap text-ink-muted">
                    {dataMedia(t.data)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="max-w-[16rem] truncate text-ink">{t.nome}</span>
                      {proprio && aoApagar && (
                        <span className="shrink-0 rounded-full border border-hairline px-1.5 py-px text-[11px] tracking-wide text-ink-muted">
                          seu
                        </span>
                      )}
                    </span>
                    <span className="block max-w-[16rem] truncate text-[12px] text-ink-muted">
                      {t.clube} · {t.jogadores} jogadores
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <SeloVia via={t.via} />
                  </td>
                  {comInvestimento && (
                    <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-secondary">
                      {moeda(investido)}
                    </td>
                  )}
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap">
                    <Colocacao torneio={t} />
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-muted">
                    {duracao(t.duracaoMin)}
                  </td>
                  <td
                    className="numeros-tabulares px-3 py-2.5 text-right font-medium whitespace-nowrap"
                    style={{ color: saldo >= 0 ? "var(--color-positivo)" : "var(--color-negativo)" }}
                  >
                    {moedaComSinal(saldo)}
                    {!comInvestimento && (
                      <span className="block text-[12px] font-normal text-ink-muted">
                        {t.premiacao > 0 ? `prêmio ${moeda(t.premiacao)}` : "sem prêmio"}
                      </span>
                    )}
                  </td>
                  {aoApagar && (
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {/* Só o que o jogador registrou pode ser editado ou
                          apagado — a base de demonstração é leitura. */}
                      {proprio && (
                        <span className="flex justify-end gap-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                          <Link
                            href={`/torneios/${t.id}/editar`}
                            className="text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => aoApagar(t)}
                            className="cursor-pointer text-[12px] text-ink-faint transition-colors duration-200 hover:text-[var(--color-negativo)]"
                          >
                            Apagar
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * A linha do celular.
 *
 * A hierarquia é a da pergunta que se faz olhando o histórico no telefone:
 * quanto deu, primeiro; qual torneio foi, junto; o resto embaixo, menor. As
 * ações ficam VISÍVEIS quando o registro é do jogador — aparecer só no toque
 * confundiria com a navegação para a edição.
 */
function Cartao({
  torneio: t,
  satelite,
  aoApagar,
}: {
  torneio: Torneio;
  satelite: Satelite | null;
  aoApagar?: () => void;
}) {
  const investido = investimento(t, satelite);
  const saldo = t.premiacao - investido;
  const proprio = ehRegistroProprio(t.id);

  return (
    <li className="border-t border-hairline px-5 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-snug font-medium text-ink">{t.nome}</p>
          <p className="numeros-tabulares mt-1 truncate text-[12.5px] text-ink-muted">
            {dataMedia(t.data)} · {t.clube}
          </p>
        </div>
        <p
          className="numeros-tabulares shrink-0 text-[16px] font-semibold whitespace-nowrap"
          style={{ color: saldo >= 0 ? "var(--color-positivo)" : "var(--color-negativo)" }}
        >
          {moedaComSinal(saldo)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-secondary">
        <SeloVia via={t.via} />
        <span className="numeros-tabulares">
          <Colocacao torneio={t} />
          <span className="text-ink-muted"> de {t.jogadores}</span>
        </span>
        <span className="numeros-tabulares text-ink-muted">{duracao(t.duracaoMin)}</span>
        <span className="numeros-tabulares text-ink-muted">{moeda(investido)} investidos</span>
      </div>

      {aoApagar && proprio && (
        <div className="mt-2.5 flex items-center gap-1">
          <Botao href={`/torneios/${t.id}/editar`} tom="discreto">
            Editar
          </Botao>
          <Botao tom="discreto" aoClicar={aoApagar}>
            Apagar
          </Botao>
        </div>
      )}
    </li>
  );
}
