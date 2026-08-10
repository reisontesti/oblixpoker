import type { Conector } from "@/lib/integracoes/tipos";

/**
 * Bodog — registrada, sem parser.
 *
 * A Bodog usa mesas anônimas, o que muda a natureza do que o Oblix poderia
 * oferecer mesmo com arquivo em mãos: sem identidade de adversário, o banco de
 * jogadores não tem o que acumular. Bankroll e resultado continuariam valendo.
 */
export const bodog: Conector = {
  info: {
    chave: "bodog",
    nome: "Bodog",
    estado: "em_desenvolvimento",
    metodos: [],
    politica: {
      permitidos: [],
      proibidos: ["api", "oauth"],
      restringeTerceiros: false,
      observacao:
        "Sem formato de exportação confirmado. As mesas são anônimas: mesmo com arquivo, o banco de adversários não teria a quem acumular leitura — bankroll e resultado, sim.",
    },
    extensoes: [],
  },
};
