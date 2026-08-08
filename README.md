# Oblix

Sistema operacional para jogadores de poker. Este repositório contém o MVP das
duas primeiras entregas: o **Dashboard** e a feature de **Satélites**.

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
| `/torneios` | Histórico com filtros; apaga só o que você registrou |
| `/torneios/novo` | Registro em 4 etapas, com o pedido de apoio ao final |
| `/jogadores` | Banco de adversários: busca, edição e registro de campo |
| `/mesa` | **Modo Mesa** — as leituras dos adversários sentados com você |
| `/diario` | Check-in pré-jogo, fecho da sessão e o cruzamento estado × resultado |

Todo o PRD está construído. Metas não tem página própria de propósito: o
conteúdo inteiro já vive no Dashboard, e uma entrada desabilitada na navegação
seria promessa vazia.

O que você registra é gravado em `localStorage` e entra imediatamente em todos
os cálculos — banca, ROI, satélites, insights. Não há backend ainda.

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

O PRD pede que, ao registrar uma premiação, o produto apresente o pedido de
apoio (5% / 10% / 15% / outro valor / agora não). Está em
[`Conclusao.tsx`](src/components/torneios/Conclusao.tsx), e segue duas regras
deliberadas:

- **"Agora não" é um botão de verdade** — mesmo tamanho, mesmo contraste, ao
  lado do botão de apoiar. Um produto gratuito que esconde a saída do pedido de
  doação deixa de parecer gratuito.
- **Nada é cobrado e nada é simulado.** Não há integração de pagamento ligada; a
  tela de agradecimento diz isso com todas as letras em vez de encenar uma
  transação que não aconteceu.

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

Depois aplique `supabase/migrations/20260808000000_inicial.sql` no SQL Editor do
Supabase.

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

O que já estava no navegador é **oferecido, não engolido**. A ordem natural de
uso é ao contrário da técnica — a pessoa experimenta, registra alguns torneios e
só então cria conta. Subir tudo sozinho seria decidir por ela o que fazer com
dados que talvez fossem só teste; perder esses registros seria punir justamente
quem se convenceu.
