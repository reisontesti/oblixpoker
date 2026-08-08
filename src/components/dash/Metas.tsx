"use client";

import { useState } from "react";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import { definirMeta, restaurarMetas } from "@/lib/data/repositorio";
import type { EstadoMeta, MetaCalculada } from "@/lib/painel";

const ESTADO: Record<EstadoMeta, { rotulo: string; cor: string; icone: string }> = {
  concluida: { rotulo: "Concluída", cor: "var(--color-positivo)", icone: "✓" },
  no_ritmo: { rotulo: "No ritmo", cor: "var(--color-positivo)", icone: "→" },
  atencao: { rotulo: "Atrás do ritmo", cor: "var(--color-atencao)", icone: "!" },
  // Quem ainda não registrou nada não está atrasado — não começou. Acusar
  // atraso em âmbar no primeiro minuto de uso é o produto repreendendo alguém
  // por não ter jogado ainda, e o âmbar perde o significado quando é o estado
  // padrão de todo mundo.
  nao_comecou: { rotulo: "A começar", cor: "var(--color-ink-muted)", icone: "·" },
};

/**
 * As metas do ano, e o lugar onde o jogador escolhe os alvos delas.
 *
 * A edição é no próprio cartão, não numa página à parte: quem decide mudar um
 * alvo é justamente quem acabou de olhar o progresso, e mandar essa pessoa
 * para outra tela quebraria o pensamento no meio.
 *
 * O que se edita é só o ALVO e se a meta está valendo. O valor atingido
 * continua saindo dos registros — é o que impede a meta de virar um checkbox
 * que alguém marca sozinho.
 */
export function Metas({ metas, atraso = 0 }: { metas: MetaCalculada[]; atraso?: number }) {
  const [editando, setEditando] = useState(false);

  const visiveis = metas.filter((m) => m.ativa);
  const concluidas = visiveis.filter((m) => m.estado === "concluida").length;
  const desligadas = metas.length - visiveis.length;

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Metas do ano"
        descricao={
          editando
            ? "Defina o alvo de cada uma. O progresso continua vindo dos seus registros."
            : concluidas
              ? `${concluidas} de ${visiveis.length} já conquistadas`
              : "O progresso que não aparece no extrato"
        }
        acessorio={
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="-my-2 flex min-h-[var(--toque)] cursor-pointer items-center rounded-lg px-2.5 text-[12px] font-medium text-ink-secondary transition-colors duration-200 hover:bg-realce hover:text-ink"
          >
            {editando ? "Concluir" : "Editar"}
          </button>
        }
      />

      {editando ? (
        <div className="px-6 pb-6 sm:px-7">
          <ul>
            {metas.map((meta) => (
              <LinhaEdicao key={meta.id} meta={meta} />
            ))}
          </ul>
          <button
            type="button"
            onClick={restaurarMetas}
            className="mt-4 cursor-pointer border-t border-hairline pt-3.5 text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            Restaurar os alvos padrão
          </button>
        </div>
      ) : visiveis.length === 0 ? (
        <Vazio
          titulo="Nenhuma meta ligada"
          corpo="As quatro metas do Oblix estão desligadas. Elas medem sozinhas o que você já registra — não custam nenhum trabalho extra para acompanhar."
          acao={{ rotulo: "Escolher metas", aoClicar: () => setEditando(true) }}
        />
      ) : (
        <ul className="px-6 pb-6 sm:px-7">
          {visiveis.map((meta) => {
            const estado = ESTADO[meta.estado];
            return (
              <li
                key={meta.id}
                className="border-t border-hairline py-4 first:border-t-0 first:pt-1"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {meta.titulo}
                    </span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      {meta.detalhe}
                    </span>
                  </span>
                  <span className="numeros-tabulares shrink-0 text-[13px] text-ink-secondary">
                    <span className="font-semibold text-ink">{meta.formatar(meta.atual)}</span>
                    <span className="text-ink-faint"> / {meta.formatar(meta.alvo)}</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-trilho">
                    <div
                      className="h-full rounded-full transition-[width] duration-[1.4s] ease-[var(--ease-out-quint)]"
                      style={{ width: `${meta.progresso * 100}%`, background: estado.cor }}
                    />
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium"
                    style={{ color: estado.cor }}
                  >
                    <span aria-hidden className="text-[9px]">
                      {estado.icone}
                    </span>
                    {estado.rotulo}
                  </span>
                </div>
              </li>
            );
          })}

          {desligadas > 0 && (
            <li className="border-t border-hairline pt-3.5 text-[12px] text-ink-muted">
              {desligadas === 1 ? "1 meta desligada" : `${desligadas} metas desligadas`}.
            </li>
          )}
        </ul>
      )}
    </Placa>
  );
}

function LinhaEdicao({ meta }: { meta: MetaCalculada }) {
  // O campo guarda texto, e não número: durante a digitação existe o estado
  // "vazio", e coagir para zero faria o alvo saltar sozinho a cada tecla
  // apagada. O valor só vira número na hora de gravar.
  const [texto, setTexto] = useState(String(meta.alvo));
  const [alvoVisto, setAlvoVisto] = useState(meta.alvo);

  // Quando o alvo muda por fora — "restaurar padrões" é o caso real —, o campo
  // precisa acompanhar. Sem isso ele continuaria exibindo o número antigo sobre
  // um valor já gravado como outro, que é a pior combinação possível: o
  // formulário mentindo sobre o próprio estado.
  //
  // A comparação com o texto atual evita atropelar quem está no meio da
  // digitação, quando "8," ainda não virou "8,5".
  if (meta.alvo !== alvoVisto) {
    setAlvoVisto(meta.alvo);
    if (Number(texto.replace(",", ".")) !== meta.alvo) setTexto(String(meta.alvo));
  }

  const gravar = (bruto: string, ativa = meta.ativa) => {
    const valor = Number(bruto.replace(",", "."));
    if (!Number.isFinite(valor) || valor < meta.editar.minimo) return;
    const limitado = meta.editar.maximo ? Math.min(valor, meta.editar.maximo) : valor;
    definirMeta(meta.id, limitado, ativa);
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-hairline py-3.5 first:border-t-0 first:pt-1">
      <label className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{meta.editar.rotulo}</span>
        <span className="block text-[12px] text-ink-muted">
          Você está em {meta.formatar(meta.atual)}
        </span>
      </label>

      <span className="relative flex items-center">
        {meta.editar.prefixo && (
          <span className="pointer-events-none absolute left-3 text-[12.5px] text-ink-muted">
            {meta.editar.prefixo}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          aria-label={`Alvo de ${meta.editar.rotulo}`}
          value={texto}
          step={meta.editar.passo}
          min={meta.editar.minimo}
          max={meta.editar.maximo}
          disabled={!meta.ativa}
          onChange={(e) => {
            setTexto(e.target.value);
            gravar(e.target.value);
          }}
          onBlur={() => setTexto(String(meta.alvo))}
          className={`numeros-tabulares w-28 rounded-xl border border-hairline bg-sunken py-2 text-[13.5px] text-ink transition-colors duration-200 hover:border-hairline-strong focus:border-[var(--color-positivo)] focus:outline-none disabled:opacity-40 ${
            meta.editar.prefixo ? "pl-9 pr-3" : "px-3"
          } [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={meta.ativa}
        aria-label={`${meta.ativa ? "Desligar" : "Ligar"} a meta ${meta.editar.rotulo}`}
        onClick={() => gravar(texto, !meta.ativa)}
        className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
          meta.ativa ? "bg-[var(--color-positivo)]" : "bg-trilho"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1 size-4 rounded-full bg-plane transition-[left] duration-200 ${
            meta.ativa ? "left-5" : "left-1"
          }`}
        />
      </button>
    </li>
  );
}
