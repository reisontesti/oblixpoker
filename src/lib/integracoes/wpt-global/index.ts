import type { Conector } from "@/lib/integracoes/tipos";

/** WPT Global — registrada, sem parser. Mesmo critério da Suprema. */
export const wptGlobal: Conector = {
  info: {
    chave: "wpt-global",
    nome: "WPT Global",
    estado: "em_desenvolvimento",
    metodos: [],
    politica: {
      permitidos: [],
      proibidos: ["api", "oauth"],
      restringeTerceiros: false,
      observacao:
        "Sem formato de exportação confirmado. Quando houver, entra por importação de arquivo — nunca por login automatizado.",
    },
    extensoes: [],
  },
};
