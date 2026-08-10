import type { Conector } from "@/lib/integracoes/tipos";

/**
 * GGPoker — registrada, sem parser.
 *
 * A GGPoker restringe software de terceiros de forma explícita, e a análise
 * dela vive dentro do PokerCraft. Não há aqui raspagem do PokerCraft, login
 * automatizado nem qualquer tentativa de contornar o cliente: se um dia
 * existir exportação que o jogador possa fazer legitimamente, o conector
 * ganha um `ler` e o estado muda sozinho.
 *
 * Até lá o cartão diz "em desenvolvimento", que é a verdade, em vez de
 * "importação disponível", que não é.
 */
export const ggpoker: Conector = {
  info: {
    chave: "ggpoker",
    nome: "GGPoker",
    estado: "em_desenvolvimento",
    metodos: [],
    politica: {
      permitidos: [],
      proibidos: ["api", "oauth"],
      restringeTerceiros: true,
      observacao:
        "A GGPoker restringe ferramentas de terceiros e assistência durante o jogo. O Oblix é análise depois da partida e não faz nada dentro do cliente da sala. Os recursos disponíveis podem variar conforme as regras da plataforma.",
      fonte: "ggpoker.com — termos de uso e política de ferramentas",
    },
    extensoes: [],
  },
};
