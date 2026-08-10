/**
 * A página de apresentação, sempre obsidiana.
 *
 * O produto respeita o tema de quem usa — claro, escuro ou o do sistema. A
 * apresentação não: ela é escura em qualquer caso, e isso é decisão de
 * direção, não descuido.
 *
 * O motivo é concreto. O herói mostra o painel como um objeto, do jeito que se
 * fotografa um aparelho, e a peça precisa ter uma cor só. Na primeira versão
 * só o herói era escuro e o resto seguia o tema; no tema claro aparecia uma
 * emenda dura entre a barra do topo e o herói, e a página deixava de parecer
 * uma coisa inteira.
 *
 * Quem entra no painel a partir daqui volta imediatamente ao tema que
 * escolheu: `.obsidiana` é local a esta subárvore e não toca o `<html>`.
 */
export default function LayoutDoSite({ children }: LayoutProps<"/">) {
  return <div className="obsidiana min-h-screen">{children}</div>;
}
