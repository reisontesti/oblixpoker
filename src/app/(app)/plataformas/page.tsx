"use client";

import { useState } from "react";
import { Importar } from "@/components/plataformas/Importar";
import { Botao } from "@/components/ui/Botao";
import { Folha } from "@/components/ui/Folha";
import { Placa } from "@/components/ui/Placa";
import { SALAS } from "@/lib/integracoes/registro";
import { ROTULO_ESTADO, ROTULO_METODO, type Conector } from "@/lib/integracoes/tipos";
import { useRegistros } from "@/lib/painel";

/**
 * Minhas plataformas.
 *
 * A tela existe tanto para oferecer a importação quanto para dizer, sem rodeio,
 * o que ainda não dá. Cada cartão mostra o estado REAL da sala — e o estado é
 * derivado da existência do parser, não de uma etiqueta que alguém escolheu.
 *
 * Nenhum cartão diz "conectar conta". Não há conexão de conta em sala nenhuma
 * hoje, e o botão que promete isso seria a primeira mentira do produto. Onde há
 * caminho, diz "importar dados"; onde não há, diz o que falta.
 */

const COR_DO_ESTADO: Record<string, string> = {
  disponivel: "var(--color-positivo)",
  em_desenvolvimento: "var(--color-atencao)",
  nao_suportado: "var(--color-ink-muted)",
};

function Cartao({
  sala,
  aoDetalhar,
  aoImportar,
}: {
  sala: Conector;
  aoDetalhar: () => void;
  aoImportar: () => void;
}) {
  const pronta = sala.info.estado === "disponivel";

  return (
    <Placa className="flex flex-col p-5 sm:p-6">
      {/* Embrulha: a 1024px, com a lateral de 248px e três colunas, o cartão
          fica com 230px e o selo “Integração em desenvolvimento” empurrava a
          página inteira para o lado. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="texto-subtitulo text-ink">{sala.info.nome}</h2>
        <span
          className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
          style={{
            color: COR_DO_ESTADO[sala.info.estado],
            background: "color-mix(in oklab, currentColor 13%, transparent)",
          }}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {ROTULO_ESTADO[sala.info.estado]}
        </span>
      </div>

      {sala.info.metodos.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {sala.info.metodos.map((m) => (
            <li key={m} className="flex items-center gap-2 text-[13px] text-ink-secondary">
              <span aria-hidden style={{ color: "var(--color-positivo)" }}>
                ✓
              </span>
              {ROTULO_METODO[m]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
          {sala.info.politica.observacao}
        </p>
      )}

      {sala.info.politica.restringeTerceiros && (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
          Esta sala restringe ferramentas de terceiros. Os recursos disponíveis podem variar
          conforme as regras dela — conferir é responsabilidade de quem joga na conta.
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-4">
        {pronta ? (
          <Botao tom="primario" aoClicar={aoImportar}>
            Importar dados
          </Botao>
        ) : (
          <Botao tom="secundario" desabilitado>
            Em breve
          </Botao>
        )}
        <Botao tom="discreto" aoClicar={aoDetalhar}>
          Como funciona
        </Botao>
      </div>
    </Placa>
  );
}

export default function Plataformas() {
  const { observacoes, torneios } = useRegistros();
  const [importando, setImportando] = useState(false);
  const [detalhe, setDetalhe] = useState<Conector | null>(null);

  const importados = new Set(observacoes.map((o) => o.torneioId));
  const maosLidas = observacoes
    .filter((o) => o.adversario === null)
    .reduce((a, o) => a + o.contadores.maos, 0);

  return (
    <main className="mx-auto w-full max-w-[76rem] px-4 py-7 pb-10 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir">
        <h1 className="texto-display text-ink">Minhas plataformas</h1>
        <p className="texto-apoio mt-1.5 max-w-2xl text-ink-secondary">
          Importe o histórico que a sala te dá e o Oblix transforma em banca, estatística e
          leitura de adversário. O arquivo é lido no seu navegador — o texto das mãos não sai
          daqui.
        </p>
      </header>

      {importados.size > 0 && (
        <div className="surgir mt-6 rounded-2xl border border-hairline bg-sunken px-4 py-3">
          <p className="text-[13.5px] text-ink">
            <strong className="font-semibold">
              {importados.size} {importados.size === 1 ? "torneio" : "torneios"}
            </strong>{" "}
            {importados.size === 1 ? "importado" : "importados"} · {maosLidas} mãos suas contadas
            · {torneios.length} torneios no histórico
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {SALAS.map((s) => (
          <Cartao
            key={s.info.chave}
            sala={s}
            aoDetalhar={() => setDetalhe(s)}
            aoImportar={() => setImportando(true)}
          />
        ))}
      </div>

      <p className="surgir mt-8 max-w-3xl text-[12.5px] leading-relaxed text-ink-muted">
        O Oblix é análise DEPOIS do jogo. Ele não abre na mesa, não sugere jogada em tempo real e
        não pede senha de sala nenhuma — quando existir conexão oficial, ela virá por autorização
        do próprio site. Isso não é só política: é o que separa uma ferramenta de estudo de uma
        que faz o jogador perder a conta.
      </p>

      {importando && <Importar aoFechar={() => setImportando(false)} />}

      {detalhe && (
        <Folha
          titulo={`Como conectar ${detalhe.info.nome}`}
          largura="media"
          aoFechar={() => setDetalhe(null)}
        >
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            {detalhe.info.politica.observacao}
          </p>

          {detalhe.info.comoExportar && (
            <ol className="mt-5 space-y-3">
              {detalhe.info.comoExportar.map((passo, i) => (
                <li key={passo} className="flex gap-3 text-[13.5px] leading-relaxed text-ink">
                  <span
                    aria-hidden
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-[12px] text-ink-muted"
                  >
                    {i + 1}
                  </span>
                  {passo}
                </li>
              ))}
            </ol>
          )}

          {detalhe.info.politica.fonte && (
            <p className="mt-5 border-t border-hairline pt-4 text-[12px] text-ink-muted">
              Fonte: {detalhe.info.politica.fonte}
            </p>
          )}

          {detalhe.info.estado === "disponivel" && (
            <Botao
              tom="primario"
              largo
              className="mt-5"
              aoClicar={() => {
                setDetalhe(null);
                setImportando(true);
              }}
            >
              Importar agora
            </Botao>
          )}
        </Folha>
      )}
    </main>
  );
}
