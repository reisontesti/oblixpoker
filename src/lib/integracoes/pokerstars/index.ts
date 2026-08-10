import { ler, reconhece } from "@/lib/integracoes/pokerstars/parser";
import type { Conector } from "@/lib/integracoes/tipos";

/**
 * PokerStars — a única sala com parser de verdade hoje.
 *
 * É a candidata natural para o primeiro: a sala DOCUMENTA como salvar o
 * histórico de mãos e como pedir o histórico de um torneio, e o arquivo sai
 * pelo próprio cliente, pelo próprio jogador. Nada aqui contorna nada.
 */
export const pokerstars: Conector = {
  info: {
    chave: "pokerstars",
    nome: "PokerStars",
    estado: "disponivel",
    metodos: ["historico_de_maos", "historico_de_torneios"],
    politica: {
      permitidos: ["historico_de_maos", "historico_de_torneios"],
      // Assistência durante o jogo é o que separa estudo de trapaça, e é o que
      // as salas punem com a conta. O Oblix não tem esse modo — nem como
      // opção desligada.
      proibidos: ["api", "oauth"],
      restringeTerceiros: true,
      observacao:
        "O PokerStars documenta como salvar o histórico de mãos e como pedir o histórico de um torneio. O Oblix lê o arquivo depois do jogo; nunca durante.",
      fonte: "pokerstars.com — Ajuda › Salvar históricos de mãos",
    },
    comoExportar: [
      "No cliente do PokerStars, abra Configurações › Histórico de mãos e marque “Salvar meu histórico de mãos”.",
      "Os arquivos ficam na pasta HandHistory, dentro da pasta do PokerStars, separados por conta e por dia.",
      "Para um torneio específico, use Requisitar histórico de torneio no menu de torneios — a sala envia por e-mail.",
      "Arraste o arquivo .txt aqui. Ele não sai do seu aparelho: a leitura acontece no navegador.",
    ],
    extensoes: [".txt"],
  },
  reconhece,
  ler,
};
