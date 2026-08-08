"use client";

import { useId, useState, type ReactNode } from "react";

export interface Coluna<T> {
  chave: string;
  rotulo: string;
  numerica?: boolean;
  render: (linha: T) => ReactNode;
}

interface Props<T> {
  legenda: string;
  colunas: Coluna<T>[];
  linhas: T[];
  chaveDe: (linha: T) => string;
  alturaMax?: string;
}

/**
 * Gêmea tabular de um gráfico.
 *
 * Existe porque tooltip não pode ser o único caminho até um valor: quem lê
 * por teclado, por leitor de tela ou numa impressão em cinza precisa chegar
 * ao mesmo número. Fica recolhida para não competir com o gráfico.
 */
export function TabelaDados<T>({
  legenda,
  colunas,
  linhas,
  chaveDe,
  alturaMax = "17rem",
}: Props<T>) {
  const [aberta, setAberta] = useState(false);
  const id = useId();

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        aria-controls={id}
        className="cursor-pointer text-[12px] font-medium text-ink-muted transition-colors duration-200 hover:text-ink-secondary"
      >
        {aberta ? "Ocultar tabela" : "Ver como tabela"}
      </button>

      {aberta && (
        <div
          id={id}
          className="mt-3 overflow-auto rounded-xl border border-hairline"
          style={{ maxHeight: alturaMax }}
        >
          <table className="w-full border-collapse text-[12.5px]">
            <caption className="sr-only">{legenda}</caption>
            <thead className="sticky top-0 bg-raised">
              <tr>
                {colunas.map((c) => (
                  <th
                    key={c.chave}
                    scope="col"
                    className={`border-b border-hairline px-3 py-2 font-medium text-ink-secondary ${
                      c.numerica ? "text-right" : "text-left"
                    }`}
                  >
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={chaveDe(linha)} className="even:bg-white/[0.015]">
                  {colunas.map((c) => (
                    <td
                      key={c.chave}
                      className={`border-b border-hairline px-3 py-1.5 text-ink-secondary ${
                        c.numerica ? "numeros-tabulares text-right" : "text-left"
                      }`}
                    >
                      {c.render(linha)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
