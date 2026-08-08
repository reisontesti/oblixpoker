# Oblix

Sistema operacional para jogadores de poker.

**No ar em https://oblix-six.vercel.app**

```bash
npm run dev     # desenvolvimento em http://localhost:3000
npm run build   # build de produção
npx eslint .    # lint
```

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Geist.
Dark-only por decisão de produto. Interface inteira em pt-BR.

---

## O que está construído

| Rota | Estado |
|---|---|
| `/` | Dashboard completo |
| `/satelites` | Análise de satélites completa |
| `/torneios` | Histórico com filtros; corrige e apaga o que você registrou |
| `/torneios/[id]/editar` | Correção de um torneio já lançado, numa tela só |
| `/torneios/novo` | Preparo do torneio; daqui sai a sessão ao vivo ou o lançamento retroativo |
| `/torneios/ao-vivo` | **Sessão ao vivo** — cronômetro, intervalos e a curva do stack |
| `/jogadores` | Banco de adversários: busca, edição e registro de campo |
| `/mesa` | **Modo Mesa** — as leituras dos adversários sentados com você |
| `/diario` | Check-in pré-jogo, fecho da sessão e o cruzamento estado × resultado |

Todo o PRD está construído. Metas não tem página própria de propósito: o
conteúdo inteiro já vive no Dashboard, e uma entrada desabilitada na navegação
seria promessa vazia.

O que você registra entra imediatamente em todos os cálculos — banca, ROI,
satélites, insights. Sem conta, fica em `localStorage`; com conta, no Postgres do
Supabase e disponível em qualquer aparelho.

---

## As duas bases

Na primeira visita o Oblix pergunta uma coisa só: explorar a demonstração ou
começar com os seus dados.

A pergunta existe porque o painel abre com R$ 10.136 de banca e 78% de ROI em
tipografia grande, e número grande é lido como verdade. Sem essa pergunta, um
jogador não tem como saber que aquele ROI não é o dele — um selo discreto no
canto não competiria com a figura no meio da tela.

**São bases separadas, não filtros sobre a mesma base**
([`repositorio.ts`](src/lib/data/repositorio.ts)):

```
demonstracao → base semeada + oblix:registros:v1
proprio      → só oblix:registros:proprio:v1
```

Cada modo tem o seu balde, então **trocar não apaga nada** e a troca não precisa
de aviso dramático: quem entra nos próprios dados pode voltar para a
demonstração, e volta encontrando tudo onde deixou. É o que permite oferecer
"ver a demonstração" no painel vazio sem risco — a essa altura é exatamente o
que a pessoa quer, para saber como aquilo fica cheio.

O instantâneo do servidor devolve **sempre** o modo demonstração. É o que evita
divergência de hidratação, e é por isso que existem duas bandeiras separadas:
`pronto` (o cliente já leu a conta) e `decidiu` (o jogador já escolheu). Fossem
uma só, o HTML do servidor traria as boas-vindas embutidas e elas piscariam na
cara de quem já decidiu, a cada carregamento.

### O que muda no modo próprio

- **A saúde técnica fica vazia, e diz por quê.** VPIP, PFR e 3bet vêm de
  histórico de mãos, que o Oblix não importa. Reaproveitar a amostra semeada
  atribuiria ao jogador um estilo que ninguém mediu — justamente no cartão que
  ele consultaria para se corrigir.
- **A meta de banca acompanha de onde ele partiu** (o dobro do aporte inicial).
  Os R$ 12.000 fixos da demonstração seriam um número estrangeiro, longe o
  bastante para a barra nunca sair do lugar.
- **Nenhuma meta acusa atraso no dia zero.** Quem não registrou nada não está
  atrasado, não começou — e o âmbar perde significado quando é o estado padrão
  de todo mundo.
- **"Hoje" passa a ser o relógio de verdade.** Na demonstração continua sendo a
  data congelada do seed, senão os 14 meses de história apareceriam como um
  bloco no passado remoto.
- **Clube vira campo de texto com sugestões.** A lista de clubes de quem começou
  do zero nasce vazia e cresce com o que ele digita; um `select` fechado deixaria
  o primeiro registro impossível de preencher.

### Estados vazios

Um painel recém-aberto é quase todo composto por eles, então
[`Vazio.tsx`](src/components/ui/Vazio.tsx) segue duas regras: dizer **o que
aquele espaço vai mostrar** em vez de anunciar que está vazio — "sem dados" é
informação que o próprio branco já deu — e oferecer o próximo passo como botão
sempre que existir um óbvio.

Vale também para "Insights" sem nenhum insight, que não é falha e sim o piso de
amostra funcionando: abaixo de seis registros o Oblix se cala, e o estado vazio
precisa dizer isso, senão parece que o produto não faz nada.

---

## As duas decisões que definem o produto

### 1. Comparar ROI entre as vias de entrada mente

Uma vaga de R$ 150 conquistada num satélite de R$ 20 tem denominador oito vezes
menor. O ROI dela infla por aritmética, não por desempenho — na base de
demonstração, o ROI "cru" via satélite aparece como **95%** contra **78%** da
entrada direta, sugerindo exatamente o contrário do que os dados dizem.

Por isso o custo de entrada é medido de duas formas
([`metricas.ts`](src/lib/calc/metricas.ts)):

- `investimento()` — o que foi **efetivamente pago**;
- `investimentoABalcao()` — cobrando o buy-in de balcão dos dois lados.

Com o custo igualado, o desempenho real aparece: **78% entrando direto contra 5%
via satélite**.

### 2. O veredito é uma soma de duas forças opostas

O satélite **barateia a vaga** (ganho) e, quando cansa o jogador, **piora o
desempenho na mesa** (perda). As duas são medidas separadamente e somadas
([`satelites.ts`](src/lib/calc/satelites.ts)):

```
economia na vaga    +R$ 41,19   por torneio
diferença na mesa   −R$ 83,44   por torneio
                    ─────────
saldo               −R$ 42,25   por torneio
```

A identidade fecha exatamente contra `deltaLucroPorTorneio` — os termos se
cancelam porque, na entrada direta, custo pago e custo de balcão são o mesmo
número. O painel mostra a conta, não só a conclusão.

O Oblix **não assume** que satélite é bom nem ruim. Abaixo de 8 registros por
via, ele diz que ainda não sabe em vez de inventar convicção.

---

### 3. A via de entrada não é perguntada — é deduzida

No formulário o jogador informa se **jogou** o satélite e se **classificou**. A
via sai daí: só é entrada via satélite quem jogou *e* ganhou a vaga. Perguntar a
via num terceiro campo abriria espaço para os dados se contradizerem no banco, e
é justamente essa a coluna de que todo o comparativo depende.

Um satélite perdido não vira vínculo: fica como custo avulso na banca, que é o
que ele é. Ver `registrar()` em
[`repositorio.ts`](src/lib/data/repositorio.ts).

---

## Monetização

O pedido de apoio (5% / 10% / 15% / outro valor / agora não) aparece **só depois
de uma premiação registrada** — quem não ganhou nada não é convidado a doar. Está
em [`Conclusao.tsx`](src/components/torneios/Conclusao.tsx), e segue duas regras
deliberadas:

- **"Agora não" é um botão de verdade** — mesmo tamanho, mesmo contraste, ao
  lado do botão de apoiar. Um produto gratuito que esconde a saída do pedido de
  doação deixa de parecer gratuito.
- **Nada é cobrado automaticamente.** O apoio é um Pix voluntário, iniciado pelo
  jogador no aplicativo do banco dele. Nenhuma funcionalidade fica atrás de
  pagamento.

### Por que BR Code, e não a chave

Mostrar a chave crua transferiria para o jogador digitar um telefone no banco e
preencher o valor à mão. Um dígito errado manda dinheiro para um estranho, e
ninguém revisa isso com atenção depois de ganhar um torneio às duas da manhã. O
código copia e cola já leva destinatário e valor dentro.

Ele é montado em [`pix.ts`](src/lib/pix.ts), sem biblioteca: são os campos EMV
que o Banco Central especifica e um CRC-16/CCITT-FALSE. Copia e cola vem antes do
QR porque o Oblix é usado no celular dentro do clube, e ninguém escaneia o QR da
própria tela.

```bash
npx tsx scripts/conferir-pix.mts
```

O teste ataca o que pode dar errado sem falhar de forma visível — código
malformado só faz o banco dizer "inválido", e o jogador desiste. Confere o vetor
canônico da variante (`123456789` → `29B1`), a normalização de telefone para
`+55DDDNUMERO` e o fechamento do CRC sobre o próprio código gerado.

**A chave vive em `NEXT_PUBLIC_PIX_CHAVE`, fora do repositório.** É dado pessoal
de quem mantém o Oblix, e telefone em repo público é alimento de raspador. Sem a
variável, o bloco de apoio não aparece: melhor não oferecer do que oferecer um
código que não leva a lugar nenhum.

Sem premiação, o fecho é outro: em vez do pedido, explica por que registrar um
torneio sem prêmio também vale — ele entra no ROI, na leitura de energia e na
comparação entre as vias.

---

## Banco de adversários e Modo Mesa

O CRM é o único módulo que muda decisão **durante** a mão, então foi construído
em torno do uso ao vivo, não do cadastro.

**A cor do perfil codifica ameaça, não categoria.** Seis matizes de badge — uma
por perfil — seriam ruído numa tela lida de relance embaixo da mesa. O selo
carrega uma informação só: âmbar para quem joga bem, jade para quem é
oportunidade. O nome do perfil está sempre ao lado, então nada depende da cor.
Os cartões chegam agrupados em **Cuidado / Imprevisíveis / Oportunidade**, que é
a pergunta real de quem senta na mesa.

**A hierarquia do cartão segue a urgência.** Nome, perfil e "como explorar"
ficam visíveis; pontos fortes, histórico e registro de campo ficam atrás de um
toque. O que serve para estudar não pode disputar espaço com o que serve para a
mão em andamento.

**Anotação de poker envelhece, e o produto assume isso.** Cada adversário guarda
`atualizadoEm`, e uma leitura de mais de quatro meses aparece com aviso — o
adversário estuda, corrige o vazamento que você anotou, muda de stake. Exibir
uma leitura vencida com a mesma confiança de uma de ontem é pior do que não
exibir nada.

**A captura tem que ser mais rápida que a mão.** Anotar é escolher um tipo e
escrever; Enter salva. Se exigisse abrir formulário e sair da mesa, ninguém
anotaria — e um banco de adversários vazio não ajuda ninguém.

---

## Diário mental

**O check-in é um freio, não um formulário.** Responder "sim" a "estou tentando
recuperar perdas?" interrompe o fluxo e mostra o histórico do próprio jogador
naquele estado. Duas regras seguram a honestidade disso:

- **"Vou jogar mesmo assim" continua sendo um botão de verdade.** Um freio que
  não pode ser solto vira obstáculo, e o jogador simplesmente passa a responder
  a pergunta de forma conveniente — que é o único jeito de a feature perder todo
  o valor.
- **Não jogar é um resultado registrado, e celebrado.** O check-in fica salvo
  como decisão consciente, não como campo em branco.

**Antes e depois não são a mesma coisa, e o texto sabe disso.** "Dormi bem?" é
respondido antes de sentar, então uma diferença no resultado pode ser lida como
influência. "Houve tilt?" é respondido depois — e tilt costuma ser consequência
de ter perdido. Cada contraste carrega seu momento, e as leituras pós-jogo saem
marcadas com a ressalva de que descrevem a sessão sem provar causa. Tratar as
duas igual faria o produto afirmar que evitar tilt melhora o resultado quando o
que os dados mostram é que perder provoca tilt.

**Profundidade parada com ITM muito diferente não é "nada acontecendo".** Quando
os dois lados terminam à mesma altura do campo mas convertem de forma distinta,
a leitura passa a falar de ITM — é ir igual de fundo e fechar menos, que é o
achado mais útil daquele contraste.

**O dia corrente vem do relógio do jogador**, resolvido no repositório junto com
o resto do estado de cliente. Comparar em UTC quebrava justamente no horário de
uso: às 21h em Brasília o UTC já virou o dia seguinte, e o check-in feito antes
de sentar deixava de contar como "hoje".

---

## A sessão ao vivo

O registro retroativo continua existindo — quem lança o torneio de ontem precisa
dele. Mas o caminho principal agora acompanha o torneio **enquanto ele
acontece**: o jogador marca como chegou, inicia quando a primeira mão é
distribuída e registra o stack a cada intervalo.

### Big blinds, nunca fichas

Quarenta mil fichas é uma montanha no nível 3 e é desespero no nível 18. Quem
joga torneio pensa em "tenho 22 blinds", porque é isso que decide se dá para
esperar mão ou se já é hora de empurrar.

Um gráfico de fichas subiria a sessão inteira mesmo com o jogador afundando —
os blinds crescem junto —, medindo a estrutura do torneio em vez do desempenho
de alguém. [`conferir-sessao.mts`](scripts/conferir-sessao.mts) fixa isso com o
caso que torna o erro visível: fichas de 40k para 60k enquanto o stack cai de 80
para 15 blinds.

A segunda régua é **quanto do campo já saiu**. Perder metade das fichas enquanto
metade do campo é eliminado não é perder terreno; é ficar no mesmo lugar. As
duas vão em pequenos múltiplos com escala própria, nunca num segundo eixo y —
sobrepô-las faria o cruzamento das linhas parecer significado.

### O que o formato ao vivo torna desnecessário perguntar

- **Duração** sai do cronômetro, não da memória de quem acabou de ser eliminado
  às três da manhã.
- **Energia** é respondida no começo, quando ainda descreve como a pessoa
  chegou. Perguntada no fim seria recordação contaminada pelo resultado — e é
  justamente essa a variável que o Oblix cruza com o desempenho.

### Três decisões de uso

**Nada é obrigatório num intervalo.** A tela é usada em pé, com dez minutos e
uma fila do banheiro. Um formulário exigente faria o jogador parar de registrar
no terceiro intervalo, e meia sessão anotada vale mais que nenhuma.

**Cada parada é gravada na hora.** O app passa seis horas indo para segundo
plano no bolso de alguém; perder o histórico do torneio inteiro por um refresh
acidental faria a feature nunca mais ser usada.

**A sessão vive no aparelho, não na conta.** Ninguém começa um torneio no
celular e termina no computador — é a mesma razão pela qual o Modo Mesa não
sincroniza. O que sobe para o Postgres é o torneio pronto.

O cronômetro conta a partir do instante gravado, e não somando segundos: o
navegador congela `setInterval` em segundo plano, que é exatamente onde o Oblix
passa a maior parte do torneio.

---

## Banca: aportes e saques

Sem eles a curva mente nos dois números que o jogador mais olha. Um saque de
R$ 900 que o Oblix não conhece vira prejuízo no gráfico; um aporte novo vira
lucro. Nenhum dos dois é resultado de poker, e tratá-los como tal inventa um
desempenho que não existiu.

**A banca inicial não é um conceito à parte — é o primeiro aporte.** Por isso se
corrige pelo mesmo caminho: quem digitou 5.000 em vez de 500 no cadastro não
recomeça nada. O ajuste fica no próprio cartão da banca, porque quem percebe que
o número está errado é exatamente quem acabou de olhar para ele.

---

## Corrigir um torneio

A alternativa anterior era punitiva além da conta: um dígito errado na premiação
custava apagar o registro e responder as quinze perguntas de novo. O erro mais
comum que existe não pode ter o preço mais alto do produto — é assim que alguém
decide parar de registrar.

A correção é **uma tela só, sem etapas**. O assistente existe para guiar quem
preenche pela primeira vez; quem veio corrigir já sabe o que quer mudar. A via de
entrada continua deduzida de "jogou o satélite" + "classificou", nunca perguntada
de novo — reabrir isso deixaria os dados se contradizerem justamente na coluna de
que todo o comparativo depende.

---

## Quando a internet oscila

Um jogador no clube tem sinal instável por seis horas seguidas. Duas coisas não
podem depender da rede: **ver** os próprios dados e **registrar** um intervalo.

**O espelho** resolve a primeira. Ao entrar na conta, a base do Postgres é
copiada para o aparelho; num carregamento seguinte ela aparece na hora, e a
nuvem substitui quando (e se) responder. Um painel vazio esperando resposta é
pior do que dados de dois minutos atrás, porque painel vazio parece perda de
dados. O espelho é por usuário e some ao sair — num aparelho compartilhado, o
painel do próximo não pode ser o do anterior.

**A fila** resolve a segunda. Escrita que a rede recusa vira pendência; a
interface diz quantas são e que nada se perdeu, e elas sobem sozinhas quando o
sinal volta. Como o espelho já guarda o estado final, o reenvio manda a base
inteira em upsert por id, em vez de reproduzir uma sequência de chamadas que
pode ter ficado fora de ordem.

Duas falhas silenciosas foram corrigidas no caminho e valem registro: a camada
de nuvem **engolia** o erro de escrita, então a interface dizia "salvo" enquanto
o Postgres nunca recebia nada — a pior falha possível num app de registro,
descoberta só ao trocar de aparelho. E uma leitura rejeitada deixava a tela presa
em "Sincronizando…" para sempre, indistinguível de um app quebrado.

**O service worker** ([`sw.js`](public/sw.js)) fecha o resto: recarregar a
página sem sinal nenhum. Seis horas de clube incluem trocar de aba, o sistema
descartar a página e o jogador reabrir — sem ele, o navegador não conseguia nem
buscar o app.

Três regras, e a última é a que mais importa:

- **Navegação vai à rede primeiro** e cai no cache quando falha. Um app de
  registro não pode servir versão velha havendo conexão; o cache é rede de
  segurança, não fonte de verdade.
- **Estáticos do Next vêm do cache primeiro.** Os nomes carregam hash do
  conteúdo: se o nome é o mesmo, o arquivo é o mesmo.
- **Supabase nunca passa pelo service worker.** Dado de conta servido de cache
  seria pior que erro de rede — mostraria a base de um usuário depois de outro
  entrar. O app já sabe lidar com a falha: tem espelho e fila.

O Oblix também é **instalável na tela inicial**. Quem passa a noite num clube
quer o app junto dos outros, em tela cheia e a um toque no intervalo. O convite
só aparece quando o navegador diz que dá para instalar, e some para sempre
depois de recusado.

---

## Metas e saúde técnica

As duas dependem de um número que o Oblix **não tem como medir sozinho**, e cada
uma resolve isso de um jeito diferente.

**Nas metas, o jogador define só o alvo.** O valor atingido continua saindo dos
registros, e é isso que impede a meta de virar um checkbox que alguém marca
sozinho. Pelo mesmo motivo as quatro chaves são fixas: cada uma corresponde a
uma métrica que o produto já calcula, e uma meta livre — "estudar duas horas por
semana" — seria uma promessa que ninguém tem como verificar.

A edição fica no próprio cartão do Dashboard, não numa página à parte: quem
decide mudar um alvo é justamente quem acabou de olhar o progresso. E "no ritmo"
é sempre dois terços do alvo, em vez de um número absoluto — assim quem troca 20
mesas finais por 6 continua sendo lido com o mesmo critério, e nenhuma meta
editada nasce atrasada por acidente.

**Na saúde técnica, o jogador digita os números.** VPIP, PFR e companhia vêm do
tracker ou da sala, e o Oblix não importa histórico de mãos — estimar por
aproximação atribuiria a alguém um estilo que ninguém mediu, justamente no cartão
que serve para se corrigir.

O momento de informar é ao registrar um torneio, e o que evita que isso vire
pedágio são duas escolhas: o bloco vem **fechado e é opcional** (campo
obrigatório que a pessoa não pode responder na hora vira número inventado, que é
pior do que nada), e vem **preenchido com a última medição**, então confirmar é
um clique quando nada mudou.

Guardar uma **série datada**, e não dois retratos de "atual" e "anterior", é o
que faz a cadência virar dado: quem joga todo dia mede quase sempre, quem joga
uma vez por mês mede uma vez por mês, e o cartão consegue dizer "medido há cinco
meses" — com aviso a partir de quatro, o mesmo limiar das leituras de adversário
e pela mesma razão.

---

## Decisões de análise que valem conhecer

**Profundidade em vez de ROI para amostras pequenas.** ROI vira de sinal com um
único prêmio grande. `profundidade()` mede a fração do campo que ficou para trás
(0 = primeiro eliminado, 1 = campeão) usando *todos* os torneios, não só os
premiados. É o que permite ler a relação energia → resultado com 12 registros.

**Insights têm piso de amostra.** Nada com menos de 6 registros vira insight
([`insights.ts`](src/lib/calc/insights.ts)). A leitura de energia agrega as duas
pontas da escala em vez de eleger níveis isolados — sem isso o painel afirmaria
que "descansado" rende mais que "muito descansado", que é ruído.

---

## Sistema de cor

Toda cor de dado passou pelo validador de paleta em modo dark sobre a superfície
`#0E1011`. As decisões e os resultados estão registrados em
[`palette.ts`](src/lib/viz/palette.ts).

A tríade que aparece simultaneamente em tela — jade `#199e70`, azul `#3987e5`,
laranja `#d95926` — passa `--pairs all`: CVD ΔE 9,4 (alvo ≥ 8), visão normal
ΔE 20,9 (piso ≥ 15), todas ≥ 3:1 de contraste.

**Teto de 3 séries simultâneas.** Nenhum conjunto de 4 matizes passa `--pairs
all` nas faixas do modo dark — foi verificado por busca exaustiva, não estimado.
Acima de três, dobrar em "Outros" ou facetar.

Os papéis são separados de propósito:

- **jade / vermelho / âmbar = estado** (lucro, prejuízo, atenção). Nunca viram
  "série 4", e sempre vêm com ícone + rótulo, então a cor nunca informa sozinha.
- **azul / laranja = identidade** (entrada direta × via satélite). Não carregam
  juízo de bom ou ruim — é justamente isso que o produto quer descobrir, então a
  cor não pode antecipar a resposta.
- **conquista não recebe matiz, recebe luz.** Título e mesa final aparecem em
  tinta branca com brilho, evitando disputar significado com o âmbar.

Todo gráfico tem gêmea tabular ("Ver como tabela"), a curva tem crosshair com
navegação por setas, e métricas de unidades diferentes vão para pequenos
múltiplos com escala própria — nunca para um segundo eixo y.

---

## Base de demonstração

[`seed.ts`](src/lib/data/seed.ts) gera 101 torneios e 56 satélites ao longo de 14
meses a partir de um PRNG semeado: os mesmos registros saem no servidor e no
cliente, sem divergência de hidratação. "Hoje" é constante, não `new Date()`.

Duas regras a mantêm plausível:

- **Gestão de banca.** Nenhum buy-in acima de 1/28 da banca. Sem isso a série
  fura o zero numa sequência ruim, e banca negativa não existe.
- **Causalidade real.** A energia é sorteada **antes** da colocação e governa o
  expoente da distribuição: cansaço → decisões piores → elimina mais cedo. O
  satélite entra nessa cadeia só como custo de energia. O motor de análise não é
  informado de nada disso — ele precisa encontrar o padrão nos dados, que é
  exatamente o que a feature promete fazer com dados reais.

Para conferir os números da base:

```bash
npx tsx scripts/conferir-dados.ts
npx tsx scripts/conferir-vazio.ts    # a base vazia como estado de primeira classe
npx tsx scripts/conferir-schema.mts  # o schema do Supabase, com RLS de verdade
npx tsx scripts/conferir-mapa.mts    # domínio ↔ Postgres, em ida e volta
npx tsx scripts/conferir-pix.mts     # o BR Code do apoio
npx tsx scripts/conferir-sessao.mts  # a leitura da sessão ao vivo
```

O segundo confere o oposto do primeiro: que a cadeia inteira de análise
atravessa zero registros sem estourar índice e sem inventar conclusão. É barato
quebrar isso de um jeito que nenhum teste de tela pegaria, porque o painel cheio
da demonstração continuaria funcionando.

Quando houver backend, a troca é localizada: `seed.ts` exporta as mesmas
estruturas que uma consulta ao Supabase devolveria, e nada em `calc/` sabe de
onde os dados vieram.

---

## Backend (em construção)

O schema está em
[`supabase/migrations/`](supabase/migrations/20260808000000_inicial.sql) e
espelha `src/lib/types.ts`. Três decisões o atravessam:

- **Toda tabela carrega `usuario_id` e tem RLS ligada, sem exceção.** Um painel
  de poker guarda quanto a pessoa ganha, contra quem joga e o que ela escreveu
  sobre a própria cabeça depois de perder.
- **Dinheiro é `numeric(12,2)`, nunca `float`.** Os valores são somados centenas
  de vezes para formar a curva, e ponto flutuante acumularia erro justamente na
  figura herói do painel.
- **`via = 'satelite'` exige vínculo, por CHECK.** O banco recusa a contradição
  que o formulário já evita, porque é dessa coluna que todo o comparativo
  depende.

Duas tabelas não existiam no MVP e nasceram de decisões de produto:
`saude_tecnica` guarda **uma linha por medição** em vez de dois retratos fixos
(o jogador informa os números quando vai sentar, na cadência em que ele jogar,
então a frequência vira dado em vez de suposição); e `metas` guarda **só o
alvo**, porque o valor atingido continua sendo calculado dos registros — é o que
impede a meta de virar um checkbox.

O schema é testado contra um Postgres de verdade (PGlite, sem Docker), e o teste
verifica principalmente o que precisa **falhar**: que um usuário não lê, não
grava e não apaga nada de outro.

```bash
npx tsx scripts/conferir-schema.mts
```

### Ligando o seu projeto

```bash
cp .env.example .env.local   # preencha com a URL e a chave anon
```

Depois aplique as migrações:

```bash
npx tsx scripts/migrar.mts       # todas, em ordem
```

**Não use o SQL Editor do painel para isso.** Ele respondeu `Success` quatro
vezes seguidas sem que a restrição no banco mudasse, e sem nenhum sinal de que
algo tinha falhado — um caminho que não avisa quando não funciona é pior do que
um que quebra. O script roda cada arquivo numa transação e **confere o resultado
no banco** antes de dizer que terminou; se a verificação não bater, ele sai com
erro.

Precisa de `DATABASE_URL` no `.env.local`, da aba **Session pooler** (a conexão
direta do Supabase é IPv6-only e não resolve em rede sem IPv6).

**Só a chave `anon` entra no `.env.local`.** A `service_role` ignora RLS, e toda
variável `NEXT_PUBLIC_*` é embutida no bundle do navegador — publicá-la daria a
qualquer visitante acesso total aos dados de todos os usuários. Se ela for
exposta por engano, rotacione em *Settings → API*.

Em *Authentication → Sign In / Providers → Email*, três estados param o cadastro
e são fáceis de confundir entre si, porque o sintoma é parecido:

| Estado | O que o servidor responde |
|---|---|
| Provedor de e-mail desligado | `email_provider_disabled` |
| Confirmação ligada | Cadastro sem sessão — cai na tela "confirme o seu e-mail" |
| Confirmação ligada, cota estourada | `429 email rate limit exceeded` |

O SMTP embutido de projeto gratuito manda pouquíssimos e-mails por hora. Para
testar sem depender disso, crie o usuário à mão em *Authentication → Users* com
**Auto Confirm User** marcado: nenhum e-mail é enviado.

**Sem essas variáveis o Oblix funciona igual**, em `localStorage`, e nada de
conta aparece na interface. Não é hedge: é o que permite clonar o repositório e
ver a demonstração rodando em trinta segundos, sem criar projeto na nuvem antes.
Um botão "Entrar" que não pode funcionar é pior do que botão nenhum.

### Como o cliente conversa com o banco

**Só existe cliente de navegador.** Todas as telas são client components e o
HTML sai estático; não há consulta no servidor para proteger, então não há
middleware de sessão nem cliente de servidor. Quem impede um usuário de ler os
dados de outro é a RLS, não uma verificação no meio do caminho — e é melhor
assim: uma checagem que se pode esquecer de escrever protege menos que uma
política que nega por padrão.

**Carrega tudo uma vez, escreve atravessando.** A base inteira vem numa leva no
login e vive em memória; cada alteração muda a memória na hora e vai para o
banco em seguida, sem bloquear a tela. O painel calcula banca, ROI e comparação
entre vias sobre a série completa, então paginar não economizaria nada — e
manter a leitura síncrona é o que preserva as trinta telas como estão. Poker se
anota no celular dentro do clube, com sinal ruim: travar esperando um POST seria
o pior desenho possível, e o erro, quando vem, aparece como aviso em vez de
perder o que a pessoa digitou.

**A mesa em andamento não sobe.** Quem está sentado com você agora é estado do
aparelho, não da conta.

**A tradução entre domínio e banco mora em [`mapa.ts`](src/lib/data/mapa.ts)**,
sem nenhuma dependência do Supabase — o que permite exercitá-la em ida e volta
contra o schema real:

```bash
npx tsx scripts/conferir-mapa.mts
```

É o teste que pega a classe de erro mais silenciosa daqui: um `tresBet` que
virou `tres_bet` em cinco lugares e `tresbet` no sexto não quebra o build, só faz
o número sumir da tela. Ele também garante que `numeric` volte como número — o
driver entrega `"150.00"`, e somar isso sem converter produziria concatenação de
texto passando por soma de dinheiro.

**Os ids são UUID desde o começo**, inclusive antes de existir conta. As chaves
primárias no Postgres são `uuid`, então o formato antigo (`trn-local-a1b2c3d4`)
seria recusado na hora de migrar. Um formato só, válido nos dois lados, elimina
a tradução de ids na travessia — e é ele que distingue o que o jogador criou da
base semeada, cujas chaves são curtas e legíveis (`trn-14`, `jog-3`).

### Conta e migração

Entrar e cadastrar são a mesma tela: quem chega não sabe dizer se já tem conta, e
dois caminhos separados só produzem a escolha errada e um erro logo depois.

**O acesso existe em três lugares, e nenhum deles é opcional.** As boas-vindas
oferecem "já tenho conta" ao lado das duas bases; a barra lateral tem o controle
no computador; e a barra inferior tem o sétimo destino no celular. Faltava
justamente o caminho do celular — o controle de conta vivia só na barra lateral,
que é `hidden lg:flex` —, então quem já tinha conta e abria o Oblix no telefone
**nunca alcançava os próprios dados**. Num app usado dentro do clube, o aparelho
sem acesso era o principal.

O que já estava no navegador é **oferecido, não engolido**. A ordem natural de
uso é ao contrário da técnica — a pessoa experimenta, registra alguns torneios e
só então cria conta. Subir tudo sozinho seria decidir por ela o que fazer com
dados que talvez fossem só teste; perder esses registros seria punir justamente
quem se convenceu.
