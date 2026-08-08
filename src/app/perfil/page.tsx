"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { anunciar } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { CampoNumero, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmar";
import { Placa } from "@/components/ui/Placa";
import { usarModo, atualizarPerfil } from "@/lib/data/repositorio";
import { prepararFoto } from "@/lib/foto";
import { useRegistros } from "@/lib/painel";
import {
  MODALIDADES,
  OBJETIVOS,
  ROTULO_OBJETIVO,
  type Modalidade,
  type Objetivo,
  type Perfil,
} from "@/lib/types";

/**
 * Quem é o jogador dentro do Oblix.
 *
 * A tela existia só como um passo do onboarding: depois de preencher uma vez,
 * não havia como corrigir um nome digitado errado nem trocar o buy-in padrão
 * que alimenta a recomendação de satélites. Um dado que o produto usa para
 * decidir e o jogador não pode revisar é um dado que vai ficar errado.
 *
 * Salva ao tocar "Salvar", e não a cada tecla: o campo de nome sincroniza com
 * a nuvem, e gravar por caractere seria uma requisição por letra.
 *
 * Na demonstração tudo aparece em leitura, com o caminho de saída à vista. O
 * perfil é do Rafael Antunes, que não existe; deixar editar criaria a
 * expectativa de que o resto da base também é do jogador.
 */

export default function TelaPerfil() {
  const { perfil, modo, temPerfilProprio, hoje } = useRegistros();
  const demo = modo === "demonstracao";

  const [rascunho, setRascunho] = useState<Perfil>(perfil);
  const [origem, setOrigem] = useState<Perfil>(perfil);
  const [sujo, setSujo] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const { dialogo, confirmar } = useConfirmacao();

  // O perfil pode mudar por baixo — entrar na conta troca a base inteira, e a
  // sincronização devolve o que estava no servidor. Um rascunho intocado deve
  // acompanhar; um rascunho editado não, senão a chegada dos dados apagaria o
  // que a pessoa está digitando.
  //
  // Ajustado durante o render e não num efeito: o efeito só rodaria DEPOIS de
  // pintar o perfil velho, e o campo piscaria o nome antigo antes de trocar.
  if (origem !== perfil) {
    setOrigem(perfil);
    if (!sujo) setRascunho(perfil);
  }

  const editar = <K extends keyof Perfil>(chave: K, valor: Perfil[K]) => {
    setRascunho((p) => ({ ...p, [chave]: valor }));
    setSujo(true);
  };

  const nomeVazio = rascunho.nome.trim().length === 0;

  function salvar() {
    if (nomeVazio) return;
    atualizarPerfil({ ...rascunho, nome: rascunho.nome.trim(), nick: rascunho.nick.trim() });
    setSujo(false);
    anunciar("Perfil atualizado.");
  }

  async function escolherFoto(f: File | undefined) {
    if (!f) return;
    setErroFoto(null);
    const r = await prepararFoto(f);
    if ("erro" in r) return setErroFoto(r.erro);
    // A foto salva na hora. É a única edição desta tela sem passo de
    // confirmação, porque o resultado dela é a própria confirmação: a pessoa
    // vê o rosto no lugar do círculo e sabe que deu certo.
    atualizarPerfil({ ...perfil, foto: r.foto });
    setRascunho((p) => ({ ...p, foto: r.foto }));
    anunciar("Foto atualizada.");
  }

  return (
    <main className="mx-auto w-full max-w-[46rem] px-4 py-7 pb-10 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir">
        <h1 className="texto-display text-ink">Perfil</h1>
        <p className="texto-apoio mt-1.5 text-ink-secondary">
          Como o Oblix te chama, e os padrões que ele usa para calcular.
        </p>
      </header>

      {demo && (
        <div className="surgir mt-6 rounded-2xl border border-hairline bg-sunken p-4">
          <p className="text-[13.5px] font-medium text-ink">Este perfil é da demonstração</p>
          <p className="texto-legenda mt-1.5 text-ink-secondary">
            Rafael Antunes não existe. Para ter um perfil seu, troque para os seus dados — a base
            de demonstração continua aqui do jeito que está.
          </p>
          <Botao className="mt-3" aoClicar={() => usarModo("proprio")}>
            {temPerfilProprio ? "Voltar para os meus dados" : "Usar os meus dados"}
          </Botao>
        </div>
      )}

      {/* ── identidade ── */}
      <Placa className="mt-6 px-5 py-6 sm:px-7" atraso={40}>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2.5">
            <Avatar nome={rascunho.nome} foto={rascunho.foto} tamanho={92} />
            {!demo && (
              <div className="flex items-center gap-1">
                <Botao tom="discreto" aoClicar={() => arquivo.current?.click()}>
                  {rascunho.foto ? "Trocar" : "Adicionar foto"}
                </Botao>
                {rascunho.foto && (
                  <Botao
                    tom="discreto"
                    aoClicar={() =>
                      confirmar({
                        titulo: "Remover a foto?",
                        corpo:
                          "O avatar volta a ser a inicial do seu nome. Você pode subir outra foto quando quiser.",
                        rotuloAcao: "Remover foto",
                        aoConfirmar: () => {
                          atualizarPerfil({ ...perfil, foto: null });
                          setRascunho((p) => ({ ...p, foto: null }));
                          anunciar("Foto removida.", "neutro");
                        },
                      })
                    }
                  >
                    Remover
                  </Botao>
                )}
              </div>
            )}
            <input
              ref={arquivo}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Escolher foto de perfil"
              onChange={(e) => {
                void escolherFoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {erroFoto && (
              <p role="alert" className="text-[12px]" style={{ color: "var(--color-negativo)" }}>
                {erroFoto}
              </p>
            )}
          </div>

          <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
            <CampoTexto
              rotulo="Nome"
              desabilitado={demo}
              valor={rascunho.nome}
              aoMudar={(v) => editar("nome", v)}
              autoCompletar="name"
              erro={nomeVazio && sujo ? "O Oblix precisa de um nome para te chamar." : undefined}
            />
            <CampoTexto
              rotulo="Apelido de mesa"
              desabilitado={demo}
              dica="Como te chamam no clube"
              valor={rascunho.nick}
              aoMudar={(v) => editar("nick", v)}
            />
          </div>
        </div>
      </Placa>

      {/* ── como você joga ── */}
      <Placa className="mt-4 px-5 py-6 sm:px-7" atraso={80}>
        <h2 className="rotulo">Como você joga</h2>
        <p className="texto-legenda mt-1.5 text-ink-secondary">
          O buy-in padrão é o que o Oblix usa para dizer se um satélite compensa e se a banca
          suporta o campo. Os outros dois moldam o tom das recomendações.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <CampoSelecao
            rotulo="Objetivo"
            desabilitado={demo}
            valor={rascunho.objetivo}
            aoMudar={(v) => editar("objetivo", v as Objetivo)}
            opcoes={OBJETIVOS.map((o) => ({ valor: o, rotulo: ROTULO_OBJETIVO[o] }))}
          />
          <CampoSelecao
            rotulo="Modalidade"
            desabilitado={demo}
            valor={rascunho.modalidade}
            aoMudar={(v) => editar("modalidade", v as Modalidade)}
            opcoes={MODALIDADES.map((m) => ({ valor: m, rotulo: m }))}
          />
          <CampoNumero
            rotulo="Buy-in padrão"
            desabilitado={demo}
            prefixo="R$"
            valor={rascunho.buyInPadrao}
            aoMudar={(v) => editar("buyInPadrao", v ?? 0)}
            min={0}
            passo={10}
          />
        </div>
      </Placa>

      {/* ── barra de salvar ──
          Fica presa no rodapé enquanto houver mudança pendente. No celular,
          um botão no fim de uma página que rola é um botão que não se acha. */}
      {!demo && sujo && (
        <div
          className="sticky bottom-0 z-30 -mx-4 mt-5 border-t border-hairline bg-plane/92 px-4 py-3 backdrop-blur-xl sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="texto-legenda min-w-0 text-ink-secondary">Alterações não salvas</p>
            <div className="flex shrink-0 gap-2">
              <Botao
                tom="discreto"
                aoClicar={() => {
                  setRascunho(perfil);
                  setSujo(false);
                }}
              >
                Descartar
              </Botao>
              <Botao tom="primario" desabilitado={nomeVazio} aoClicar={salvar}>
                Salvar
              </Botao>
            </div>
          </div>
        </div>
      )}

      <p className="surgir mt-6 text-[12px] leading-relaxed text-ink-muted">
        No Oblix desde{" "}
        {new Date(perfil.desde).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
        {" · "}
        {Math.max(
          0,
          Math.round((hoje.getTime() - new Date(perfil.desde).getTime()) / 86_400_000),
        )}{" "}
        dias
      </p>

      {dialogo}
    </main>
  );
}
