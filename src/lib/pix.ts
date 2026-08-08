/**
 * Geração do BR Code do Pix — o "copia e cola".
 *
 * Existe porque mostrar a chave crua transferiria para o jogador o trabalho de
 * digitar um telefone no aplicativo do banco e depois preencher o valor à mão.
 * Um dígito errado manda dinheiro para um estranho, e ninguém revisa isso com
 * atenção depois de ganhar um torneio às duas da manhã. Com o BR Code, ele
 * copia, cola e confirma — o destinatário e o valor já vêm dentro.
 *
 * O formato é o EMV MPM que o Banco Central especifica: uma sequência de campos
 * `ID + tamanho + valor`, fechada por um CRC-16 sobre tudo o que veio antes.
 * Não há biblioteca envolvida; são cinquenta linhas e um polinômio, e o
 * `conferir-pix.mts` valida contra os vetores oficiais.
 */

/** Campo EMV: identificador de 2 dígitos, tamanho de 2 dígitos, valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/**
 * CRC-16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF, sem reflexão e sem XOR
 * final. É a variante que a especificação do Pix exige — trocar por qualquer
 * outra produz um código que o banco recusa na hora de colar.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Deixa a chave no formato que o Pix espera.
 *
 * Telefone é o caso que mais engana: no Pix ele vive como `+5511900000000`, e
 * a forma que a pessoa escreve — `11 90000-0000` — gera um código que o banco
 * recusa. Chave aleatória, e-mail, CPF e CNPJ já são usados como estão.
 */
export function normalizarChavePix(bruta: string): string {
  const chave = bruta.trim();
  if (!chave) return "";
  if (chave.includes("@")) return chave.toLowerCase();
  if (chave.startsWith("+")) return chave.replace(/[^\d+]/g, "");
  // Chave aleatória: 32 hexadecimais, com ou sem hífens.
  if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(chave)) {
    return chave.toLowerCase();
  }

  const digitos = chave.replace(/\D/g, "");
  // 10 ou 11 dígitos com a formatação típica de telefone (espaço, hífen ou
  // parênteses) é celular ou fixo com DDD. Sem formatação, 11 dígitos é
  // ambíguo com CPF, e aí prevalece a leitura de CPF.
  const pareceTelefone = /[\s()-]/.test(chave) && digitos.length >= 10 && digitos.length <= 11;
  if (pareceTelefone) return `+55${digitos}`;
  return digitos;
}

/** Remove acentos e limita — os campos de nome e cidade só aceitam ASCII. */
function ascii(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase()
    .slice(0, limite)
    .trim();
}

export interface DadosPix {
  chave: string;
  /** Aparece no extrato de quem paga. */
  nome: string;
  cidade: string;
  /** Em reais. Omitido gera um código de valor livre. */
  valor?: number | null;
}

/**
 * Monta o código copia e cola.
 *
 * A ordem dos campos não é livre: a especificação define a sequência, e o CRC
 * é calculado sobre a string já com `6304` no fim — por isso ele é concatenado
 * antes de existir, e só então o valor é preenchido.
 */
export function gerarBRCode({ chave, nome, cidade, valor }: DadosPix): string {
  const chaveLimpa = normalizarChavePix(chave);
  if (!chaveLimpa) return "";

  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chaveLimpa);

  const partes = [
    campo("00", "01"),
    campo("26", conta),
    campo("52", "0000"),
    campo("53", "986"),
    // O valor é opcional. Quando vai, precisa de duas casas e ponto decimal.
    valor && valor > 0 ? campo("54", valor.toFixed(2)) : "",
    campo("58", "BR"),
    campo("59", ascii(nome, 25) || "OBLIX"),
    campo("60", ascii(cidade, 15) || "BRASIL"),
    // `***` é o identificador que diz "sem txid" — campo obrigatório, valor
    // vazio não serve.
    campo("62", campo("05", "***")),
  ].join("");

  const semCrc = `${partes}6304`;
  return `${semCrc}${crc16(semCrc)}`;
}
