import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/site/Cabecalho";
import { Rodape } from "@/components/site/Rodape";

/**
 * Privacidade — descrição do que o Oblix faz com os dados, não texto jurídico.
 *
 * Cada afirmação aqui corresponde a uma decisão que está no código e pode ser
 * conferida: os dois baldes do `localStorage`, a política de linha em toda
 * tabela, a chave `anon` como única credencial do navegador, o espelho local.
 * Nada foi escrito porque "toda landing tem uma página dessas".
 *
 * O que um painel de poker guarda é mais sensível do que parece — quanto a
 * pessoa ganha, contra quem joga e o que ela escreveu sobre a própria cabeça
 * depois de perder. Isso merece uma página em português claro, e não um
 * documento que ninguém lê.
 */

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "Onde os seus dados ficam no Oblix, quem consegue vê-los e como tirá-los de lá.",
  alternates: { canonical: "/privacidade" },
};

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="texto-titulo text-ink">{titulo}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-secondary">
        {children}
      </div>
    </section>
  );
}

export default function Privacidade() {
  return (
    <>
      <Cabecalho />

      <main id="conteudo" className="mx-auto w-full max-w-[46rem] px-4 py-14 sm:px-7 sm:py-20 lg:px-10">
        <h1 className="texto-display text-ink">Privacidade</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-secondary">
          O Oblix guarda quanto você ganha, contra quem você joga e o que você escreveu sobre a
          própria cabeça depois de perder. Esta página diz onde isso fica e como tirar de lá.
        </p>

        <Bloco titulo="Sem conta, nada sai do seu navegador">
          <p>
            Você pode usar o Oblix inteiro sem se cadastrar. Nesse modo, tudo o que você
            registra fica no armazenamento local do próprio navegador — torneios, satélites,
            adversários, diário e treino. Não passa por servidor nenhum.
          </p>
          <p>
            A contrapartida é honesta: some se você limpar os dados do site, e não acompanha
            você para outro aparelho.
          </p>
        </Bloco>

        <Bloco titulo="Com conta, os dados ficam isolados por regra do banco">
          <p>
            Quando você cria uma conta, os registros passam a viver num banco Postgres. Toda
            tabela tem política de segurança em nível de linha, sem exceção: uma consulta feita
            em nome de um jogador não consegue devolver a linha de outro. Não é uma verificação
            no aplicativo — é uma regra do banco, aplicada abaixo de qualquer código que a gente
            escreva.
          </p>
          <p>
            O navegador nunca recebe credencial de administrador. Ele fala com o banco usando a
            chave pública do projeto, sempre sob essa política.
          </p>
        </Bloco>

        <Bloco titulo="Uma cópia fica no aparelho, de propósito">
          <p>
            Com conta, o Oblix mantém um espelho local dos seus dados. É o que faz o painel
            abrir cheio dentro de um clube sem sinal, e o que permite registrar um intervalo com
            a rede caída — o que você escrever sobe sozinho quando a conexão voltar.
          </p>
          <p>Sair da conta apaga esse espelho do aparelho.</p>
        </Bloco>

        <Bloco titulo="O que o Oblix não faz">
          <p>
            Não há rastreadores de terceiros, pixel de anúncio nem análise de comportamento. Não
            vendemos, alugamos nem compartilhamos os seus dados. O Oblix não lê histórico de
            mãos de sala nenhuma: tudo o que ele sabe é o que você digitou.
          </p>
        </Bloco>

        <Bloco titulo="Tirar os seus dados de lá">
          <p>
            Em <Link href="/configuracoes" className="text-ink underline decoration-hairline-strong underline-offset-4 transition-colors duration-200 hover:decoration-[var(--color-positivo)]">Configurações → Privacidade</Link>{" "}
            você baixa uma cópia completa em JSON, a qualquer momento, sem pedir nada a ninguém.
            No mesmo lugar você apaga tudo o que registrou.
          </p>
          <p>
            Apagar a conta remove junto todas as linhas ligadas a ela — a exclusão em cascata
            está declarada no próprio esquema do banco, não depende de uma rotina de limpeza
            lembrar de rodar.
          </p>
        </Bloco>

        <Bloco titulo="Foto de perfil">
          <p>
            A foto é opcional. Quando você escolhe uma, ela é reduzida a 256 pixels no seu
            próprio navegador antes de qualquer coisa, e guardada junto do perfil. Ela não vai
            para serviço de imagem de terceiros.
          </p>
        </Bloco>

        <p className="mt-12 border-t border-hairline pt-6 text-[13px] leading-relaxed text-ink-muted">
          Esta página descreve o comportamento do produto hoje. Se algo aqui mudar, ela muda
          junto — e o que estiver escrito continuará correspondendo ao que o código faz.
        </p>
      </main>

      <Rodape />
    </>
  );
}
