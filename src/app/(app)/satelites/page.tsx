"use client";

import { Comparativo } from "@/components/sat/Comparativo";
import { Energia } from "@/components/sat/Energia";
import { Historico } from "@/components/sat/Historico";
import { Veredito } from "@/components/sat/Veredito";
import { Indicador } from "@/components/dash/Indicador";
import { Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import { horas, moeda, percentual } from "@/lib/format";
import { usePainel } from "@/lib/painel";

export default function PaginaSatelites() {
  // A análise de satélites usa a base inteira: recortar por período reduziria
  // demais a amostra e faria o veredito oscilar a cada troca de filtro.
  const dados = usePainel("tudo");
  const { statsSat, comparacao, recomendacao } = dados;

  return (
    <main className="mx-auto w-full max-w-[86rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir">
        <h1 className="texto-display text-ink">
          Satélites
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-secondary">
          O satélite barateia a vaga e cobra em energia. As duas forças são
          medidas separadamente aqui, e a soma delas responde se vale a pena
          para você — não para o jogador médio.
        </p>
      </header>

      {/* A página inteira é uma comparação entre duas vias. Sem nenhum
          satélite registrado não há segunda via, e exibir a estrutura zerada
          — veredito "empatado", quatro indicadores em R$ 0, dois gráficos
          vazios — afirmaria um empate que ninguém mediu. */}
      {dados.satelites.length === 0 ? (
        <div className="mt-7">
          <Placa>
            <Vazio
              className="py-16 sm:py-20"
              titulo="Ainda não há satélite para analisar"
              corpo="Ao registrar um torneio, informe se jogou satélite antes e se classificou. É desse par que sai tudo aqui: quanto a vaga saiu mais barata, quanto o cansaço custou na mesa e qual das duas forças venceu. O Oblix precisa de oito registros por via antes de arriscar um veredito."
              acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
            />
          </Placa>
        </div>
      ) : (
      <div className="mt-7 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-12">
          <Veredito
            recomendacao={recomendacao}
            decomposicao={comparacao.decomposicao}
            amostraSuficiente={comparacao.amostraSuficiente}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-12 lg:grid-cols-4">
          <Indicador
            atraso={60}
            rotulo="Taxa de classificação"
            valor={statsSat.taxaClassificacao}
            formatar={(v) => percentual(v)}
            nota={`${statsSat.classificados} vagas em ${statsSat.disputados} satélites`}
          />
          <Indicador
            atraso={110}
            rotulo="Custo médio por vaga"
            valor={statsSat.custoMedioPorVaga}
            formatar={(v) => moeda(v)}
            nota={`Contra ${moeda(dados.perfil.buyInPadrao)} de buy-in padrão`}
          />
          <Indicador
            atraso={160}
            rotulo="Economia líquida"
            valor={statsSat.economiaLiquida}
            formatar={(v) => moeda(v)}
            nota="Valor das vagas menos tudo que gastou, inclusive os satélites perdidos"
          />
          <Indicador
            atraso={210}
            rotulo="Horas em satélites"
            valor={statsSat.minutosJogados / 60}
            formatar={(v) => horas(v * 60)}
            nota={`${statsSat.entradasTotais} entradas somando re-entries`}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          <Comparativo comp={comparacao} atraso={260} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <Energia faixas={dados.energia} porVia={dados.energiaPorVia} atraso={300} />
        </div>

        <div className="min-w-0 lg:col-span-12">
          <Historico satelites={dados.satelites} torneios={dados.torneios} atraso={340} />
        </div>
      </div>
      )}
    </main>
  );
}
