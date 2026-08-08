interface Serie {
  rotulo: string;
  valor: number;
  cor: string;
}

interface Props {
  titulo: string;
  nota?: string;
  series: [Serie, Serie];
  formatar: (v: number) => string;
  /** Para métricas em que menor é melhor (tempo gasto, por exemplo). */
  menorEhMelhor?: boolean;
}

const ESPESSURA = 13;
const RESPIRO = 2;

/**
 * Um painel de pequeno múltiplo: duas barras, uma métrica, escala própria.
 *
 * Cada métrica tem sua unidade (%, R$, minutos), e enfiar todas num eixo só
 * exigiria dois eixos y — que é a forma mais comum de um gráfico inventar
 * correlação. Painéis separados com valor rotulado na ponta resolvem sem
 * mentir, e por isso nenhum deles precisa de eixo.
 */
export function ParDeBarras({ titulo, nota, series, formatar, menorEhMelhor }: Props) {
  const valores = series.map((s) => s.valor);
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores);
  const span = max - min || 1;

  const zero = ((0 - min) / span) * 100;
  const largura = (v: number) => (Math.abs(v) / span) * 100;

  const vencedor = menorEhMelhor
    ? valores.indexOf(Math.min(...valores))
    : valores.indexOf(Math.max(...valores));

  return (
    <div className="py-3.5">
      <p className="text-[12px] font-medium text-ink-secondary">{titulo}</p>
      {nota && <p className="mt-0.5 text-[12px] text-ink-muted">{nota}</p>}

      <div className="mt-2.5 space-y-[2px]">
        {series.map((s, i) => (
          <div key={s.rotulo} className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 text-[12px] text-ink-muted">{s.rotulo}</span>
            <span className="relative h-[13px] flex-1">
              {/* Linha do zero — só aparece quando há valor negativo em jogo */}
              {min < 0 && (
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0 w-px bg-[var(--color-axis)]"
                  style={{ left: `${zero}%` }}
                />
              )}
              <span
                className="absolute top-0 bottom-0 transition-[width] duration-[900ms] ease-[var(--ease-out-quint)]"
                style={{
                  left: s.valor >= 0 ? `${zero}%` : `${zero - largura(s.valor)}%`,
                  width: `${largura(s.valor)}%`,
                  background: s.cor,
                  height: ESPESSURA,
                  // Ponta arredondada no fim do dado, reta na linha de base.
                  borderRadius:
                    s.valor >= 0 ? `0 ${RESPIRO * 2}px ${RESPIRO * 2}px 0` : `${RESPIRO * 2}px 0 0 ${RESPIRO * 2}px`,
                }}
              />
            </span>
            <span
              className={`numeros-tabulares w-[5.5rem] shrink-0 text-right text-[12.5px] ${
                i === vencedor ? "font-semibold text-ink" : "text-ink-secondary"
              }`}
            >
              {formatar(s.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
