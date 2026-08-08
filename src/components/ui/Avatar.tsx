/**
 * O avatar do jogador.
 *
 * Sem foto, mostra a inicial sobre um degradê de jade — e isso é o padrão, não
 * um remendo. A maioria das pessoas nunca vai subir foto; se a ausência
 * parecer falta, o produto passa a cobrar uma tarefa que ele mesmo disse ser
 * opcional.
 *
 * A inicial sai do NOME e não do nick: é como a pessoa se reconhece. Um nome
 * vazio cai para "?" em vez de um quadrado em branco, que leria como falha de
 * carregamento.
 */

interface AvatarProps {
  nome: string;
  foto?: string | null;
  /** Lado do quadrado, em px. */
  tamanho?: number;
  className?: string;
}

export function Avatar({ nome, foto, tamanho = 36, className = "" }: AvatarProps) {
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}
      style={{ width: tamanho, height: tamanho }}
    >
      {foto ? (
        // `<img>` e não `next/image`: a fonte é um `data:` URI que já veio
        // reduzido a 256px no cliente. Não há o que otimizar no servidor, e o
        // loader do Next não aceita `data:` sem configuração extra.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt=""
          className="size-full object-cover"
          style={{ width: tamanho, height: tamanho }}
        />
      ) : (
        <>
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #1fb583, #0f5f44)" }}
          />
          <span
            className="relative font-semibold text-plane"
            style={{ fontSize: Math.round(tamanho * 0.4) }}
          >
            {inicial}
          </span>
        </>
      )}
      {/* Um aro interno de um pixel: sem ele, a foto de alguém com fundo claro
          encosta direto na superfície e o círculo some. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full ring-1 ring-hairline-strong ring-inset"
      />
    </span>
  );
}
