"use client";

import { useState, type ReactNode } from "react";
import { Botao } from "@/components/ui/Botao";
import { Folha } from "@/components/ui/Folha";

/**
 * A pergunta antes do estrago.
 *
 * Apagar torneio, apagar adversário, descartar sessão e zerar a base eram, até
 * aqui, um toque só — e no celular, num botão de 19px, ao lado de "Editar".
 * Nenhuma dessas ações tem desfazer.
 *
 * O botão de confirmar diz o VERBO ("Apagar torneio"), nunca "OK": quem lê só
 * os botões precisa acertar mesmo assim. E o cancelar vem primeiro na ordem de
 * leitura da folha, porque é a saída segura.
 */
export function useConfirmacao() {
  const [pedido, setPedido] = useState<{
    titulo: string;
    corpo: string;
    rotuloAcao: string;
    aoConfirmar: () => void;
  } | null>(null);

  const dialogo: ReactNode = pedido ? (
    <Folha
      titulo={pedido.titulo}
      descricao={pedido.corpo}
      largura="estreita"
      aoFechar={() => setPedido(null)}
      rodape={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Botao tom="discreto" aoClicar={() => setPedido(null)}>
            Cancelar
          </Botao>
          <Botao
            tom="perigo"
            aoClicar={() => {
              pedido.aoConfirmar();
              setPedido(null);
            }}
          >
            {pedido.rotuloAcao}
          </Botao>
        </div>
      }
    >
      <span className="sr-only">Esta ação não pode ser desfeita.</span>
    </Folha>
  ) : null;

  return { dialogo, confirmar: setPedido };
}
