/**
 * Preparo da foto de perfil no navegador.
 *
 * A foto sai da câmera do celular com 3.000 px de lado e 4 MB. Guardar isso
 * como `data:` URI significaria carregar 4 MB a cada leitura do perfil — em
 * toda sincronização, em toda abertura do app, num aparelho que talvez esteja
 * em 3G dentro de um clube. Reduzir aqui é a diferença entre 40 kB e 4 MB.
 *
 * O corte é QUADRADO e centrado, porque é assim que o avatar mostra: reduzir
 * sem cortar produziria uma imagem com faixas ou distorcida no círculo.
 *
 * JPEG e não PNG: a foto é fotografia, e o PNG dela dá cinco vezes o tamanho
 * sem ganho visível nesse tamanho.
 */

const LADO = 256;
const QUALIDADE = 0.82;
/** Folga sob o teto de 200 kB da coluna, já contando o crescimento do base64. */
const LIMITE_BYTES = 190_000;

export type ResultadoFoto = { foto: string } | { erro: string };

export async function prepararFoto(arquivo: File): Promise<ResultadoFoto> {
  if (!arquivo.type.startsWith("image/")) {
    return { erro: "Escolha um arquivo de imagem." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    return { erro: "Não conseguimos ler esta imagem. Tente outra." };
  }

  const lado = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - lado) / 2;
  const y = (bitmap.height - lado) / 2;

  const tela = document.createElement("canvas");
  tela.width = LADO;
  tela.height = LADO;
  const ctx = tela.getContext("2d");
  if (!ctx) return { erro: "Este navegador não conseguiu preparar a imagem." };

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, x, y, lado, lado, 0, 0, LADO, LADO);
  bitmap.close();

  let foto = tela.toDataURL("image/jpeg", QUALIDADE);
  // Uma foto muito ruidosa ainda pode passar do teto na primeira qualidade;
  // uma segunda passada mais agressiva resolve sem envolver o jogador nisso.
  if (foto.length > LIMITE_BYTES) foto = tela.toDataURL("image/jpeg", 0.62);
  if (foto.length > LIMITE_BYTES) {
    return { erro: "Esta imagem ficou grande demais. Tente uma foto mais simples." };
  }

  return { foto };
}
