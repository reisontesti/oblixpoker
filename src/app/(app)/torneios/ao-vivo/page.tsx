"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cronometro } from "@/components/torneios/Cronometro";
import { EscalaEnergia } from "@/components/torneios/EscalaEnergia";
import { CurvaSessao } from "@/components/viz/CurvaSessao";
import { CampoNumero, CampoTextoLongo } from "@/components/ui/Campo";
import { Vazio } from "@/components/ui/Vazio";
import {
  descartarSessao,
  encerrarSessao,
  registrarParada,
  removerParada,
} from "@/lib/data/repositorio";
import { bigBlinds, curvaSessao, lerSessao, minutosDesdeInicio } from "@/lib/calc/sessao";
import { decimal, duracao, moeda, ordinal } from "@/lib/format";
import { useRegistros } from "@/lib/painel";
import { ROTULO_ENERGIA, type NivelEnergia } from "@/lib/types";
import { anunciar } from "@/components/ui/Aviso";

/**
 * O torneio enquanto ele acontece.
 *
 * Esta tela é usada em pé, no intervalo, com dez minutos e uma fila do
 * banheiro. Tudo aqui responde a isso: os campos são opcionais, o formulário
 * cabe numa tela sem rolar, e o botão que importa é grande.
 *
 * Nada é obrigatório porque meia sessão anotada vale mais que nenhuma — um
 * formulário exigente faria o jogador parar de registrar no terceiro intervalo
 * e o gráfico do fim nunca existiria.
 */
export default function AoVivo() {
  const router = useRouter();
  const { sessao } = useRegistros();
  const [anotando, setAnotando] = useState(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  if (!sessao) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
        <div className="placa grao relative overflow-hidden">
          <div aria-hidden className="grao-camada rounded-[20px]" />
          <Vazio
            titulo="Nenhum torneio em andamento"
            corpo="A sessão ao vivo acompanha o torneio enquanto ele acontece: você marca como chegou, inicia quando a primeira mão é distribuída e registra o seu stack a cada intervalo."
            acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
          />
        </div>
      </main>
    );
  }

  const curva = curvaSessao(sessao);
  const ultima = curva.at(-1);
  // Relógio REAL, e não o `hoje` do painel: na demonstração aquele é a data
  // congelada do seed, e um torneio que está acontecendo agora não pertence à
  // linha do tempo da base — pertence ao relógio de quem está jogando.
  const leitura = lerSessao(sessao, new Date());
  const encerrada = sessao.finalizadaEm !== null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
      <header className="surgir flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="rotulo">Em andamento</p>
          <h1 className="mt-1.5 truncate text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">
            {sessao.preparo.nome}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-secondary">
            {sessao.preparo.clube} · {moeda(sessao.preparo.buyIn)} ·{" "}
            {sessao.preparo.jogadores} jogadores · chegou{" "}
            {ROTULO_ENERGIA[sessao.energiaInicial].toLowerCase()}
          </p>
        </div>
        <Link
          href="/torneios"
          className="shrink-0 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          Sair sem fechar
        </Link>
      </header>

      {/* O cronômetro é a figura herói desta tela: é o dado que muda sozinho e
          o que o jogador quer ver de relance ao desbloquear o celular. */}
      <section className="placa grao surgir relative mt-6 overflow-hidden">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_16%,transparent),transparent)] blur-2xl"
        />
        <div className="relative px-6 py-7 text-center sm:px-8">
          <p className="text-[clamp(2.5rem,11vw,3.75rem)] leading-none font-semibold text-ink">
            <Cronometro desde={sessao.iniciadaEm} ate={sessao.finalizadaEm} />
          </p>
          <p className="mt-2 text-[12.5px] text-ink-muted">
            {encerrada ? "Torneio encerrado" : "de torneio"}
          </p>

          {ultima && (
            <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <dt className="rotulo">Último stack</dt>
                <dd className="numeros-tabulares mt-1 text-[19px] font-medium text-ink">
                  {ultima.bb !== null ? `${decimal(ultima.bb, 0)} bb` : "—"}
                </dd>
              </div>
              <div>
                <dt className="rotulo">Posição</dt>
                <dd className="numeros-tabulares mt-1 text-[19px] font-medium text-ink">
                  {ultima.posicao !== null
                    ? ordinal(ultima.posicao)
                    : ultima.parada.jogadoresRestantes
                      ? `${ultima.parada.jogadoresRestantes} restam`
                      : "—"}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {!encerrada && (
        <div className="surgir mt-4">
          {anotando ? (
            <FormularioParada
              sessao={sessao}
              aoFechar={() => setAnotando(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAnotando(true)}
              className="w-full cursor-pointer rounded-2xl bg-[var(--color-positivo)] px-5 py-4 text-[15px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.99]"
            >
              Registrar intervalo
            </button>
          )}
        </div>
      )}

      {/* Trajetória */}
      {curva.length > 0 && (
        <section className="placa grao surgir relative mt-4 overflow-hidden">
          <div aria-hidden className="grao-camada rounded-[20px]" />
          <div className="relative px-5 py-5 sm:px-6">
            <h2 className="rotulo">Trajetória</h2>
            {leitura && (
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{leitura}</p>
            )}

            <div className="mt-4 min-w-0">
              <CurvaSessao pontos={curva} />
            </div>

            <ol className="mt-5 space-y-3 border-t border-hairline pt-4">
              {[...curva].reverse().map((p) => (
                <li key={p.parada.id} className="flex gap-3">
                  <span className="numeros-tabulares w-14 shrink-0 pt-0.5 text-[12px] text-ink-muted">
                    {duracao(Math.round(p.minuto))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px]">
                      {p.bb !== null && (
                        <span className="numeros-tabulares font-medium text-ink">
                          {decimal(p.bb, 0)} bb
                        </span>
                      )}
                      {p.posicao !== null && (
                        <span className="text-ink-secondary">{ordinal(p.posicao)}</span>
                      )}
                      {p.parada.jogadoresRestantes !== null && (
                        <span className="text-ink-muted">
                          {p.parada.jogadoresRestantes} restam
                        </span>
                      )}
                      {p.parada.energia && (
                        <span className="text-ink-muted">
                          {ROTULO_ENERGIA[p.parada.energia].toLowerCase()}
                        </span>
                      )}
                    </span>
                    {p.parada.nota && (
                      <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-secondary">
                        {p.parada.nota}
                      </span>
                    )}
                  </span>
                  {!encerrada && (
                    <button
                      type="button"
                      onClick={() => removerParada(p.parada.id)}
                      aria-label="Apagar este intervalo"
                      className="shrink-0 cursor-pointer text-[12px] text-ink-faint transition-colors duration-200 hover:text-[var(--color-negativo)]"
                    >
                      apagar
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {curva.length === 0 && !encerrada && (
        <p className="surgir mt-4 px-1 text-[12.5px] leading-relaxed text-ink-muted">
          Nenhum intervalo registrado ainda. A cada parada, anote seu stack e os blinds — com
          duas leituras o Oblix já desenha a curva do seu torneio.
        </p>
      )}

      <div className="surgir mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            if (!encerrada) encerrarSessao();
            router.push("/torneios/ao-vivo/fechar");
          }}
          className="flex-1 cursor-pointer rounded-xl border border-hairline bg-raised px-5 py-3 text-[14px] font-semibold text-ink transition-colors duration-200 hover:border-hairline-strong"
        >
          Fui eliminado — registrar resultado
        </button>
        <button
          type="button"
          onClick={() => setConfirmandoDescarte(true)}
          className="cursor-pointer rounded-xl border border-hairline px-4 py-3 text-[13px] font-medium text-ink-muted transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
        >
          Descartar
        </button>
      </div>

      {confirmandoDescarte && (
        <div className="surgir mt-3 rounded-xl border border-hairline bg-sunken p-4">
          <p className="text-[13px] text-ink">
            Descartar apaga esta sessão e os {sessao.paradas.length}{" "}
            {sessao.paradas.length === 1 ? "intervalo" : "intervalos"} registrados. O torneio não
            entra na sua banca.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                descartarSessao();
                anunciar("Sessão descartada.", "neutro");
                router.push("/torneios");
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-[12.5px] font-medium"
              style={{ color: "var(--color-negativo)" }}
            >
              Sim, descartar
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoDescarte(false)}
              className="cursor-pointer rounded-lg px-3 py-2 text-[12.5px] text-ink-secondary hover:text-ink"
            >
              Continuar jogando
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FormularioParada({
  sessao,
  aoFechar,
}: {
  sessao: NonNullable<ReturnType<typeof useRegistros>["sessao"]>;
  aoFechar: () => void;
}) {
  const anterior = sessao.paradas.at(-1) ?? null;
  const [fichas, setFichas] = useState<number | null>(null);
  // O blind quase nunca muda de intervalo para intervalo tanto quanto o stack,
  // e repetir o último poupa a digitação mais chata da tela.
  const [blind, setBlind] = useState<number | null>(anterior?.blind ?? null);
  const [posicao, setPosicao] = useState<number | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [energia, setEnergia] = useState<NivelEnergia>(anterior?.energia ?? sessao.energiaInicial);
  const [nota, setNota] = useState("");

  const bbAgora = bigBlinds({
    id: "",
    em: "",
    fichas,
    blind,
    posicao: null,
    jogadoresRestantes: null,
    energia: null,
    nota: "",
  });

  return (
    <div className="placa grao relative overflow-hidden">
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Intervalo em {duracao(Math.round(minutosDesdeInicio(sessao, new Date().toISOString())))}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            Cancelar
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Preencha só o que souber. Nada aqui é obrigatório — meia sessão anotada vale mais que
          nenhuma.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero
            rotulo="Fichas"
            valor={fichas}
            aoMudar={setFichas}
            min={0}
            placeholder="42000"
          />
          <CampoNumero
            rotulo="Big blind"
            dica={bbAgora !== null ? `Dá ${decimal(bbAgora, 0)} blinds` : "Fichas ÷ blind = stack"}
            valor={blind}
            aoMudar={setBlind}
            min={0}
            placeholder="800"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero
            rotulo="Sua posição"
            dica="Se o clube mostra"
            valor={posicao}
            aoMudar={setPosicao}
            min={1}
            placeholder="34"
          />
          <CampoNumero
            rotulo="Jogadores restantes"
            valor={restantes}
            aoMudar={setRestantes}
            min={1}
            placeholder="120"
          />
        </div>

        <EscalaEnergia valor={energia} aoMudar={setEnergia} />

        <CampoTextoLongo
          rotulo="O que aconteceu"
          dica="A leitura que você vai querer reler depois"
          valor={nota}
          aoMudar={setNota}
          linhas={2}
          placeholder="Dobrei com AK contra o short. Mesa nova, dois regulares à minha esquerda."
        />

        <button
          type="button"
          onClick={() => {
            registrarParada({
              fichas,
              blind,
              posicao,
              jogadoresRestantes: restantes,
              energia,
              nota: nota.trim(),
            });
            aoFechar();
          }}
          className="w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3 text-[14px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.99]"
        >
          Salvar intervalo
        </button>
      </div>
    </div>
  );
}
