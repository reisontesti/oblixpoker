"use client";

import { useState } from "react";
import { FormularioJogador } from "@/components/jogadores/FormularioJogador";
import { anunciar } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmar";
import { Vazio } from "@/components/ui/Vazio";
import { NotaRapida } from "@/components/jogadores/NotaRapida";
import { SeloPerfil } from "@/components/jogadores/SeloPerfil";
import { Segmentado } from "@/components/ui/Segmentado";
import { alternarNaMesa, ehRegistroProprio, removerJogador } from "@/lib/data/repositorio";
import { haQuantoTempo, moedaComSinal } from "@/lib/format";
import { frescor, PERFIL_META, ROTULO_NOTA } from "@/lib/jogadores";
import { useRegistros } from "@/lib/painel";
import { ROTULO_PERFIL, type Jogador } from "@/lib/types";

type Ordem = "nome" | "confrontos" | "revisao";

function Linha({
  jogador,
  naMesa,
  aoEditar,
  aoRemover,
}: {
  jogador: Jogador;
  naMesa: boolean;
  aoEditar: () => void;
  aoRemover: () => void;
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
              <span className="text-[12px]" style={{ color: "var(--color-atencao)" }}>
                ! leitura antiga
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
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

        <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
          <button
            type="button"
            onClick={() => alternarNaMesa(jogador.id)}
            aria-pressed={naMesa}
            className={`min-h-[var(--toque)] flex-1 cursor-pointer rounded-xl border px-3.5 text-[13px] font-medium transition-colors duration-200 sm:flex-none ${
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
            className="min-h-[var(--toque)] cursor-pointer rounded-xl px-3.5 text-[13px] text-ink-muted transition-colors duration-200 hover:bg-realce hover:text-ink"
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
                    <p className="text-[12px] tracking-wide text-ink-muted">
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
            <div className="flex flex-wrap items-center gap-1 border-t border-hairline pt-2">
              <Botao tom="discreto" aoClicar={() => setAnotando(true)}>
                <span style={{ color: "var(--color-positivo)" }}>Anotar</span>
              </Botao>
              <Botao tom="discreto" aoClicar={aoEditar}>
                Editar leitura
              </Botao>
              {ehRegistroProprio(jogador.id) && (
                <div className="ml-auto">
                  <Botao tom="discreto" aoClicar={aoRemover}>
                    Remover
                  </Botao>
                </div>
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
  const { dialogo, confirmar } = useConfirmacao();

  const lista = registros.jogadores
    .filter((j) => {
      // Busca pelo RÓTULO, não pela chave: ninguém digita "pao_duro".
      const alvo = `${j.nome} ${j.clube} ${ROTULO_PERFIL[j.perfil]}`.toLowerCase();
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
          <h1 className="texto-display text-ink">Banco de jogadores</h1>
          <p className="texto-apoio mt-1.5 text-ink-secondary">
            {registros.jogadores.length} adversários mapeados
            {desatualizados > 0 && ` · ${desatualizados} com leitura vencida`}
            {registros.mesaAtual.length > 0 && ` · ${registros.mesaAtual.length} na mesa agora`}
          </p>
        </div>

        <div className="flex items-center gap-2 max-sm:w-full">
          <Botao href="/mesa" className="max-sm:flex-1">
            Modo Mesa
          </Botao>
          <Botao
            tom="primario"
            className="max-sm:flex-1"
            aoClicar={() => setEditando("novo")}
          >
            Novo adversário
          </Botao>
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

      {/* Buscar e ordenar uma lista vazia não é uma tarefa. Some enquanto não
          houver ninguém anotado, e volta no primeiro registro. */}
      <div
        className={`surgir mt-6 flex-col gap-3 sm:flex-row sm:items-center ${
          registros.jogadores.length === 0 ? "hidden" : "flex"
        }`}
      >
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, clube ou perfil"
          aria-label="Buscar adversário"
          className="min-h-[var(--toque)] w-full min-w-0 rounded-xl border border-hairline bg-sunken px-3.5 text-[16px] text-ink placeholder:text-ink-faint focus:border-[var(--color-positivo)] focus:outline-none sm:w-auto sm:flex-1 sm:text-[14px]"
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
                aoRemover={() =>
                  confirmar({
                    titulo: `Remover ${j.nome}?`,
                    corpo:
                      "A leitura inteira sai do banco — perfil, explorações, tells e todas as notas de campo. Não há como desfazer.",
                    rotuloAcao: "Remover adversário",
                    aoConfirmar: () => {
                      removerJogador(j.id);
                      anunciar(`${j.nome} saiu do banco.`, "neutro");
                    },
                  })
                }
              />
            ))}
          </ul>
          {lista.length === 0 && (
            <div className="relative">
              <Vazio
                titulo={
                  busca
                    ? "Nenhum adversário com esse nome"
                    : "Seu banco de adversários está vazio"
                }
                corpo={
                  busca
                    ? "Tente outro nome, outro clube ou outro perfil de jogo."
                    : "Uma leitura anotada vale mais que uma lembrada. O Modo Mesa depois mostra, de relance, quem está sentado com você."
                }
                acao={
                  busca ? undefined : { rotulo: "Anotar o primeiro", aoClicar: () => setEditando("novo") }
                }
              />
            </div>
          )}
        </div>
      </div>

      {dialogo}
    </main>
  );
}
