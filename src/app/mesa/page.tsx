"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartaoMesa } from "@/components/jogadores/CartaoMesa";
import { SeloPerfil } from "@/components/jogadores/SeloPerfil";
import { alternarNaMesa, definirMesa } from "@/lib/data/repositorio";
import { PERFIL_META, type Risco } from "@/lib/jogadores";
import { useRegistros } from "@/lib/painel";
import type { Jogador } from "@/lib/types";

const GRUPOS: { risco: Risco; titulo: string; nota: string }[] = [
  { risco: "alto", titulo: "Cuidado", nota: "Jogam bem. Potes marginais custam caro aqui." },
  { risco: "medio", titulo: "Imprevisíveis", nota: "Variância alta. Espere mão feita." },
  { risco: "baixo", titulo: "Oportunidade", nota: "É daqui que sai a maior parte do seu lucro." },
];

/** Seletor de quem está sentado — agrupado por clube, com busca. */
function Seletor({
  jogadores,
  naMesa,
  aoAlternar,
  aoFechar,
}: {
  jogadores: Jogador[];
  naMesa: string[];
  aoAlternar: (id: string) => void;
  aoFechar?: () => void;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = jogadores.filter((j) =>
    j.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  const porClube = useMemo(() => {
    const mapa = new Map<string, Jogador[]>();
    for (const j of filtrados) {
      (mapa.get(j.clube) ?? mapa.set(j.clube, []).get(j.clube)!).push(j);
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [filtrados]);

  return (
    <div className="placa grao relative overflow-hidden">
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Quem está na sua mesa?</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              Toque nos adversários presentes. Dá para ajustar a qualquer momento.
            </p>
          </div>
          {aoFechar && (
            <button
              type="button"
              onClick={aoFechar}
              className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              Fechar
            </button>
          )}
        </div>

        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar adversário"
          className="mt-4 w-full rounded-xl border border-hairline bg-sunken px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-[var(--color-positivo)] focus:outline-none"
        />

        <div className="mt-4 space-y-4">
          {porClube.map(([clube, lista]) => (
            <div key={clube}>
              <p className="rotulo">{clube}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lista.map((j) => {
                  const dentro = naMesa.includes(j.id);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => aoAlternar(j.id)}
                      aria-pressed={dentro}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                        dentro
                          ? "border-transparent bg-raised ring-1 ring-[var(--color-positivo)]"
                          : "border-hairline bg-sunken hover:border-hairline-strong"
                      }`}
                    >
                      <span
                        className={`text-[13px] font-medium ${dentro ? "text-ink" : "text-ink-secondary"}`}
                      >
                        {j.nome}
                      </span>
                      <SeloPerfil perfil={j.perfil} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {porClube.length === 0 && (
            <p className="py-6 text-center text-[13px] text-ink-muted">
              Nenhum adversário encontrado.{" "}
              <Link href="/jogadores" className="text-ink underline underline-offset-2">
                Cadastrar no banco
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Mesa() {
  const registros = useRegistros();
  // `null` = seguir o padrão (aberto só com a mesa vazia). Assim que o jogador
  // encosta no seletor ele passa a mandar, e a lista para de fechar sozinha a
  // cada nome escolhido — sentar oito adversários é um gesto só, não oito.
  const [seletorAberto, setSeletorAberto] = useState<boolean | null>(null);

  const naMesa = registros.mesaAtual;
  const presentes = registros.jogadores.filter((j) => naMesa.includes(j.id));
  const mostrarSeletor = seletorAberto ?? presentes.length === 0;

  const alternar = (id: string) => {
    setSeletorAberto(true);
    alternarNaMesa(id);
  };

  const grupos = GRUPOS.map((g) => ({
    ...g,
    jogadores: presentes.filter((j) => PERFIL_META[j.perfil].risco === g.risco),
  })).filter((g) => g.jogadores.length > 0);

  return (
    <main className="mx-auto w-full max-w-[76rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="texto-display text-ink">
            Modo Mesa
          </h1>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-secondary">
            {presentes.length === 0
              ? "Monte a mesa e o Oblix mostra, de relance, o que fazer contra cada adversário sentado com você."
              : `${presentes.length} ${presentes.length === 1 ? "adversário" : "adversários"} na mesa. As leituras ficam à mão enquanto a mão corre.`}
          </p>
        </div>

        {presentes.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSeletorAberto(!mostrarSeletor)}
              className="cursor-pointer rounded-xl border border-hairline px-4 py-2 text-[13px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong hover:bg-realce"
            >
              {mostrarSeletor ? "Fechar" : "Ajustar mesa"}
            </button>
            <button
              type="button"
              onClick={() => {
                definirMesa([]);
                setSeletorAberto(null);
              }}
              className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-[var(--color-negativo)]"
            >
              Encerrar
            </button>
          </div>
        )}
      </header>

      {mostrarSeletor && (
        <div className="surgir mt-6">
          <Seletor
            jogadores={registros.jogadores}
            naMesa={naMesa}
            aoAlternar={alternar}
            aoFechar={presentes.length > 0 ? () => setSeletorAberto(false) : undefined}
          />
        </div>
      )}

      {grupos.length > 0 && (
        <div className="mt-6 space-y-7">
          {grupos.map((grupo, gi) => (
            <section key={grupo.risco} className="surgir" style={{ animationDelay: `${gi * 70}ms` }}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="rotulo">{grupo.titulo}</h2>
                <p className="text-[12px] text-ink-muted">{grupo.nota}</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {grupo.jogadores.map((j) => (
                  <CartaoMesa key={j.id} jogador={j} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
