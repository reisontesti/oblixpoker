"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { gerarBRCode } from "@/lib/pix";
import { moeda } from "@/lib/format";

/**
 * O Pix de apoio: código copia e cola, com QR ao lado.
 *
 * A chave vem de variável de ambiente porque é um dado pessoal de quem mantém
 * o Oblix — no ar ela precisa estar, mas versionada num repositório público
 * viraria alimento de raspador de telefone. Sem a variável, este bloco
 * simplesmente não aparece: melhor não oferecer apoio do que oferecer um
 * código que não leva a lugar nenhum.
 *
 * Copia e cola vem primeiro, e o QR depois, porque o Oblix é usado no celular
 * dentro do clube — e ninguém escaneia o QR da própria tela. No computador a
 * ordem se inverte na prática, e é por isso que os dois existem.
 */
const CHAVE = process.env.NEXT_PUBLIC_PIX_CHAVE ?? "";
const NOME = process.env.NEXT_PUBLIC_PIX_NOME ?? "Oblix";
const CIDADE = process.env.NEXT_PUBLIC_PIX_CIDADE ?? "Brasil";

export const pixConfigurado = CHAVE.trim().length > 0;

export function Pix({ valor }: { valor: number }) {
  const [codigo] = useState(() => gerarBRCode({ chave: CHAVE, nome: NOME, cidade: CIDADE, valor }));
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    // Gerado no cliente para não pesar o bundle com uma imagem por valor
    // possível — o código muda a cada quantia escolhida.
    QRCode.toDataURL(codigo, {
      margin: 1,
      width: 320,
      color: { dark: "#0e1011", light: "#f2f4f3" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [codigo]);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2600);
    return () => clearTimeout(t);
  }, [copiado]);

  if (!codigo) return null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      // Sem permissão de área de transferência: o código continua visível
      // abaixo e dá para selecionar à mão.
      setCopiado(false);
    }
  }

  return (
    <div className="surgir rounded-2xl border border-hairline bg-sunken p-5 sm:p-6">
      <p className="text-[15px] font-medium text-ink">Obrigado de verdade.</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
        {moeda(valor)} via Pix. O código abaixo já vem com o valor e o destinatário
        preenchidos — é só colar no seu banco.
      </p>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => void copiar()}
            className="w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-4 py-3 text-[13.5px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.99]"
          >
            {copiado ? "Código copiado ✓" : "Copiar código Pix"}
          </button>

          <p className="mt-3 text-[11px] tracking-wide text-ink-muted uppercase">
            Ou copie manualmente
          </p>
          <code className="mt-1.5 block max-h-24 overflow-y-auto rounded-lg border border-hairline bg-plane px-3 py-2 font-mono text-[10.5px] leading-relaxed break-all text-ink-secondary select-all">
            {codigo}
          </code>
        </div>

        {qr && (
          <div className="shrink-0 self-center sm:self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`QR Code Pix de ${moeda(valor)}`}
              width={132}
              height={132}
              className="rounded-xl"
            />
            <p className="mt-1.5 text-center text-[10.5px] text-ink-muted">Ou escaneie</p>
          </div>
        )}
      </div>

      <p className="mt-5 border-t border-hairline pt-3.5 text-[11.5px] leading-relaxed text-ink-muted">
        Nada é cobrado automaticamente e nada fica bloqueado se você não apoiar. O
        Oblix é gratuito e continua gratuito.
      </p>
    </div>
  );
}
