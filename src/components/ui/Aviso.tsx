"use client";

import { useEffect, useSyncExternalStore } from "react";
import { definirTratadorDeFalha } from "@/lib/data/repositorio";

/**
 * O retorno das ações do Oblix.
 *
 * Faltava a metade final de quase todo fluxo: o jogador registrava um torneio,
 * a tela voltava para a lista e nada dizia que tinha dado certo. Em conexão
 * boa isso passa como "óbvio"; no clube, com 3G, vira dúvida — e a dúvida vira
 * o mesmo torneio registrado duas vezes.
 *
 * Aparece EMBAIXO no celular, logo acima da barra de navegação, porque é onde
 * o olho já está depois de tocar um botão. No desktop vai para o canto
 * inferior direito, longe do conteúdo.
 *
 * `role="status"` e não `role="alert"`: confirmação de sucesso não deve
 * interromper a leitura de quem usa leitor de tela. Erro usa `alert`.
 */

export type TomAviso = "sucesso" | "erro" | "neutro";

interface Aviso {
  id: number;
  texto: string;
  tom: TomAviso;
}

let fila: Aviso[] = [];
let proximo = 1;
const ouvintes = new Set<() => void>();
const VAZIO: Aviso[] = [];

function avisar() {
  for (const o of ouvintes) o();
}

function dispensar(id: number) {
  fila = fila.filter((a) => a.id !== id);
  avisar();
}

/** Anuncia o resultado de uma ação. Some sozinho; não pede confirmação. */
export function anunciar(texto: string, tom: TomAviso = "sucesso") {
  const id = proximo++;
  // Só um por vez: dois avisos empilhados competem entre si e nenhum é lido.
  fila = [{ id, texto, tom }];
  avisar();
  setTimeout(() => dispensar(id), tom === "erro" ? 6000 : 3400);
}

const COR: Record<TomAviso, string> = {
  sucesso: "var(--color-positivo)",
  erro: "var(--color-negativo)",
  neutro: "var(--color-ink-secondary)",
};

const GLIFO: Record<TomAviso, string> = { sucesso: "✓", erro: "!", neutro: "·" };

/**
 * Liga a camada de nuvem aos avisos.
 *
 * `definirTratadorDeFalha` existia desde que a nuvem passou a relançar erros,
 * mas ninguém a chamava: a falha ia para o `console` e o jogador não ficava
 * sabendo de nada. A mensagem que ela manda já diz a verdade inteira — o que
 * falhou, que está gravado no aparelho e que sobe sozinho —, então aqui basta
 * mostrá-la.
 */
export function AvisosDaNuvem() {
  useEffect(() => {
    definirTratadorDeFalha((erro) => anunciar(erro, "erro"));
  }, []);
  return null;
}

export function Avisos() {
  const avisos = useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => fila,
    () => VAZIO,
  );

  // Um aviso preso na tela depois de uma navegação vira ruído; a fila é do
  // momento, não do histórico.
  useEffect(() => () => void (fila = []), []);

  if (!avisos.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center px-4 sm:inset-x-auto sm:right-6 sm:items-end"
      style={{
        // No celular a barra de navegação ocupa a base; o aviso senta em cima
        // dela em vez de escondê-la.
        paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
      }}
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          role={a.tom === "erro" ? "alert" : "status"}
          className="subir placa pointer-events-auto flex w-full max-w-[26rem] items-start gap-2.5 px-4 py-3"
          style={{ boxShadow: "var(--sombra-flutuante)" }}
        >
          <span
            aria-hidden
            className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full text-[12px] font-bold"
            style={{
              color: COR[a.tom],
              background: `color-mix(in oklab, ${COR[a.tom]} 16%, transparent)`,
            }}
          >
            {GLIFO[a.tom]}
          </span>
          <p className="texto-legenda min-w-0 flex-1 text-ink">{a.texto}</p>
          <button
            type="button"
            onClick={() => dispensar(a.id)}
            aria-label="Dispensar aviso"
            className="-my-1 -mr-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-faint transition-colors duration-200 hover:bg-realce hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
