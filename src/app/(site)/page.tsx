import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/site/Cabecalho";
import { CartaoRecurso, Destaque, GLIFOS, Secao, Titulo } from "@/components/site/Blocos";
import { Rodape } from "@/components/site/Rodape";
import { NumeroQueConta, Revelar } from "@/components/site/Revelar";
import { Salas } from "@/components/site/Salas";
import { Vitrine } from "@/components/site/Vitrine";
import { moeda, percentual } from "@/lib/format";
import { BANCA, CONTRASTE_ENERGIA, HORAS, RESUMO, SATS } from "@/lib/site/vitrine";
import { ROTULO_ENERGIA } from "@/lib/types";
import { DESCRICAO_FASE, FASES, ROTULO_FASE } from "@/lib/treino/tipos";

/**
 * A página de apresentação do Oblix.
 *
 * Mora na raiz, e o produto passou a morar em `/painel`. É a separação
 * convencional entre a porta e a casa, e é o que torna esta página
 * compartilhável e indexável sem arrastar a navegação do app junto.
 *
 * Duas regras a governam, e as duas são sobre o que ela NÃO faz.
 *
 * **Nada de número inventado.** Os valores da vitrine saem da base de
 * demonstração pelos mesmos cálculos do painel, e a página diz que o jogador é
 * fictício onde os mostra. Uma ferramenta que existe para não deixar o jogador
 * se enganar com os próprios dados não pode abrir mentindo com os dela.
 *
 * **Nada de promessa que o produto não cumpre.** Sem depoimento inventado, sem
 * integração que não existe, sem afirmar qual satélite compensa — o próprio
 * Oblix se abstém quando a amostra é pequena, e a apresentação diz isso em vez
 * de esconder.
 *
 * Renderiza estática. Só o cabeçalho e as entradas por rolagem são cliente.
 */

export const metadata: Metadata = {
  title: "Oblix — plataforma de performance para jogadores de poker",
  description:
    "Registre cada torneio e veja a sua evolução: banca, ROI, ITM, adversários e treino direcionado para o que você precisa melhorar. Grátis para começar.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Oblix",
    title: "Oblix — plataforma de performance para jogadores de poker",
    description:
      "Pare de jogar no escuro. O Oblix transforma cada torneio em dados, decisões e evolução.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oblix — plataforma de performance para jogadores de poker",
    description:
      "Pare de jogar no escuro. O Oblix transforma cada torneio em dados, decisões e evolução.",
  },
};

// ── seção 4 ────────────────────────────────────────────────────────────────

const PERGUNTAS = [
  {
    titulo: "“Estou evoluindo?”",
    corpo: "Sem histórico organizado, é difícil saber. Um mês bom não é tendência.",
  },
  {
    titulo: "“Onde estou perdendo?”",
    corpo: "Resultado isolado não mostra o padrão. É preciso ver a série inteira.",
  },
  {
    titulo: "“O que devo estudar agora?”",
    corpo:
      "Estudar poker sem identificar as suas maiores dificuldades desperdiça o tempo que você tem.",
  },
];

// ── seção 5 ────────────────────────────────────────────────────────────────

const RECURSOS = [
  {
    titulo: "Bankroll",
    corpo:
      "Banca, entradas, retiradas e lucro, separados. Aporte não vira lucro e saque não vira prejuízo.",
    glifo: GLIFOS.banca,
  },
  {
    titulo: "Torneios",
    corpo:
      "Cada torneio registrado em menos de um minuto, com buy-in, rebuys, colocação, premiação e duração.",
    glifo: GLIFOS.torneio,
  },
  {
    titulo: "Performance",
    corpo:
      "ROI, ITM, mesas finais, profundidade no campo e disciplina — no período que você escolher.",
    glifo: GLIFOS.desempenho,
  },
  {
    titulo: "Banco de jogadores",
    corpo:
      "Adversários com perfil, padrões observados, tells e o histórico dos seus confrontos.",
    glifo: GLIFOS.jogadores,
  },
  {
    titulo: "Treino",
    corpo:
      "Decisões reais de torneio, uma por vez, nas fases em que você vem errando mais.",
    glifo: GLIFOS.treino,
  },
  {
    titulo: "Satélites",
    corpo:
      "Quanto a vaga saiu mais barata, quanto o cansaço custou na mesa e qual das duas forças venceu.",
    glifo: GLIFOS.satelite,
  },
  {
    titulo: "Importação",
    corpo:
      "Arraste o histórico que a sala te dá e ele vira torneio, estatística e leitura de adversário. O arquivo é lido no seu navegador.",
    glifo: GLIFOS.importar,
  },
];

// ── seção 13 ───────────────────────────────────────────────────────────────

const PUBLICOS = [
  { titulo: "Estou começando", corpo: "Quero entender melhor o meu desempenho." },
  { titulo: "Jogo regularmente", corpo: "Quero organizar resultados e encontrar padrões." },
  { titulo: "Quero evoluir", corpo: "Quero achar as minhas maiores dificuldades e treinar." },
  { titulo: "Quero profissionalizar", corpo: "Quero tratar banca e desempenho com disciplina." },
];

// ── seção 14 ───────────────────────────────────────────────────────────────

const COMPARACAO = [
  ["Registra resultados", "Registra e interpreta"],
  ["Mostra bankroll", "Mostra evolução"],
  ["Histórico de torneios", "Histórico e padrões"],
  ["Anotações soltas", "Banco de jogadores"],
  ["Estudo genérico", "Treino direcionado"],
  ["Dados isolados", "Jornada completa"],
];

export default function PaginaInicial() {
  return (
    <>
      <Cabecalho />

      <main id="conteudo">
        {/* ═══ herói ═══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-64 left-1/2 h-[38rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_13%,transparent),transparent)] blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[76rem] px-4 pt-12 pb-16 sm:px-7 sm:pt-20 sm:pb-24 lg:px-10">
            <Revelar className="mx-auto max-w-3xl text-center">
              <h1 className="text-[34px] leading-[1.06] font-semibold tracking-[-0.035em] text-ink sm:text-[62px]">
                Pare de jogar no escuro.
              </h1>
              <p className="mx-auto mt-5 max-w-[38rem] text-[15.5px] leading-relaxed text-ink-secondary sm:text-[18px]">
                O Oblix transforma cada torneio em dados, decisões e evolução para você jogar
                cada vez melhor.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Link
                  href="/painel"
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--color-positivo)] px-7 text-[15px] font-semibold text-plane transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99] sm:w-auto"
                >
                  Começar gratuitamente
                </Link>
                <Link
                  href="#produto"
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-hairline-strong px-7 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-realce sm:w-auto"
                >
                  Conhecer o Oblix
                </Link>
              </div>

              <p className="mt-4 text-[13px] text-ink-muted">
                Grátis para começar. Sem mensalidade.
              </p>
            </Revelar>

            <Revelar atraso={120} className="mt-12 sm:mt-16">
              <Vitrine />
              {/* A honestidade que a página inteira depende: estes números são
                  reais no sentido de que saem dos cálculos do produto, e são de
                  um jogador que não existe. Dizer isso aqui custa uma linha. */}
              <p className="mt-4 text-center text-[12.5px] text-ink-muted">
                O painel do Oblix com a base de demonstração — 14 meses de um jogador fictício,
                que abre no primeiro acesso para você experimentar antes de registrar qualquer
                coisa.
              </p>
            </Revelar>
          </div>
        </section>

        {/* ═══ salas compatíveis ═══════════════════════════════════════════ */}
        <Salas />

        {/* ═══ o problema ══════════════════════════════════════════════════ */}
        <Secao>
          <Titulo
            sobretitulo="O problema"
            apoio="A maioria dos jogadores termina um torneio e segue para o próximo. Sabe quanto ganhou, quanto perdeu e onde terminou. Mas não consegue enxergar os padrões."
          >
            Você lembra das mãos.
            <br className="hidden sm:block" /> O Oblix lembra da sua evolução.
          </Titulo>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-5">
            {PERGUNTAS.map((p, i) => (
              <Revelar key={p.titulo} atraso={i * 90} className="placa relative p-5 sm:p-6">
                <p className="text-[17px] leading-snug font-medium text-ink">{p.titulo}</p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
                  {p.corpo}
                </p>
              </Revelar>
            ))}
          </div>
        </Secao>

        {/* ═══ o que o Oblix faz ═══════════════════════════════════════════ */}
        <Secao id="produto" className="pt-0 sm:pt-0">
          <Titulo sobretitulo="O produto">Seu poker, finalmente organizado.</Titulo>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {RECURSOS.map((r, i) => (
              <CartaoRecurso key={r.titulo} {...r} atraso={(i % 3) * 80} />
            ))}
          </div>
        </Secao>

        {/* ═══ o painel ════════════════════════════════════════════════════ */}
        <Secao id="painel" className="pt-0 sm:pt-0">
          <Titulo sobretitulo="O painel" centro>
            Tudo o que importa. Em uma única tela.
          </Titulo>

          <Revelar atraso={80} className="mt-10 sm:mt-14">
            <Vitrine />
          </Revelar>

          <div className="mt-12 sm:mt-16">
            <Destaque>
              Você não deveria precisar abrir cinco planilhas para entender como está jogando.
            </Destaque>
          </div>

          <Revelar
            atraso={60}
            className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-8 sm:mt-14 sm:grid-cols-4"
          >
            {([
              { valor: RESUMO.torneios, rotulo: "torneios", fmt: "inteiro" },
              { valor: HORAS, rotulo: "horas de mesa", fmt: "inteiro" },
              { valor: SATS.disputados, rotulo: "satélites", fmt: "inteiro" },
              { valor: RESUMO.roi, rotulo: "de ROI no período", fmt: "percentual" },
            ] as const).map((n) => (
              <div key={n.rotulo} className="text-center">
                <NumeroQueConta
                  ate={n.valor}
                  formato={n.fmt}
                  className="block text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink sm:text-[40px]"
                />
                <p className="mt-2 text-[12.5px] text-ink-muted">{n.rotulo}</p>
              </div>
            ))}
          </Revelar>
          <p className="mt-5 text-center text-[12px] text-ink-muted">
            Números da base de demonstração, calculados pelas mesmas funções do painel.
          </p>
        </Secao>

        {/* ═══ banco de jogadores ══════════════════════════════════════════ */}
        <Secao id="jogadores" className="pt-0 sm:pt-0">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Titulo sobretitulo="Banco de jogadores">
                Conheça seus adversários. Não apenas suas cartas.
              </Titulo>
              <Revelar atraso={60}>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
                  Você constrói o seu próprio banco: nome, quantos confrontos já teve, o perfil
                  que você observou, os padrões que percebeu, os tells e o saldo dos encontros.
                  Tudo o que você anotar, e nada além disso — o Oblix não vê as cartas nem lê a
                  intenção de ninguém.
                </p>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed font-medium text-ink">
                  Com o tempo, seu banco de jogadores se torna uma das suas maiores fontes de
                  informação.
                </p>
              </Revelar>
            </div>

            <Revelar atraso={120} className="placa grao relative overflow-hidden">
              <div aria-hidden className="grao-camada rounded-[20px]" />
              <div className="relative p-5 sm:p-6">
                <p className="rotulo">Modo Mesa</p>
                <p className="mt-2 text-[13px] text-ink-secondary">
                  Os adversários sentados com você, agrupados por risco.
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    { g: "Cuidado", n: "Jogam bem. Potes marginais custam caro aqui.", c: "var(--color-negativo)" },
                    { g: "Imprevisíveis", n: "Variância alta. Espere mão feita.", c: "var(--color-atencao)" },
                    { g: "Oportunidade", n: "É daqui que sai a maior parte do seu lucro.", c: "var(--color-positivo)" },
                  ].map((b) => (
                    <div
                      key={b.g}
                      className="rounded-xl border border-hairline bg-sunken px-4 py-3"
                    >
                      <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: b.c }}
                        />
                        {b.g}
                      </p>
                      <p className="mt-1 text-[12.5px] text-ink-muted">{b.n}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Revelar>
          </div>
        </Secao>

        {/* ═══ treino ══════════════════════════════════════════════════════ */}
        <Secao id="treino" className="pt-0 sm:pt-0">
          <Titulo
            sobretitulo="Treino"
            apoio="Treine exatamente aquilo que você precisa melhorar. As situações vêm com stack, posição, quem já agiu e quantos ainda vão agir — como na mesa."
          >
            Não estude poker aleatoriamente.
          </Titulo>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {FASES.map((f, i) => (
              <Revelar
                key={f}
                atraso={(i % 3) * 80}
                className="placa relative px-5 py-5 sm:px-6"
              >
                <h3 className="text-[15px] font-semibold text-ink">{ROTULO_FASE[f]}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                  {DESCRICAO_FASE[f]}
                </p>
              </Revelar>
            ))}
          </div>

          {/* Um exemplo de decisão de verdade, com a linguagem do produto. */}
          <Revelar atraso={100} className="placa mt-8 overflow-hidden sm:mt-10">
            <div className="relative p-5 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="rotulo">Mesa final · Push/Fold</p>
                <p className="text-[12.5px] text-ink-muted">6 na mesa</p>
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <p className="text-[34px] leading-none font-semibold text-ink">
                  20 <span className="text-[15px] font-medium text-ink-secondary">BB</span>
                </p>
                <p className="text-[15px] text-ink">
                  Você está no <strong className="font-semibold">BTN</strong>
                </p>
              </div>
              <p className="mt-4 rounded-xl border border-hairline bg-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
                Todos foldam até você. O jogador do BB tem 9 BB.
              </p>

              <p className="mt-5 text-[14px] font-medium text-ink">Qual é a melhor decisão?</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["Fold", "Call", "Raise", "All-in"].map((a) => (
                  <span
                    key={a}
                    className="grid min-h-[var(--toque)] place-items-center rounded-xl border border-hairline bg-sunken text-[14px] font-medium text-ink-secondary"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <p className="mt-5 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-secondary">
                Depois da resposta, o Oblix mostra a decisão de referência,{" "}
                <strong className="font-medium text-ink">com que frequência ela é a certa</strong>{" "}
                — uma mão pode ser raise 65% e fold 35% —, explica o porquê e guarda o resultado
                para saber o que insistir com você.
              </p>
            </div>
          </Revelar>

          <Revelar atraso={60}>
            <p className="mt-5 max-w-3xl text-[12.5px] leading-relaxed text-ink-muted">
              As referências do Oblix são construídas a partir de princípios públicos de torneio
              — posição mais atrasada abre mais largo, stack mais curto empurra mais largo, pagar
              all-in exige mais do que empurrar. Não são saída de solver, e o produto diz isso em
              vez de fingir uma autoridade que não tem.
            </p>
          </Revelar>
        </Secao>

        {/* ═══ o ciclo ═════════════════════════════════════════════════════ */}
        <Secao className="pt-0 sm:pt-0">
          <Titulo sobretitulo="Evolução" centro>
            Seu próximo treino pode ser decidido pelo seu próprio histórico.
          </Titulo>

          <Revelar
            atraso={80}
            className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:mt-14"
          >
            {["Jogar", "Registrar", "Analisar", "Treinar", "Jogar melhor"].map((passo, i, a) => (
              <span key={passo} className="flex items-center gap-3">
                <span className="rounded-full border border-hairline bg-sunken px-4 py-2 text-[13.5px] font-medium text-ink">
                  {passo}
                </span>
                {i < a.length - 1 && (
                  <span aria-hidden className="text-ink-faint">
                    →
                  </span>
                )}
              </span>
            ))}
          </Revelar>

          {CONTRASTE_ENERGIA && (
            <Revelar atraso={120} className="placa mx-auto mt-10 max-w-3xl p-5 sm:mt-12 sm:p-7">
              <p className="rotulo">Um exemplo do que sai desse ciclo</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink sm:text-[16.5px]">
                Na base de demonstração, o jogador chega{" "}
                <strong className="font-semibold" style={{ color: "var(--color-positivo)" }}>
                  {percentual(CONTRASTE_ENERGIA.melhor.profundidadeMedia * 100)}
                </strong>{" "}
                do campo quando senta{" "}
                {ROTULO_ENERGIA[CONTRASTE_ENERGIA.melhor.nivel].toLowerCase()} e{" "}
                <strong className="font-semibold" style={{ color: "var(--color-negativo)" }}>
                  {percentual(CONTRASTE_ENERGIA.pior.profundidadeMedia * 100)}
                </strong>{" "}
                quando senta {ROTULO_ENERGIA[CONTRASTE_ENERGIA.pior.nivel].toLowerCase()}.
              </p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">
                Nenhum resultado isolado mostra isso. A série mostra — e o Oblix só afirma
                quando há amostra: abaixo de três torneios numa faixa, ele diz que ainda não
                sabe, em vez de arriscar um número.
              </p>
            </Revelar>
          )}
        </Secao>

        {/* ═══ satélites ═══════════════════════════════════════════════════ */}
        <Secao id="satelites" className="pt-0 sm:pt-0">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Titulo sobretitulo="Torneios e satélites">
                Até a decisão de entrar no torneio pode ser estratégica.
              </Titulo>
              <Revelar atraso={60}>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
                  Quem entra direto paga o buy-in do principal. Quem entra por satélite paga o
                  custo do satélite — e chega mais cansado. O Oblix registra o par e mede as duas
                  forças separadamente: quanto a vaga saiu mais barata, e quanto o cansaço custou
                  na mesa.
                </p>
                <p className="mt-5 max-w-xl text-[13.5px] leading-relaxed text-ink-muted">
                  Ele não decide por você antes de ter dados. Com amostra pequena, o veredito diz
                  que a amostra é pequena.
                </p>
              </Revelar>
            </div>

            <Revelar atraso={120} className="placa grao relative overflow-hidden">
              <div aria-hidden className="grao-camada rounded-[20px]" />
              <div className="relative p-5 sm:p-7">
                <div className="rounded-xl border border-hairline bg-sunken px-4 py-3">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-medium text-ink">Satélite</span>
                    <span
                      className="numeros-tabulares text-[14px] font-medium"
                      style={{ color: "var(--color-satelite)" }}
                    >
                      {moeda(20)}
                    </span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-muted">17:00 · 72 jogadores</p>
                </div>

                <p aria-hidden className="py-2 text-center text-ink-faint">
                  ↓
                </p>

                <p
                  className="rounded-xl px-4 py-2 text-center text-[13px] font-medium"
                  style={{
                    color: "var(--color-positivo)",
                    background: "color-mix(in oklab, var(--color-positivo) 12%, transparent)",
                  }}
                >
                  Vaga conquistada
                </p>

                <p aria-hidden className="py-2 text-center text-ink-faint">
                  ↓
                </p>

                <div className="rounded-xl border border-hairline bg-sunken px-4 py-3">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-medium text-ink">Torneio principal</span>
                    <span
                      className="numeros-tabulares text-[14px] font-medium"
                      style={{ color: "var(--color-direto)" }}
                    >
                      {moeda(300)}
                    </span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-muted">20:00 · vaga que custou 20</p>
                </div>

                <p className="mt-5 border-t border-hairline pt-4 text-[12.5px] leading-relaxed text-ink-secondary">
                  Na demonstração são {SATS.disputados} satélites disputados,{" "}
                  {percentual(SATS.taxaClassificacao)} de classificação e{" "}
                  {moeda(SATS.economiaLiquida)} de economia líquida — já descontando os satélites
                  perdidos.
                </p>
              </div>
            </Revelar>
          </div>
        </Secao>

        {/* ═══ bankroll ════════════════════════════════════════════════════ */}
        <Secao id="bankroll" className="pt-0 sm:pt-0">
          <Titulo
            sobretitulo="Bankroll"
            apoio="O Oblix separa o dinheiro que você colocou do bolso do dinheiro que o poker gerou. Sem isso, um saque aparece como prejuízo e um aporte como lucro — e a sua curva passa a contar uma história que não aconteceu."
          >
            Seu poker precisa de banca. Não de improviso.
          </Titulo>

          <Revelar atraso={80} className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { r: "Banca atual", v: moeda(BANCA), n: "aportes menos saques, mais resultado" },
              { r: "Total investido", v: moeda(RESUMO.investido), n: "buy-ins, rebuys e add-ons" },
              { r: "Total premiado", v: moeda(RESUMO.retorno), n: `em ${RESUMO.itm} torneios pagos` },
              { r: "Lucro acumulado", v: moeda(RESUMO.lucro), n: `${percentual(RESUMO.roi)} de ROI` },
            ].map((c) => (
              <div key={c.r} className="placa p-5">
                <p className="rotulo">{c.r}</p>
                <p className="numeros-tabulares mt-2 text-[22px] leading-none font-semibold text-ink">
                  {c.v}
                </p>
                <p className="mt-2 text-[12px] leading-snug text-ink-muted">{c.n}</p>
              </div>
            ))}
          </Revelar>

          <div className="mt-12 sm:mt-16">
            <Destaque>
              O objetivo não é apenas ganhar torneios. É construir uma trajetória sustentável.
            </Destaque>
          </div>
        </Secao>

        {/* ═══ grátis ══════════════════════════════════════════════════════ */}
        <Secao className="pt-0 sm:pt-0">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Titulo sobretitulo="Como o Oblix se sustenta">
                Gratuito. E sem pedir nada antes de servir para alguma coisa.
              </Titulo>
              <Revelar atraso={60}>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
                  Não há mensalidade, teste que expira nem recurso trancado. O pedido de apoio
                  aparece uma vez: depois que você registra uma premiação — quando o Oblix já
                  demonstrou que serve para alguma coisa.
                </p>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
                  Contribuir é voluntário, e “Agora não” é uma resposta completa.
                </p>
              </Revelar>
            </div>

            <Revelar atraso={120} className="placa grao relative overflow-hidden">
              <div aria-hidden className="grao-camada rounded-[20px]" />
              <div className="relative p-5 sm:p-7">
                <p className="text-[16px] font-medium text-ink">
                  Boa. Você acabou de registrar uma premiação.
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">
                  O Oblix é gratuito porque queremos que mais jogadores tenham acesso a
                  ferramentas melhores para acompanhar a própria evolução. Se ele te ajudou,
                  considere contribuir para mantê-lo evoluindo.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {["5%", "10%", "15%"].map((v) => (
                    <span
                      key={v}
                      className="grid min-h-[var(--toque)] place-items-center rounded-xl border border-hairline bg-sunken text-[14px] font-medium text-ink"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-center text-[13px] text-ink-muted">Agora não</p>
              </div>
            </Revelar>
          </div>
        </Secao>

        {/* ═══ para quem é ═════════════════════════════════════════════════ */}
        <Secao className="pt-0 sm:pt-0">
          <Titulo sobretitulo="Para quem é" centro>
            Para quem quer levar o poker a sério.
          </Titulo>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
            {PUBLICOS.map((p, i) => (
              <Revelar key={p.titulo} atraso={i * 70} className="placa p-5 sm:p-6">
                <h3 className="text-[15px] font-semibold text-ink">{p.titulo}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{p.corpo}</p>
              </Revelar>
            ))}
          </div>
        </Secao>

        {/* ═══ diferencial ═════════════════════════════════════════════════ */}
        <Secao className="pt-0 sm:pt-0">
          <Titulo sobretitulo="O diferencial" centro>
            Mais do que um tracker.
          </Titulo>

          <Revelar
            atraso={80}
            className="placa mx-auto mt-10 max-w-3xl overflow-hidden sm:mt-14"
          >
            <div className="grid grid-cols-2">
              <p className="border-b border-hairline px-4 py-3 text-[12px] font-semibold tracking-[0.12em] text-ink-muted uppercase sm:px-6">
                Ferramenta tradicional
              </p>
              <p className="border-b border-l border-hairline px-4 py-3 text-[12px] font-semibold tracking-[0.12em] uppercase sm:px-6">
                <span style={{ color: "var(--color-positivo)" }}>Oblix</span>
              </p>
              {COMPARACAO.map(([antes, depois]) => (
                <div key={antes} className="contents">
                  <p className="border-b border-hairline px-4 py-3.5 text-[13.5px] text-ink-muted last:border-b-0 sm:px-6">
                    {antes}
                  </p>
                  <p className="border-b border-l border-hairline px-4 py-3.5 text-[13.5px] font-medium text-ink last:border-b-0 sm:px-6">
                    {depois}
                  </p>
                </div>
              ))}
            </div>
          </Revelar>
        </Secao>

        {/* ═══ chamada final ═══════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-64 left-1/2 h-[34rem] w-[58rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_14%,transparent),transparent)] blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[76rem] px-4 py-20 text-center sm:px-7 sm:py-28 lg:px-10">
            <Revelar>
              <h2 className="mx-auto max-w-3xl text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] text-ink sm:text-[46px]">
                Seu próximo torneio começa antes da primeira mão.
              </h2>
              <p className="mt-5 text-[15.5px] text-ink-secondary sm:text-[18px]">
                Registre. Analise. Treine. Evolua.
              </p>
              <Link
                href="/painel"
                className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--color-positivo)] px-8 text-[15px] font-semibold text-plane transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99] sm:w-auto"
              >
                Começar gratuitamente
              </Link>
              <p className="mt-4 text-[13px] text-ink-muted">
                Sem mensalidade. Seu histórico fica com você.
              </p>
            </Revelar>
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}
