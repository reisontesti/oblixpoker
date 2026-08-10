import type { Conector } from "@/lib/integracoes/tipos";

/**
 * Suprema Poker — registrada, sem parser.
 *
 * Não há formato de exportação documentado que eu pudesse implementar e
 * TESTAR. Escrever um parser para um formato adivinhado seria o pior resultado
 * possível: ele leria alguma coisa, produziria números, e ninguém saberia que
 * estão errados.
 *
 * A arquitetura já aceita a sala. Falta o arquivo de verdade.
 */
export const suprema: Conector = {
  info: {
    chave: "suprema",
    nome: "Suprema Poker",
    estado: "em_desenvolvimento",
    metodos: [],
    politica: {
      permitidos: [],
      proibidos: ["api", "oauth"],
      restringeTerceiros: false,
      observacao:
        "Ainda não há um formato de exportação que o Oblix consiga ler com segurança. Nada de login automatizado nem de engenharia reversa do aplicativo.",
    },
    extensoes: [],
  },
};
