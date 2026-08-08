"use client";

import { useId, type ReactNode } from "react";

interface BaseProps {
  rotulo: string;
  dica?: string;
  erro?: string;
  /**
   * Campo em leitura. Existe para o perfil da demonstração: os valores são do
   * Rafael Antunes, que não existe, e um campo que aceita digitação mas
   * descarta o que foi digitado é pior do que um campo travado.
   */
  desabilitado?: boolean;
  children?: ReactNode;
}

function Envolucro({
  rotulo,
  dica,
  erro,
  id,
  children,
}: BaseProps & { id: string }) {
  // Coluna com o campo empurrado para baixo: numa linha de grade em que só
  // alguns campos têm dica, os rótulos ficam com alturas diferentes e as
  // caixas de entrada saem desalinhadas. Com `mt-auto` todas encostam na
  // mesma base, independentemente do tamanho do rótulo.
  return (
    <label htmlFor={id} className="flex h-full flex-col">
      <span className="block text-[12.5px] font-medium text-ink-secondary">{rotulo}</span>
      {dica && <span className="mt-0.5 block text-[12px] text-ink-muted">{dica}</span>}
      <span className="mt-auto block pt-2">{children}</span>
      {erro && (
        <span
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--color-negativo)" }}
        >
          <span aria-hidden>!</span>
          {erro}
        </span>
      )}
    </label>
  );
}

/**
 * `text-[16px]` no celular não é escolha de estilo — é o que impede o iOS de
 * dar zoom sozinho ao focar o campo. Abaixo de 16px o Safari aproxima a tela,
 * e sair desse zoom depois é manobra manual no meio de um formulário. Do `sm`
 * para cima volta aos 14px do resto do produto, onde o mouse não tem o
 * problema.
 *
 * `min-h-[var(--toque)]` pelo mesmo motivo dos botões: campo é alvo de toque.
 */
const CLASSE_ENTRADA =
  "w-full min-h-[var(--toque)] rounded-xl border border-hairline bg-sunken px-3.5 py-2.5 " +
  "text-[16px] sm:text-[14px] text-ink " +
  "placeholder:text-ink-faint transition-colors duration-200 " +
  "hover:border-hairline-strong focus:border-[var(--color-positivo)] focus:outline-none " +
  "aria-[invalid=true]:border-[var(--color-negativo)] " +
  "disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:border-hairline";

interface TextoProps extends BaseProps {
  valor: string;
  aoMudar: (v: string) => void;
  tipo?: "text" | "date" | "email" | "password" | "search";
  placeholder?: string;
  /** Qual teclado o celular abre. Sem isto, e-mail vem com teclado de texto. */
  modoEntrada?: "text" | "email" | "numeric" | "tel" | "search";
  autoCompletar?: string;
  aoConfirmar?: () => void;
  /**
   * Valores já conhecidos, oferecidos como autocompletar sem impedir os
   * outros. É o que um `select` não consegue: a lista de clubes de um jogador
   * começa vazia e cresce com o que ele digita, então fechar as opções
   * deixaria o primeiro registro impossível de preencher.
   */
  sugestoes?: string[];
}

export function CampoTexto({
  valor,
  aoMudar,
  tipo = "text",
  placeholder,
  sugestoes,
  modoEntrada,
  autoCompletar,
  aoConfirmar,
  ...base
}: TextoProps) {
  const id = useId();
  const idLista = `${id}-sugestoes`;
  const lista = sugestoes?.length ? sugestoes : null;

  return (
    <Envolucro {...base} id={id}>
      <input
        id={id}
        type={tipo}
        value={valor}
        placeholder={placeholder}
        inputMode={modoEntrada}
        autoComplete={autoCompletar}
        list={lista ? idLista : undefined}
        onChange={(e) => aoMudar(e.target.value)}
        onKeyDown={aoConfirmar ? (e) => e.key === "Enter" && aoConfirmar() : undefined}
        disabled={base.desabilitado}
        aria-invalid={base.erro ? true : undefined}
        className={CLASSE_ENTRADA}
      />
      {lista && (
        <datalist id={idLista}>
          {lista.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </Envolucro>
  );
}

interface NumeroProps extends BaseProps {
  valor: number | null;
  aoMudar: (v: number | null) => void;
  prefixo?: string;
  sufixo?: string;
  min?: number;
  max?: number;
  passo?: number;
  placeholder?: string;
}

/**
 * Entrada numérica que aceita o campo vazio.
 *
 * Guardar `null` em vez de coagir para 0 importa: "não informei quantos
 * jogadores tinha" e "tinha zero jogadores" são coisas diferentes, e tratar as
 * duas como 0 contaminaria as médias silenciosamente.
 */
export function CampoNumero({
  valor,
  aoMudar,
  prefixo,
  sufixo,
  min,
  max,
  passo,
  placeholder,
  ...base
}: NumeroProps) {
  const id = useId();
  return (
    <Envolucro {...base} id={id}>
      <span className="relative flex items-center">
        {prefixo && (
          <span className="pointer-events-none absolute left-3.5 text-[13px] text-ink-muted">
            {prefixo}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={valor ?? ""}
          min={min}
          max={max}
          step={passo}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value === "" ? null : Number(e.target.value))}
          disabled={base.desabilitado}
          aria-invalid={base.erro ? true : undefined}
          className={`${CLASSE_ENTRADA} numeros-tabulares ${prefixo ? "pl-11" : ""} ${
            sufixo ? "pr-12" : ""
          } [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        {sufixo && (
          <span className="pointer-events-none absolute right-3.5 text-[13px] text-ink-muted">
            {sufixo}
          </span>
        )}
      </span>
    </Envolucro>
  );
}

interface SelecaoProps extends BaseProps {
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
}

export function CampoSelecao({ valor, aoMudar, opcoes, ...base }: SelecaoProps) {
  const id = useId();
  return (
    <Envolucro {...base} id={id}>
      <select
        id={id}
        value={valor}
        disabled={base.desabilitado}
        onChange={(e) => aoMudar(e.target.value)}
        className={`${CLASSE_ENTRADA} cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" fill="none"><path d="M1 1.5 6 6.5l5-5" stroke="%236b7573" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="bg-raised">
            {o.rotulo}
          </option>
        ))}
      </select>
    </Envolucro>
  );
}

interface TextoLongoProps extends BaseProps {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  linhas?: number;
}

export function CampoTextoLongo({
  valor,
  aoMudar,
  placeholder,
  linhas = 3,
  ...base
}: TextoLongoProps) {
  const id = useId();
  return (
    <Envolucro {...base} id={id}>
      <textarea
        id={id}
        value={valor}
        rows={linhas}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
        className={`${CLASSE_ENTRADA} resize-y leading-relaxed`}
      />
    </Envolucro>
  );
}

interface EscolhaProps<T extends string> {
  rotulo: string;
  dica?: string;
  valor: T;
  aoMudar: (v: T) => void;
  opcoes: { valor: T; rotulo: string; detalhe?: string; cor?: string }[];
  /** Empilha em coluna quando os rótulos são longos. */
  coluna?: boolean;
}

/**
 * Escolha entre poucas alternativas, como cartões clicáveis em vez de um
 * `select`. O alvo de toque fica grande no celular e todas as opções ficam
 * visíveis ao mesmo tempo — que é o que se quer quando a escolha muda o resto
 * do formulário.
 */
export function CampoEscolha<T extends string>({
  rotulo,
  dica,
  valor,
  aoMudar,
  opcoes,
  coluna = false,
}: EscolhaProps<T>) {
  return (
    <fieldset>
      <legend className="text-[12.5px] font-medium text-ink-secondary">{rotulo}</legend>
      {dica && <p className="mt-0.5 text-[12px] text-ink-muted">{dica}</p>}
      {/* Colunas vêm por style, e não por classe: `grid-cols-${n}` montado em
          tempo de execução não é enxergado pelo Tailwind e nunca chegaria ao
          CSS gerado. */}
      <div
        className="mt-2 grid gap-2"
        style={{
          gridTemplateColumns: coluna
            ? "minmax(0, 1fr)"
            : `repeat(${Math.min(opcoes.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(o.valor)}
              className={`min-h-[var(--toque)] cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                ativo
                  ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
                  : "border-hairline bg-sunken text-ink-secondary hover:border-hairline-strong hover:text-ink"
              }`}
              style={ativo && o.cor ? { boxShadow: `inset 0 0 0 1px ${o.cor}` } : undefined}
            >
              <span className="block text-[13.5px] font-medium">{o.rotulo}</span>
              {o.detalhe && (
                <span className="mt-0.5 block text-[12px] text-ink-muted">{o.detalhe}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
