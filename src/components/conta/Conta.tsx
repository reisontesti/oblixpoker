"use client";

import { useState } from "react";
import { Marca } from "@/components/shell/Marca";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { Folha } from "@/components/ui/Folha";
import { anunciar } from "@/components/ui/Aviso";
import {
  cadastrar,
  contarLocaisPendentes,
  entrar,
  migrarLocaisParaNuvem,
  sair,
} from "@/lib/data/repositorio";
import { useRegistros } from "@/lib/painel";

/**
 * Conta do Oblix — entrar, cadastrar e trazer o que já estava no navegador.
 *
 * Três decisões moldam esta tela.
 *
 * **A conta é opcional, e some quando não há projeto configurado.** Sem
 * `NEXT_PUBLIC_SUPABASE_URL`, nada disto aparece e o Oblix segue funcionando em
 * localStorage. Um botão "Entrar" que não pode funcionar é pior do que botão
 * nenhum.
 *
 * **Entrar e cadastrar são a mesma tela.** Quem chega não sabe dizer se já tem
 * conta; dois caminhos separados só produzem a escolha errada e um erro logo
 * depois.
 *
 * **O que já está no navegador é oferecido, não engolido.** A ordem natural de
 * uso é ao contrário da técnica: a pessoa experimenta, registra alguns torneios
 * e só então cria conta. Subir tudo sozinho seria decidir por ela o que fazer
 * com dados que talvez fossem só teste.
 */

/** O texto do estado da sincronização, num lugar só — três telas o mostram. */
export function useEstadoDaConta() {
  const { usuario, comNuvem, sincronizando, pendentes, online } = useRegistros();

  const cor = !usuario
    ? "var(--color-ink-faint)"
    : !online
      ? "var(--color-negativo)"
      : sincronizando || pendentes > 0
        ? "var(--color-atencao)"
        : "var(--color-positivo)";

  const resumo = !usuario
    ? "Sem conta neste aparelho"
    : !online
      ? "Sem conexão"
      : sincronizando
        ? "Sincronizando…"
        : pendentes > 0
          ? `${pendentes} ${pendentes === 1 ? "alteração" : "alterações"} para subir`
          : "Sincronizado";

  return { usuario, comNuvem, cor, resumo, sincronizando, pendentes, online };
}

/**
 * O acesso à conta na barra lateral e no menu "Mais".
 *
 * A folha em si é aberta aqui mesmo: é uma sobreposição de página inteira, e
 * empilhar uma folha dentro da outra deixaria duas alças na tela.
 */
export function Conta() {
  const { usuario, comNuvem, cor, resumo } = useEstadoDaConta();
  const [aberto, setAberto] = useState(false);

  if (!comNuvem) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-1 flex min-h-[var(--toque)] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left transition-colors duration-200 hover:bg-realce"
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: cor }}
        />
        <span className="min-w-0 flex-1">
          {/* Dizer a verdade sobre a rede é o que evita a pior versão do
              problema: alguém achar que perdeu um registro quando ele só
              não subiu ainda. Nada é perdido — está gravado no aparelho e
              sobe sozinho quando o sinal volta. */}
          <span className="block truncate text-[12.5px] text-ink-secondary">
            {usuario ? resumo : "Entrar na minha conta"}
          </span>
          {usuario && (
            <span className="block truncate text-[12px] text-ink-faint">{usuario.email}</span>
          )}
        </span>
      </button>

      {aberto && <PainelConta aoFechar={() => setAberto(false)} />}
    </>
  );
}

export function PainelConta({ aoFechar }: { aoFechar: () => void }) {
  const { usuario } = useRegistros();

  return (
    <Folha
      titulo={usuario ? "Sua conta" : "Entrar no Oblix"}
      tituloOculto
      largura="estreita"
      aoFechar={aoFechar}
    >
      {usuario ? <Conectado aoFechar={aoFechar} /> : <FormularioAcesso />}
    </Folha>
  );
}

/**
 * Entrar ou criar conta.
 *
 * Exportado porque precisa existir em dois lugares: no painel de conta e nas
 * BOAS-VINDAS. Sem ele lá, quem já tinha conta não tinha como chegar aos
 * próprios dados na primeira visita — e no celular não tinha como chegar
 * nunca, porque o controle de conta só existia na barra lateral, que some
 * abaixo de `lg`.
 */
export function FormularioAcesso() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const pendentes = typeof window === "undefined" ? 0 : contarLocaisPendentes();

  async function enviar() {
    setErro(null);
    if (!email.includes("@")) return setErro("Informe um e-mail válido.");
    if (senha.length < 6) return setErro("A senha precisa ter ao menos 6 caracteres.");

    setEnviando(true);
    const r = modo === "entrar" ? await entrar(email, senha) : await cadastrar(email, senha);
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    if (r.confirmar) return setConfirmar(true);
    anunciar(modo === "entrar" ? "Você entrou na sua conta." : "Conta criada.");
  }

  if (confirmar) {
    return (
      <>
        <Marca tamanho={30} />
        <h2 className="texto-titulo mt-5 text-ink">Confirme o seu e-mail</h2>
        <p className="texto-apoio mt-2.5 text-ink-secondary">
          Mandamos um link para <strong className="font-medium text-ink">{email}</strong>. Abra
          ele e volte aqui para entrar. Enquanto isso, o que você registrou continua neste
          navegador — nada se perde.
        </p>
      </>
    );
  }

  return (
    <>
      <Marca tamanho={30} />
      <h2 className="texto-titulo mt-5 text-ink">
        {modo === "entrar" ? "Entrar na sua conta" : "Criar a sua conta"}
      </h2>
      <p className="texto-apoio mt-2.5 text-ink-secondary">
        Com conta, os seus registros deixam de morar só neste navegador e passam a existir em
        qualquer aparelho onde você entrar.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <CampoTexto
          rotulo="E-mail"
          tipo="email"
          modoEntrada="email"
          autoCompletar="email"
          valor={email}
          aoMudar={setEmail}
          placeholder="voce@email.com"
        />
        <CampoTexto
          rotulo="Senha"
          dica="Ao menos 6 caracteres"
          tipo="password"
          autoCompletar={modo === "entrar" ? "current-password" : "new-password"}
          valor={senha}
          aoMudar={setSenha}
          aoConfirmar={() => void enviar()}
        />
      </div>

      {erro && (
        <p role="alert" className="mt-3 text-[12.5px]" style={{ color: "var(--color-negativo)" }}>
          {erro}
        </p>
      )}

      {pendentes > 0 && (
        <p className="mt-4 rounded-xl border border-hairline bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
          Você tem <strong className="font-medium text-ink">{pendentes} registros</strong> neste
          navegador. Depois de entrar, o Oblix pergunta se quer subir para a conta.
        </p>
      )}

      <Botao
        tom="primario"
        largo
        tamanho="grande"
        className="mt-6"
        carregando={enviando}
        aoClicar={() => void enviar()}
      >
        {enviando ? "Um instante…" : modo === "entrar" ? "Entrar" : "Criar conta"}
      </Botao>

      <Botao
        tom="discreto"
        largo
        className="mt-2"
        aoClicar={() => {
          setModo(modo === "entrar" ? "cadastrar" : "entrar");
          setErro(null);
        }}
      >
        {modo === "entrar" ? "Ainda não tenho conta" : "Já tenho conta"}
      </Botao>
    </>
  );
}

function Conectado({ aoFechar }: { aoFechar: () => void }) {
  const { usuario, sincronizando, pendentes, online } = useRegistros();
  const [aMigrar] = useState(() => contarLocaisPendentes());
  const [estado, setEstado] = useState<"pronto" | "subindo" | "feito">("pronto");
  const [erro, setErro] = useState<string | null>(null);

  async function subir() {
    setEstado("subindo");
    setErro(null);
    const falha = await migrarLocaisParaNuvem();
    if (falha) {
      setErro(falha);
      setEstado("pronto");
      return;
    }
    setEstado("feito");
    anunciar(`${aMigrar} registros agora estão na sua conta.`);
  }

  return (
    <>
      <Marca tamanho={30} />
      <h2 className="texto-titulo mt-5 text-ink">Sua conta</h2>
      <p className="texto-apoio mt-2.5 text-ink-secondary">{usuario?.email}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
        {sincronizando
          ? "Buscando os seus registros…"
          : !online
            ? "Sem conexão agora. O Oblix continua funcionando com a cópia deste aparelho, e o que você registrar sobe assim que o sinal voltar."
            : pendentes > 0
              ? `${pendentes} ${pendentes === 1 ? "alteração ainda não subiu" : "alterações ainda não subiram"}. Estão gravadas aqui e vão para a conta na próxima conexão — nada se perde.`
              : "Os seus registros estão salvos na conta e disponíveis em qualquer aparelho."}
      </p>

      {aMigrar > 0 && estado !== "feito" && (
        <div className="mt-6 rounded-xl border border-hairline bg-sunken p-4">
          <p className="text-[13.5px] font-medium text-ink">
            {aMigrar} registros ainda só neste navegador
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
            São de antes de você ter conta. Subir junta tudo num lugar só; não subir deixa eles
            aqui, e eles continuam funcionando quando você sair da conta.
          </p>
          {erro && (
            <p role="alert" className="mt-2 text-[12.5px]" style={{ color: "var(--color-negativo)" }}>
              {erro}
            </p>
          )}
          <Botao
            largo
            className="mt-3"
            carregando={estado === "subindo"}
            aoClicar={() => void subir()}
          >
            {estado === "subindo" ? "Subindo…" : "Subir para a conta"}
          </Botao>
        </div>
      )}

      {estado === "feito" && (
        <p
          className="mt-6 rounded-xl border border-hairline bg-sunken px-4 py-3 text-[12.5px] leading-relaxed"
          style={{ color: "var(--color-positivo)" }}
        >
          Pronto. Os {aMigrar} registros agora estão na sua conta.
        </p>
      )}

      <Botao
        largo
        className="mt-6"
        aoClicar={async () => {
          await sair();
          anunciar("Você saiu da conta.", "neutro");
          aoFechar();
        }}
      >
        Sair da conta
      </Botao>
    </>
  );
}
