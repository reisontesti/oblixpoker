import { BANCA, ENERGIA, PICO, RESUMO, SATS, SERIE } from "@/lib/site/vitrine";
import { caminhoArea, caminhoLinha, dominioComFolga, escalaLinear } from "@/lib/viz/escala";
import { decimal, moeda, moedaCompacta, percentual } from "@/lib/format";
import { ROTULO_ENERGIA } from "@/lib/types";

/**
 * A vitrine: o painel do Oblix, montado com os mesmos tokens e os mesmos
 * cálculos do produto.
 *
 * Não é imagem nem maquete desenhada. É HTML, com os números saindo da base de
 * demonstração pelas funções que o painel usa — então ela não pode prometer
 * uma tela que o produto não entrega, e acompanha sozinha qualquer mudança de
 * métrica.
 *
 * Renderiza no SERVIDOR, em tempo de build. A curva é um `path` calculado
 * aqui: nenhum byte de JavaScript vai para o visitante por causa dela.
 *
 * O escuro vem do layout do site, que é obsidiano inteiro: aqui ele não é
 * preferência de quem visita, é o produto sendo mostrado — como um aparelho
 * numa fotografia.
 */

const L = 640;
const A = 190;

function Curva() {
  // Os últimos 90 dias da série: é o recorte que o painel abre por padrão, e é
  // o que dá uma linha com forma em vez de um emaranhado de 14 meses.
  const corte = SERIE.at(-1)!.t - 90 * 86_400_000;
  const pontos = SERIE.filter((p) => p.t >= corte);
  const base = pontos.length >= 2 ? pontos : SERIE.slice(-2);

  const [min, max] = dominioComFolga(base.map((p) => p.saldo));
  const ex = escalaLinear([base[0].t, base.at(-1)!.t], [0, L]);
  const ey = escalaLinear([min, max], [A, 0]);
  const xy = base.map((p) => ({ x: ex(p.t), y: ey(p.saldo) }));
  const fim = xy.at(-1)!;

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      className="mt-5 h-[150px] w-full sm:h-[190px]"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Evolução da banca nos últimos 90 dias, terminando em ${moeda(BANCA)}`}
    >
      <defs>
        <linearGradient id="vitrine-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-positivo)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--color-positivo)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={caminhoArea(xy, A)} fill="url(#vitrine-area)" />
      <path
        d={caminhoLinha(xy)}
        fill="none"
        stroke="var(--color-positivo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={fim.x} cy={fim.y} r="4" fill="var(--color-positivo)" />
    </svg>
  );
}

function Indicador({
  rotulo,
  valor,
  nota,
  cor,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  cor?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="rotulo">{rotulo}</p>
      <p
        className="numeros-tabulares mt-1.5 text-[20px] leading-none font-semibold sm:text-[23px]"
        style={{ color: cor ?? "var(--color-ink)" }}
      >
        {valor}
      </p>
      {nota && <p className="mt-1.5 text-[12px] text-ink-muted">{nota}</p>}
    </div>
  );
}

export function Vitrine({ className = "" }: { className?: string }) {
  const maiorFaixa = Math.max(...ENERGIA.map((f) => f.profundidadeMedia));

  return (
    <div className={`placa grao relative overflow-hidden ${className}`}>
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/3 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_15%,transparent),transparent)] blur-3xl"
      />
      <div className="relative p-5 sm:p-7">
        {/* ── figura herói ── */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="rotulo">Banca</p>
            <p className="mt-2 text-[38px] leading-none font-semibold tracking-[-0.03em] text-ink sm:text-[52px]">
              {moeda(BANCA)}
            </p>
            <p className="mt-2.5 flex items-center gap-1.5 text-[13px]">
              <span aria-hidden style={{ color: "var(--color-positivo)" }}>
                ▲
              </span>
              <span className="font-medium" style={{ color: "var(--color-positivo)" }}>
                {moeda(RESUMO.lucro)}
              </span>
              <span className="text-ink-secondary">de lucro em {RESUMO.torneios} torneios</span>
            </p>
          </div>

          <div className="flex gap-7 sm:gap-9">
            <Indicador rotulo="Pico" valor={moedaCompacta(PICO)} />
            <Indicador
              rotulo="ROI"
              valor={percentual(RESUMO.roi)}
              cor="var(--color-positivo)"
            />
            <Indicador rotulo="ITM" valor={percentual(RESUMO.itmPct)} />
          </div>
        </div>

        <Curva />

        {/* ── faixa de indicadores ── */}
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-5 sm:grid-cols-4">
          <Indicador
            rotulo="Mesas finais"
            valor={String(RESUMO.mesasFinais)}
            nota={`${RESUMO.titulos} títulos`}
          />
          <Indicador
            rotulo="Buy-in médio"
            valor={moeda(RESUMO.buyInMedio)}
            nota={`${moeda(RESUMO.investido)} investidos`}
          />
          <Indicador
            rotulo="Satélites"
            valor={percentual(SATS.taxaClassificacao)}
            nota={`${SATS.classificados} vagas em ${SATS.disputados}`}
          />
          <Indicador
            rotulo="Disciplina"
            valor={`${decimal(RESUMO.disciplina, 1)}`}
            nota="média autoavaliada"
          />
        </div>

        {/* ── desempenho por energia ── */}
        <div className="mt-5 border-t border-hairline pt-5">
          <p className="rotulo">Profundidade no campo, por energia</p>
          <div className="mt-3 space-y-2">
            {[...ENERGIA].reverse().map((faixa, i) => (
              <div key={faixa.nivel} className="flex items-center gap-3">
                <span className="w-[7.5rem] shrink-0 text-[12px] leading-tight text-ink-secondary">
                  {ROTULO_ENERGIA[faixa.nivel]}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-trilho">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(faixa.profundidadeMedia / maiorFaixa) * 100}%`,
                      background: `var(--color-energia-${ENERGIA.length - i})`,
                    }}
                  />
                </span>
                <span className="numeros-tabulares w-11 shrink-0 text-right text-[12.5px] font-medium text-ink">
                  {percentual(faixa.profundidadeMedia * 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
