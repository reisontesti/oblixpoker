"use client";

import { ListaTorneios } from "@/components/torneios/ListaTorneios";
import { Botao } from "@/components/ui/Botao";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import type { IndiceSatelites } from "@/lib/calc/metricas";
import type { Torneio } from "@/lib/types";

interface Props {
  torneios: Torneio[];
  idx: IndiceSatelites;
  atraso?: number;
}

export function UltimosTorneios({ torneios, idx, atraso = 0 }: Props) {
  const ultimos = [...torneios].reverse().slice(0, 7);

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Últimos torneios"
        descricao="Os sete registros mais recentes"
        acessorio={
          ultimos.length > 0 ? (
            <Botao href="/torneios" tom="discreto">
              Ver todos →
            </Botao>
          ) : undefined
        }
      />
      {ultimos.length === 0 ? (
        <Vazio
          titulo="Seu histórico começa aqui"
          corpo="Registrar leva menos de um minuto e é o que alimenta tudo o mais: banca, ROI, comparação entre as vias de entrada e a leitura de energia."
          acao={{ rotulo: "Registrar o primeiro torneio", href: "/torneios/novo" }}
        />
      ) : (
        <ListaTorneios torneios={ultimos} idx={idx} />
      )}
    </Placa>
  );
}
