"use client";

import { useState } from "react";
import { ListaTorneios } from "@/components/torneios/ListaTorneios";
import { anunciar } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmar";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Segmentado } from "@/components/ui/Segmentado";
import { Vazio } from "@/components/ui/Vazio";
import { ehItm } from "@/lib/calc/metricas";
import { ehRegistroProprio, remover } from "@/lib/data/repositorio";
import { percentual } from "@/lib/format";
import { usePainel } from "@/lib/painel";
import type { Torneio } from "@/lib/types";

type Filtro = "todos" | "premiados" | "satelite" | "meus";

export default function Torneios() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const dados = usePainel("tudo");
  const { geral, idx } = dados;
  const { dialogo, confirmar } = useConfirmacao();

  const lista = [...dados.torneios]
    .reverse()
    .filter((t) =>
      filtro === "premiados"
        ? ehItm(t)
        : filtro === "satelite"
          ? t.via === "satelite"
          : filtro === "meus"
            ? ehRegistroProprio(t.id)
            : true,
    );

  // Apagar um torneio mexe na banca, no ROI, no ITM e nas metas do ano. Antes
  // disso era um toque só, num alvo de 19px, ao lado de "Editar".
  const pedirParaApagar = (t: Torneio) =>
    confirmar({
      titulo: `Apagar ${t.nome}?`,
      corpo:
        "O torneio some do histórico e sai de todos os cálculos — banca, ROI, ITM e metas. Não há como desfazer.",
      rotuloAcao: "Apagar torneio",
      aoConfirmar: () => {
        remover(t.id);
        anunciar("Torneio apagado.", "neutro");
      },
    });

  return (
    <main className="mx-auto w-full max-w-[86rem] px-4 py-7 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="texto-display text-ink">Torneios</h1>
          <p className="texto-apoio mt-1.5 text-ink-secondary">
            {geral.torneios} registros · {percentual(geral.itmPct)} de ITM · {geral.mesasFinais}{" "}
            mesas finais · {geral.titulos} {geral.titulos === 1 ? "título" : "títulos"}
          </p>
        </div>

        <Botao href="/torneios/novo" tom="primario" className="max-sm:w-full">
          Registrar torneio
        </Botao>
      </header>

      <div className="mt-6">
        <Placa>
          <CabecalhoPlaca
            titulo="Histórico"
            descricao={`${lista.length} ${lista.length === 1 ? "torneio" : "torneios"} neste filtro`}
            acessorio={
              <Segmentado
                rotuloAcessivel="Filtrar torneios"
                valor={filtro}
                aoMudar={setFiltro}
                opcoes={[
                  { valor: "todos", rotulo: "Todos" },
                  { valor: "premiados", rotulo: "Premiados" },
                  { valor: "satelite", rotulo: "Satélite" },
                  { valor: "meus", rotulo: "Meus" },
                ]}
              />
            }
          />

          {lista.length === 0 ? (
            <Vazio
              titulo={
                filtro === "meus"
                  ? "Você ainda não registrou nenhum torneio"
                  : "Nenhum torneio neste filtro"
              }
              corpo={
                filtro === "meus"
                  ? "Cada torneio registrado alimenta a banca, o ROI e a leitura de satélites. O primeiro leva menos de um minuto."
                  : "Troque o filtro acima para ver o resto do histórico."
              }
              acao={
                filtro === "meus"
                  ? { rotulo: "Registrar o primeiro", href: "/torneios/novo" }
                  : undefined
              }
            />
          ) : (
            <ListaTorneios
              torneios={lista}
              idx={idx}
              aoApagar={pedirParaApagar}
              comInvestimento
            />
          )}
        </Placa>
      </div>

      {dialogo}
    </main>
  );
}
