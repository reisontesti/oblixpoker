import Link from "next/link";
import { Revelar } from "@/components/site/Revelar";
import { SALAS } from "@/lib/integracoes/registro";
import { ROTULO_ESTADO } from "@/lib/integracoes/tipos";

/**
 * As salas compatíveis, logo abaixo do herói.
 *
 * O TEXTO NÃO PROMETE VINCULAÇÃO. Nenhuma sala tem conexão de conta hoje, e
 * "conectamos todas essas plataformas" seria a mentira que derruba a confiança
 * de tudo o mais que a página afirma. O que o Oblix faz é ler o arquivo que a
 * sala já dá ao jogador — e é isso que está escrito.
 *
 * O selo de cada sala vem do REGISTRO, não de uma lista à parte. Quando um
 * parser novo entrar, o selo daquela sala muda sozinho aqui: uma fonte só para
 * o que é verdade, e nada para lembrar de atualizar depois.
 *
 * A faixa rola sozinha, devagar, e a lista aparece duplicada para o laço não
 * ter costura. `aria-hidden` na cópia: leitor de tela ouviria cinco salas dez
 * vezes. E `prefers-reduced-motion` para a fita — quem pediu menos movimento
 * não está pedindo menos, está pedindo nada.
 */

const NOMES = SALAS.map((s) => ({
  nome: s.info.nome,
  pronta: s.info.estado === "disponivel",
  selo: ROTULO_ESTADO[s.info.estado],
}));

function Fita({ oculto = false }: { oculto?: boolean }) {
  return (
    <div
      aria-hidden={oculto || undefined}
      className="flex shrink-0 items-center gap-3 pr-3 sm:gap-4 sm:pr-4"
    >
      {NOMES.map((s) => (
        <span
          key={s.nome}
          className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-hairline bg-card/60 px-5 py-3.5"
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{
              background: s.pronta ? "var(--color-positivo)" : "var(--color-ink-faint)",
            }}
          />
          <span className="text-[15px] font-medium whitespace-nowrap text-ink-secondary">
            {s.nome}
          </span>
          <span className="text-[11.5px] whitespace-nowrap text-ink-faint">{s.selo}</span>
        </span>
      ))}
    </div>
  );
}

export function Salas() {
  const prontas = NOMES.filter((s) => s.pronta).length;

  return (
    <div className="border-y border-hairline py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-7 lg:px-10">
        <Revelar className="mx-auto max-w-2xl text-center">
          <h2 className="text-[24px] leading-[1.15] font-semibold tracking-[-0.025em] text-ink sm:text-[32px]">
            Jogue onde quiser. Evolua em um só lugar.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-secondary sm:text-[16px]">
            O Oblix reúne os seus dados de jogo das principais plataformas e transforma o seu
            histórico em inteligência para a sua evolução.
          </p>
        </Revelar>
      </div>

      {/* A fita sangra até as bordas: contida na coluna, ela pareceria um
          componente; sangrando, parece infraestrutura. */}
      <Revelar atraso={80} className="mt-9 overflow-hidden">
        <div className="flex w-max animate-[oblix-fita_38s_linear_infinite] motion-reduce:animate-none">
          <Fita />
          <Fita oculto />
        </div>
      </Revelar>

      <div className="mx-auto mt-9 w-full max-w-[76rem] px-4 text-center sm:px-7 lg:px-10">
        <Revelar>
          <p className="mx-auto max-w-2xl text-[13px] leading-relaxed text-ink-muted">
            {prontas === 1
              ? "Hoje a importação está pronta para o PokerStars, que documenta a exportação do histórico de mãos e de torneios. "
              : `Hoje a importação está pronta para ${prontas} salas. `}
            As demais estão registradas na arquitetura e entram conforme cada formato for
            confirmado — o Oblix prefere dizer “em desenvolvimento” a prometer o que ainda não lê.
          </p>
          <Link
            href="/plataformas"
            className="mt-5 inline-flex min-h-[var(--toque)] items-center rounded-xl border border-hairline px-5 text-[13.5px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong hover:bg-realce"
          >
            Ver como conectar cada sala
          </Link>
        </Revelar>
      </div>
    </div>
  );
}
