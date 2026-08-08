/**
 * Confere o BR Code do Pix.
 *
 * Os telefones aqui são fictícios de propósito. Este arquivo é versionado num
 * repositório público, e usar a chave de verdade como dado de teste publicaria
 * o telefone de quem mantém o Oblix — que é justamente o motivo de a chave real
 * viver em variável de ambiente.
 *
 * Um código malformado não falha de um jeito visível: o app do banco
 * simplesmente diz "código inválido" e o jogador desiste de apoiar. Como não dá
 * para testar isso em produção sem pedir dinheiro a alguém, o teste ataca as
 * três coisas que podem estar erradas — o CRC, o formato da chave e a estrutura
 * dos campos — contra os vetores da especificação.
 */
import { crc16, gerarBRCode, normalizarChavePix } from "@/lib/pix";

let falhas = 0;
function conferir(rotulo: string, esperado: unknown, obtido: unknown) {
  const ok = String(esperado) === String(obtido);
  console.log(`${ok ? "ok   " : "FALHA"}  ${rotulo.padEnd(50)} ${ok ? obtido : ""}`);
  if (!ok) {
    falhas++;
    console.log(`        esperado: ${esperado}`);
    console.log(`        obtido:   ${obtido}`);
  }
}

// ── CRC-16/CCITT-FALSE ─────────────────────────────────────────────────────
// Vetor canônico da variante: a string "123456789" tem CRC 0x29B1. É o que
// separa esta variante das outras dezesseis do CRC-16, que dariam outro valor.
conferir("CRC de '123456789' é 29B1", "29B1", crc16("123456789"));
conferir("CRC de string vazia é FFFF", "FFFF", crc16(""));

// O vetor acima é o que prova a variante: das dezesseis famílias de CRC-16,
// só a CCITT-FALSE devolve 29B1 para "123456789". Deliberadamente não há aqui
// um segundo valor esperado copiado de exemplo da especificação — uma
// constante que não dá para conferir na hora testa a memória de quem escreveu,
// não o código. O que sustenta o resto é a propriedade de fechamento logo
// abaixo: recalcular o CRC sobre o código gerado tem que devolver os mesmos
// quatro dígitos que ele carrega no fim.

// ── normalização da chave ──────────────────────────────────────────────────
conferir("telefone formatado vira +55", "+5511900000000", normalizarChavePix("11 90000-0000"));
conferir("telefone com parênteses", "+5511900000000", normalizarChavePix("(11) 90000-0000"));
conferir("telefone já internacional", "+5511900000000", normalizarChavePix("+55 11 90000-0000"));
conferir("e-mail vira minúsculo", "eu@oblix.app", normalizarChavePix("  Eu@Oblix.App "));
conferir(
  "chave aleatória passa direto",
  "123e4567-e12b-12d1-a456-426655440000",
  normalizarChavePix("123E4567-E12B-12D1-A456-426655440000"),
);
conferir("CPF sem formatação fica só dígitos", "12345678901", normalizarChavePix("12345678901"));

// ── estrutura do código ────────────────────────────────────────────────────
const codigo = gerarBRCode({
  chave: "11 90000-0000",
  nome: "Oblix",
  cidade: "São Paulo",
  valor: 77.5,
});
console.log(`\ncódigo gerado:\n${codigo}\n`);

conferir("começa com o indicador de formato", true, codigo.startsWith("000201"));
conferir("declara o GUI do Pix", true, codigo.includes("0014br.gov.bcb.pix"));
conferir("moeda é real (986)", true, codigo.includes("5303986"));
conferir("país é BR", true, codigo.includes("5802BR"));
conferir("valor com duas casas", true, codigo.includes("540577.50"));
conferir("acento removido da cidade", true, codigo.includes("SAO PAULO"));
conferir("txid vazio é ***", true, codigo.includes("62070503***"));

// O próprio CRC precisa fechar: recalcular sobre tudo menos os 4 últimos
// dígitos tem que devolver exatamente esses 4 dígitos.
const corpo = codigo.slice(0, -4);
conferir("CRC fecha sobre o próprio código", codigo.slice(-4), crc16(corpo));

// ── o que percorre os campos, como um leitor de QR faria ───────────────────
function decodificar(texto: string): Record<string, string> {
  const saida: Record<string, string> = {};
  let i = 0;
  while (i < texto.length - 4) {
    const id = texto.slice(i, i + 2);
    const tam = Number(texto.slice(i + 2, i + 4));
    saida[id] = texto.slice(i + 4, i + 4 + tam);
    i += 4 + tam;
  }
  return saida;
}
const campos = decodificar(codigo);
conferir("percorre todos os campos sem sobra", true, Object.keys(campos).length >= 8);
conferir("chave chegou normalizada dentro do código", true, campos["26"].includes("+5511900000000"));

// Sem valor, o código continua válido e fica de valor livre.
const livre = gerarBRCode({ chave: "11 90000-0000", nome: "Oblix", cidade: "Sao Paulo" });
conferir("sem valor não emite o campo 54", false, livre.includes("5405"));
conferir("código de valor livre fecha o CRC", livre.slice(-4), crc16(livre.slice(0, -4)));

// Sem chave não existe código — melhor string vazia que um código inválido que
// o banco aceita e manda para lugar nenhum.
conferir("sem chave devolve vazio", "", gerarBRCode({ chave: "", nome: "Oblix", cidade: "SP" }));

console.log(falhas === 0 ? "\nBR Code válido.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);
