"use client";

import Link from "next/link";
import { useState } from "react";
import { FormularioJogador } from "@/components/jogadores/FormularioJogador";
import { NotaRapida } from "@/components/jogadores/NotaRapida";
import { SeloPerfil } from "@/components/jogadores/SeloPerfil";
import { Segmentado } from "@/components/ui/Segmentado";
import { alternarNaMesa, ehRegistroProprio, removerJogador } from "@/lib/data/repositorio";
import { haQuantoTempo, moedaComSinal } from "@/lib/format";
import { frescor, PERFIL_META, ROTULO_NOTA } from "@/lib/jogadores";
import { useRegistros } from "@/lib/painel";
import type { Jogador } from "@/lib/types";

type Ordem = "nome" | "confrontos" | "revisao";

function Linha({
  jogador,
  naMesa,
  aoEditar,
}: {
  jogador: Jogador;
  naMesa: boolean;
  aoEditar: () => void;
}) {
  const { hoje } = useRegistros();
  const [aberto, setAberto] = useState(false);
  const [anotando, setAnotando] = useState(false);
  const meta = PERFIL_META[jogador.perfil];
  const idade = frescor(jogador.atualizadoEm, hoje);

  return (
    <li className="border-t border-hairline first:border-t-0">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-[14.5px] font-medium text-ink">{jogador.nome}</h3>
            <SeloPerfil perfil={jogador.perfil} />
            {idade.estado === "vencida" && (
              <span className="text-[10.5px]" style={{ color: "var(--color-atencao)" }}>
                ! leitura antiga
              </span>
            )}
          </div>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            {jogador.clube} · {jogador.confrontos} confrontos ·{" "}
            <span
              style={{
                color:
                  jogador.saldoConfrontos >= 0
                    ? "var(--color-positivo)"
                    : "var(--color-negativo)",
              }}
            >
              {moedaComSinal(jogador.saldoConfrontos)}
            </span>{" "}
            · revisado {haQuantoTempo(jogador.atualizadoEm, hoje)}
          </p>
          {jogador.exploracoes[0] && (
            <p className="mt-2 flex gap-2 text-[13px] leading-snug text-ink-secondary">
              <span aria-hidden className="shrink-0 text-ink-faint">
                →
              </span>
              {jogador.exploracoes[0]}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => alternarNaMesa(jogador.id)}
            aria-pressed={naMesa}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ${
              naMesa
                ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
                : "border-hairline text-ink-secondary hover:border-hairline-strong hover:text-ink"
            }`}
          >
            {naMesa ? "Na mesa" : "Pôr na mesa"}
          </button>
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            {aberto ? "Menos" : "Detalhes"}
          </button>
        </div>
      </div>

      {aberto && (
        <div className="surgir space-y-4 px-5 pb-5 sm:px-6">
          <p className="text-[12.5px] leading-relaxed text-ink-secondary">{meta.descricao}</p>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { titulo: "Como explorar", itens: jogador.exploracoes },
              { titulo: "Pontos fracos", itens: jogador.pontosFracos },
              { titulo: "Tells", itens: jogador.tells },
            ].map((bloco) => (
              <div key={bloco.titulo}>
                <p className="rotulo">{bloco.titulo}</p>
                {bloco.itens.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {bloco.itens.map((i) => (
                      <li key={i} className="text-[12.5px] leading-snug text-ink-secondary">
                        {i}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[12px] text-ink-faint">Nada anotado ainda</p>
                )}
              </div>
            ))}
          </div>

          {jogador.notas.length > 0 && (
            <div>
              <p className="rotulo">Registro de campo</p>
              <ul className="mt-2 space-y-2.5">
                {jogador.notas.map((n) => (
                  <li key={n.id} className="border-l border-hairline pl-3">
                    <p className="text-[10.5px] tracking-wide text-ink-muted">
                      {ROTULO_NOTA[n.tipo]} · {haQuantoTempo(n.data, hoje)}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
                      {n.texto}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {anotando ? (
            <NotaRapida idJogador={jogador.id} aoSalvar={() => setAnotando(false)} />
          ) : (
            <div className="flex flex-wrap items-center gap-4 border-t border-hairline pt-3">
              <button
                type="button"
                onClick={() => setAnotando(true)}
                className="cursor-pointer text-[12.5px] font-medium text-[var(--color-positivo)] transition-opacity duration-200 hover:opacity-80"
              >
                Anotar
              </button>
              <button
                type="button"
                onClick={aoEditar}
                className="cursor-pointer text-[12.5px] text-ink-secondary transition-colors duration-200 hover:text-ink"
              >
                Editar leitura
              </button>
              {ehRegistroProprio(jogador.id) && (
                <button
                  type="button"
                  onClick={() => removerJogador(jogador.id)}
                  className="ml-auto cursor-pointer text-[12.5px] text-ink-faint transition-colors duration-200 hover:text-[var(--color-negativo)]"
                >
                  Remover
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function Jogadores() {
  const registros = useRegistros();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  const [editando, setEditando] = useState<Jogador | "novo" | null>(null);

  const lista = registros.jogadores
    .filter((j) => {
      const alvo = `${j.nome} ${j.clube} ${j.perfil}`.toLowerCase();
      return alvo.includes(busca.trim().toLowerCase());
    })
    .sort((a, b) => {
      if (ordem === "confrontos") return b.confrontos - a.confrontos;
      if (ordem === "revisao") return b.atualizadoEm.localeCompare(a.atualizadoEm);
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

  const desatualizados = registros.jogadores.filter(
    (j) => frescor(j.atualizadoEm, registros.hoje).estado === "vencida",
  ).length;

  return (
    <main className="mx-auto w-full max-w-[76rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
            Banco de jogadores
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-secondary">
            {registros.jogadores.length} adversários mapeados
            {desatualizados > 0 && ` · ${desatualizados} com leitura vencida`}
            {registros.mesaAtual.length > 0 && ` · ${registros.mesaAtual.length} na mesa agora`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mesa"
            className="rounded-xl border border-hairline px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong hover:bg-white/4"
          >
            Modo Mesa
          </Link>
          <button
            type="button"
            onClick={() => setEditando("novo")}
            className="cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
          >
            Novo adversário
          </button>
        </div>
      </header>

      {editando && (
        <div className="surgir mt-6">
          <FormularioJogador
            jogador={editando === "novo" ? undefined : editando}
            aoConcluir={() => setEditando(null)}
            aoCancelar={() => setEditando(null)}
          />
        </div>
      )}

      <div className="surgir mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, clube ou perfil"
          aria-label="Buscar adversário"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-sunken px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-[var(--color-positivo)] focus:outline-none"
        />
        <Segmentado
          rotuloAcessivel="Ordenar adversários"
          valor={ordem}
          aoMudar={setOrdem}
          opcoes={[
            { valor: "nome", rotulo: "Nome" },
            { valor: "confrontos", rotulo: "Confrontos" },
            { valor: "revisao", rotulo: "Revisão" },
          ]}
        />
      </div>

      <div className="mt-4">
        <div className="placa grao relative overflow-hidden">
          <div aria-hidden className="grao-camada rounded-[20px]" />
          <ul className="relative">
            {lista.map((j) => (
              <Linha
                key={j.id}
                jogador={j}
                naMesa={registros.mesaAtual.includes(j.id)}
                aoEditar={() => setEditando(j)}
              />
            ))}
          </ul>
          {lista.length === 0 && (
            <p className="relative px-6 py-12 text-center text-[13.5px] text-ink-muted">
              Nenhum adversário encontrado.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
