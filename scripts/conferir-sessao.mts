/**
 * Confere a leitura de uma sessão ao vivo.
 *
 * O que está em jogo aqui é o significado do gráfico. Plotar fichas em vez de
 * big blinds faria a curva subir a sessão inteira mesmo com o jogador
 * afundando — os blinds crescem junto —, e o painel estaria medindo a
 * estrutura do torneio em vez do desempenho de alguém. Este teste fixa essa
 * escolha com números que tornam o erro visível.
 */
import { bigBlinds, curvaSessao, duracaoMin, lerSessao, resumirSessao } from "@/lib/calc/sessao";
import type { ParadaSessao, SessaoAoVivo } from "@/lib/types";

let falhas = 0;
function conferir(rotulo: string, esperado: unknown, obtido: unknown) {
  const ok = String(esperado) === String(obtido);
  console.log(`${ok ? "ok   " : "FALHA"}  ${rotulo.padEnd(52)} ${obtido}`);
  if (!ok) {
    falhas++;
    console.log(`        esperado: ${esperado}`);
  }
}

const INICIO = new Date("2026-08-08T19:00:00.000Z");
const emMin = (m: number) => new Date(INICIO.getTime() + m * 60_000).toISOString();

const parada = (
  min: number,
  fichas: number | null,
  blind: number | null,
  restantes: number | null = null,
): ParadaSessao => ({
  id: `p-${min}`,
  em: emMin(min),
  fichas,
  blind,
  posicao: null,
  jogadoresRestantes: restantes,
  energia: null,
  nota: "",
});

const sessao = (paradas: ParadaSessao[], jogadores = 200): SessaoAoVivo => ({
  id: "s1",
  iniciadaEm: INICIO.toISOString(),
  finalizadaEm: null,
  energiaInicial: "descansado",
  preparo: {
    data: "2026-08-08",
    nome: "Main Event",
    clube: "Clube",
    modalidade: "MTT",
    buyIn: 300,
    jogadores,
    via: "direto",
    satelite: null,
  },
  paradas,
  torneioId: null,
});

// ── big blinds ─────────────────────────────────────────────────────────────
conferir("40.000 fichas com blind 500 dá 80 bb", 80, bigBlinds(parada(0, 40000, 500)));
conferir("sem fichas não há stack", null, bigBlinds(parada(0, null, 500)));
conferir("sem blind não há stack", null, bigBlinds(parada(0, 40000, null)));
conferir("blind zero não divide por zero", null, bigBlinds(parada(0, 40000, 0)));

// A armadilha que o teste existe para pegar: MAIS fichas e MENOS stack. Um
// gráfico de fichas mostraria subida onde o jogador está afundando.
const cresceEmFichas = sessao([parada(0, 40000, 500), parada(180, 60000, 4000)]);
const curva = curvaSessao(cresceEmFichas);
conferir("fichas sobem de 40k para 60k", true, 40000 < 60000);
conferir("mas o stack cai de 80 para 15 bb", "80 → 15", `${curva[0].bb} → ${curva[1].bb}`);

// ── campo eliminado ────────────────────────────────────────────────────────
const comCampo = sessao([parada(0, 40000, 500, 200), parada(120, 30000, 2000, 100)]);
const cc = curvaSessao(comCampo);
conferir("no início ninguém saiu", 0, cc[0].campoEliminado);
conferir(
  "com 100 de 200 restando, metade do campo saiu",
  "0.50",
  cc[1].campoEliminado!.toFixed(2),
);

// ── ordenação ──────────────────────────────────────────────────────────────
// As paradas podem chegar fora de ordem; a curva não pode.
const foraDeOrdem = sessao([parada(120, 30000, 2000), parada(0, 40000, 500), parada(60, 20000, 1000)]);
conferir(
  "curva sai ordenada no tempo",
  "0,60,120",
  curvaSessao(foraDeOrdem).map((p) => p.minuto).join(","),
);

// ── resumo ─────────────────────────────────────────────────────────────────
const AGORA = new Date(INICIO.getTime() + 200 * 60_000);
const r = resumirSessao(
  sessao([parada(0, 40000, 500), parada(90, 9000, 1000), parada(180, 75000, 2500)]),
  AGORA,
);
conferir("duração corre até agora enquanto não fecha", 200, r.duracaoMin);
conferir("stack inicial", 80, r.bbInicial);
conferir("stack final", 30, r.bbFinal);
conferir("pico", 80, r.bbPico);
conferir("vale", 9, r.bbVale);
conferir("uma passagem pela zona crítica", 1, r.vezesEmZonaCritica);

// Sessão fechada para de contar no relógio.
const fechada: SessaoAoVivo = {
  ...sessao([parada(0, 40000, 500)]),
  finalizadaEm: emMin(150),
};
conferir("sessão fechada congela a duração", 150, duracaoMin(fechada, AGORA));

// ── a frase ────────────────────────────────────────────────────────────────
// Com uma leitura só não há trajetória, e inventar narrativa a partir de um
// ponto é o tipo de conclusão que o resto do Oblix se recusa a tirar.
conferir("uma parada não vira frase", null, lerSessao(sessao([parada(0, 40000, 500)]), AGORA));
conferir(
  "parada sem stack não conta como leitura",
  null,
  lerSessao(sessao([parada(0, null, null), parada(90, null, null)]), AGORA),
);

const subiu = lerSessao(sessao([parada(0, 20000, 1000), parada(120, 100000, 1000)]), AGORA);
conferir("stack que cresce é descrito como construção", true, /construiu stack/.test(subiu ?? ""));

const parado = lerSessao(sessao([parada(0, 40000, 1000), parada(120, 42000, 1000)]), AGORA);
conferir("stack estável não vira narrativa de movimento", true, /quase parado/.test(parado ?? ""));

const voltou = lerSessao(sessao([parada(0, 40000, 500), parada(60, 8000, 1000), parada(120, 60000, 1000)]), AGORA);
conferir("recuperação da zona crítica é destacada", true, /abaixo de 15 blinds/.test(voltou ?? ""));

console.log(falhas === 0 ? "\nLeitura da sessão coerente.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);
