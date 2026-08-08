"use client";

import { useEffect, useState } from "react";
import { Marca } from "@/components/shell/Marca";
import { CampoTexto } from "@/components/ui/Campo";
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
export function Conta() {
  const { usuario, comNuvem, sincronizando } = useRegistros();
  const [aberto, setAberto] = useState(false);

  if (!comNuvem) return null;

  return (
    <>
      {usuario ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-white/4"
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{
              background: sincronizando
                ? "var(--color-atencao)"
                : "var(--color-positivo)",
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11.5px] text-ink-secondary">
              {sincronizando ? "Sincronizando…" : "Sincronizado"}
            </span>
            <span className="block truncate text-[10.5px] text-ink-faint">{usuario.email}</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-2 w-full cursor-pointer rounded-xl border border-hairline px-3 py-2 text-[12px] font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
        >
          Entrar na minha conta
        </button>
      )}

      {aberto && <Painel aoFechar={() => setAberto(false)} />}
    </>
  );
}

function Painel({ aoFechar }: { aoFechar: () => void }) {
  const { usuario } = useRegistros();

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="conta-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-plane/80 px-4 py-10 backdrop-blur-xl"
    >
      <div className="placa grao surgir relative w-full max-w-[26rem] px-6 py-8 sm:px-8">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-white/6 hover:text-ink"
        >
          <span aria-hidden className="text-[15px] leading-none">
            ×
          </span>
        </button>

        <div className="relative">
          {usuario ? <Conectado aoFechar={aoFechar} /> : <Formulario />}
        </div>
      </div>
    </div>
  );
}

function Formulario() {
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
    if (r.confirmar) setConfirmar(true);
  }

  if (confirmar) {
    return (
      <>
        <Marca tamanho={30} />
        <h2
          id="conta-titulo"
          className="mt-5 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink"
        >
          Confirme o seu e-mail
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
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
      <h2
        id="conta-titulo"
        className="mt-5 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink"
      >
        {modo === "entrar" ? "Entrar na sua conta" : "Criar a sua conta"}
      </h2>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">
        Com conta, os seus registros deixam de morar só neste navegador e passam a existir em
        qualquer aparelho onde você entrar.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <CampoTexto rotulo="E-mail" valor={email} aoMudar={setEmail} placeholder="voce@email.com" />
        <label className="flex flex-col">
          <span className="text-[12.5px] font-medium text-ink-secondary">Senha</span>
          <span className="mt-0.5 text-[11.5px] text-ink-muted">Ao menos 6 caracteres</span>
          <input
            type="password"
            value={senha}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void enviar()}
            className="mt-2 w-full rounded-xl border border-hairline bg-sunken px-3.5 py-2.5 text-[14px] text-ink transition-colors duration-200 hover:border-hairline-strong focus:border-[var(--color-positivo)] focus:outline-none"
          />
        </label>
      </div>

      {erro && (
        <p role="alert" className="mt-3 text-[12.5px]" style={{ color: "var(--color-negativo)" }}>
          {erro}
        </p>
      )}

      {pendentes > 0 && (
        <p className="mt-4 rounded-xl border border-hairline bg-sunken px-3.5 py-3 text-[12px] leading-relaxed text-ink-secondary">
          Você tem <strong className="font-medium text-ink">{pendentes} registros</strong> neste
          navegador. Depois de entrar, o Oblix pergunta se quer subir para a conta.
        </p>
      )}

      <button
        type="button"
        onClick={() => void enviar()}
        disabled={enviando}
        className="mt-6 w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3 text-[14px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.985] disabled:opacity-50"
      >
        {enviando ? "Um instante…" : modo === "entrar" ? "Entrar" : "Criar conta"}
      </button>

      <button
        type="button"
        onClick={() => {
          setModo(modo === "entrar" ? "cadastrar" : "entrar");
          setErro(null);
        }}
        className="mt-4 w-full cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
      >
        {modo === "entrar" ? "Ainda não tenho conta" : "Já tenho conta"}
      </button>
    </>
  );
}

function Conectado({ aoFechar }: { aoFechar: () => void }) {
  const { usuario, sincronizando } = useRegistros();
  const [pendentes] = useState(() => contarLocaisPendentes());
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
  }

  return (
    <>
      <Marca tamanho={30} />
      <h2
        id="conta-titulo"
        className="mt-5 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink"
      >
        Sua conta
      </h2>
      <p className="mt-2.5 text-[13.5px] text-ink-secondary">{usuario?.email}</p>
      <p className="mt-1 text-[12px] text-ink-muted">
        {sincronizando
          ? "Buscando os seus registros…"
          : "Os seus registros estão salvos na conta e disponíveis em qualquer aparelho."}
      </p>

      {pendentes > 0 && estado !== "feito" && (
        <div className="mt-6 rounded-xl border border-hairline bg-sunken p-4">
          <p className="text-[13px] font-medium text-ink">
            {pendentes} registros ainda só neste navegador
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">
            São de antes de você ter conta. Subir junta tudo num lugar só; não subir deixa eles
            aqui, e eles continuam funcionando quando você sair da conta.
          </p>
          {erro && (
            <p role="alert" className="mt-2 text-[12px]" style={{ color: "var(--color-negativo)" }}>
              {erro}
            </p>
          )}
          <button
            type="button"
            onClick={() => void subir()}
            disabled={estado === "subindo"}
            className="mt-3 w-full cursor-pointer rounded-xl border border-hairline bg-raised px-4 py-2.5 text-[13px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong disabled:opacity-50"
          >
            {estado === "subindo" ? "Subindo…" : "Subir para a conta"}
          </button>
        </div>
      )}

      {estado === "feito" && (
        <p
          className="mt-6 rounded-xl border border-hairline bg-sunken px-4 py-3 text-[12.5px] leading-relaxed"
          style={{ color: "var(--color-positivo)" }}
        >
          Pronto. Os {pendentes} registros agora estão na sua conta.
        </p>
      )}

      <button
        type="button"
        onClick={async () => {
          await sair();
          aoFechar();
        }}
        className="mt-6 w-full cursor-pointer rounded-xl border border-hairline px-4 py-2.5 text-[13px] font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
      >
        Sair da conta
      </button>
    </>
  );
}
