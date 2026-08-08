"use client";

import {
  DIARIO,
  HOJE,
  JOGADORES,
  MEDICOES,
  MOVIMENTOS,
  PERFIL,
  SATELITES,
  TORNEIOS,
} from "@/lib/data/seed";
import { CHAVES_META } from "@/lib/types";
import { obterSupabase, supabaseConfigurado } from "@/lib/supabase/cliente";
import * as nuvem from "@/lib/data/nuvem";
import {
  diarioParaLinha,
  medicaoParaLinha,
  metaParaLinha,
  movimentoParaLinha,
  sateliteParaLinha,
  torneioParaLinha,
} from "@/lib/data/mapa";
import type {
  ChaveMeta,
  DiarioMental,
  Jogador,
  MedicaoTecnica,
  MetaDefinida,
  MovimentoBankroll,
  NivelEnergia,
  ParadaSessao,
  PreparoSessao,
  SessaoAoVivo,
  NotaJogador,
  Perfil,
  Satelite,
  Torneio,
} from "@/lib/types";

/**
 * Repositório do Oblix.
 *
 * Sem backend ainda: o que o jogador registra fica em localStorage. O que este
 * arquivo resolve, e nenhuma tela precisa saber, são três travessias
 * servidor→cliente: os registros locais, o dia de calendário corrente e o
 * **modo da base**.
 *
 * O modo é a decisão estrutural aqui. O Oblix abre numa base de demonstração de
 * 14 meses — é ela que torna o produto legível antes do primeiro registro. Mas
 * um jogador de verdade precisa dos próprios números, e misturar as duas coisas
 * arruinaria as duas: ROI de mentira contaminando o dele, e o painel dele vazio
 * sem nada para mostrar. Então são bases separadas, cada uma no seu balde:
 *
 *   demonstracao → base semeada + `oblix:registros:v1`
 *   proprio      → só `oblix:registros:proprio:v1`
 *
 * Trocar de modo não apaga nada dos dois lados, e é por isso que a troca pode
 * ser oferecida sem aviso dramático: quem entra nos próprios dados pode voltar
 * para a demonstração, e volta encontrando tudo onde deixou.
 *
 * O instantâneo do servidor devolve SEMPRE o modo demonstração. É o que evita
 * divergência de hidratação: o HTML do servidor não tem como conhecer o
 * localStorage, então o primeiro render do cliente precisa concordar com ele e
 * só depois incorporar a conta e os registros locais.
 */

const CHAVE_DEMO = "oblix:registros:v1";
const CHAVE_PROPRIO = "oblix:registros:proprio:v1";
const CHAVE_CONTA = "oblix:conta:v1";

export type ModoBase = "demonstracao" | "proprio";

export interface Registros {
  torneios: Torneio[];
  satelites: Satelite[];
  movimentos: MovimentoBankroll[];
  /**
   * Jogadores criados OU editados, indexados por id. Guardar o registro
   * inteiro (e não só o que mudou) mantém a fusão trivial: quem está aqui
   * vence a base semeada, ponto. Editar um adversário da demonstração
   * simplesmente cria a entrada dele aqui.
   */
  jogadores: Record<string, Jogador>;
  /** Quem está na mesa agora. Sobrevive a fechar o app no meio do torneio. */
  mesaAtual: string[];
  diario: DiarioMental[];
  medicoes: MedicaoTecnica[];
  /**
   * Alvos escolhidos pelo jogador, indexados por `ano:chave`. Ausência
   * significa "use o padrão" — não significa meta desligada, que é um estado
   * diferente e mora no campo `ativa`.
   */
  metas: Record<string, MetaDefinida>;
  /**
   * O torneio que está sendo jogado agora, se houver. Guardado junto com o
   * resto e gravado a cada parada: são seis horas de clube num celular, e o
   * app vai para segundo plano dezenas de vezes.
   */
  sessao: SessaoAoVivo | null;
}

/**
 * Quem está logado. Chamava-se "Sessao" e virou "Usuario" quando o domínio
 * reivindicou a palavra: no poker, sessão é o período em que se está jogando,
 * e disputar o termo dentro do mesmo estado só produziria leitura errada.
 */
export interface Usuario {
  id: string;
  email: string;
}

export interface Conta {
  modo: ModoBase;
  /** Só existe no modo próprio; na demonstração o perfil vem da base semeada. */
  perfil: Perfil | null;
}

export interface Estado extends Omit<Registros, "jogadores" | "metas"> {
  jogadores: Jogador[];
  /** Alvos do ano corrente, já resolvidos: os do jogador ou os padrões. */
  metas: Record<ChaveMeta, MetaDefinida | null>;
  modo: ModoBase;
  /** Quem o painel cumprimenta e de quem é o buy-in padrão. */
  perfil: Perfil;
  /**
   * O jogador já preencheu o próprio perfil alguma vez? É o que decide se
   * "usar meus dados" abre o formulário ou apenas troca a base de volta.
   */
  temPerfilProprio: boolean;
  /**
   * "Hoje" segundo a base em uso. Na demonstração é a data congelada do seed,
   * senão os 14 meses de história apareceriam como um bloco no passado remoto;
   * nos dados próprios é o relógio de verdade.
   */
  hoje: Date;
  /**
   * O cliente já leu o localStorage e sabe de quem é este painel?
   *
   * Separado de `decidiu` porque o servidor não pode responder "não decidiu" —
   * ele não pode responder nada. Fossem a mesma bandeira, o HTML do servidor
   * traria as boas-vindas embutidas e elas piscariam na cara de todo mundo que
   * já decidiu, a cada carregamento.
   */
  pronto: boolean;
  /**
   * O jogador já escolheu entre explorar a demonstração e usar os próprios
   * dados? Só significa alguma coisa depois de `pronto`.
   */
  decidiu: boolean;
  /**
   * A conta do Supabase, quando há uma. Nula significa que os dados próprios
   * moram só neste navegador — que continua sendo um modo de uso legítimo, e
   * não um estado degradado.
   */
  usuario: Usuario | null;
  /** Há projeto Supabase configurado? Sem isso, nada de conta aparece. */
  comNuvem: boolean;
  /** Carregando a base da nuvem agora. */
  sincronizando: boolean;
  /** Alterações que a rede recusou e ainda vão subir. */
  pendentes: number;
  /** O navegador acredita estar online. */
  online: boolean;
  /** O torneio em andamento, quando existe. */
  sessao: SessaoAoVivo | null;
  /** Quantos torneios vieram do jogador, e não da base de demonstração. */
  proprios: number;
  /**
   * Dia de calendário local do jogador, `AAAA-MM-DD`. Nulo no servidor, que
   * não tem como saber o fuso de quem vai ler.
   *
   * É sempre o dia real, inclusive na demonstração: um check-in feito agora é
   * gravado com o relógio agora, então é contra ele que precisa ser comparado.
   */
  diaCorrente: string | null;
}

const vazio: Registros = {
  torneios: [],
  satelites: [],
  movimentos: [],
  jogadores: {},
  mesaAtual: [],
  diario: [],
  medicoes: [],
  metas: {},
  sessao: null,
};

const CONTA_INICIAL: Conta = { modo: "demonstracao", perfil: null };

/** O perfil de quem começou do zero e ainda não preencheu nada. */
const PERFIL_NEUTRO: Perfil = {
  nome: "Jogador",
  nick: "eu",
  objetivo: "Evolução",
  modalidade: "MTT",
  clubes: [],
  buyInPadrao: 100,
  bankrollInicial: "R$ 0",
  desde: new Date(0).toISOString(),
};

interface Base {
  torneios: Torneio[];
  satelites: Satelite[];
  movimentos: MovimentoBankroll[];
  jogadores: Jogador[];
  diario: DiarioMental[];
  medicoes: MedicaoTecnica[];
}

const BASE_DEMO: Base = {
  torneios: TORNEIOS,
  satelites: SATELITES,
  movimentos: MOVIMENTOS,
  jogadores: JOGADORES,
  diario: DIARIO,
  medicoes: MEDICOES,
};

const BASE_VAZIA: Base = {
  torneios: [],
  satelites: [],
  movimentos: [],
  jogadores: [],
  diario: [],
  medicoes: [],
};

const baseDe = (modo: ModoBase) => (modo === "demonstracao" ? BASE_DEMO : BASE_VAZIA);

function ordenarPorData<T extends { data: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => a.data.localeCompare(b.data));
}

function fundirJogadores(base: Jogador[], locais: Record<string, Jogador>): Jogador[] {
  const fundidos = base.map((j) => locais[j.id] ?? j);
  const idsBase = new Set(base.map((j) => j.id));
  const novos = Object.values(locais).filter((j) => !idsBase.has(j.id));
  return [...fundidos, ...novos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function diaLocalDe(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// Declarados aqui, e não junto do resto do estado mutável mais abaixo, porque
// `montar()` os lê — e `montar()` é chamado no topo do módulo para construir o
// instantâneo do servidor. Um `let` declarado depois dessa chamada cairia na
// zona morta temporal e o build quebraria só na pré-renderização.
let conta: Conta = CONTA_INICIAL;
let usuario: Usuario | null = null;
let sincronizando = false;
/** Escritas que a rede recusou e ainda precisam subir. */
let pendentes = 0;
let escoando = false;
// Otimista no servidor: `navigator` não existe lá, e assumir "offline" faria o
// HTML sair com um aviso de rede que quase nunca é verdade.
let online = true;

function montar(
  locais: Registros,
  conta: Conta,
  pronto: boolean,
  decidiu: boolean,
  diaCorrente: string | null,
): Estado {
  const base = baseDe(conta.modo);
  return {
    modo: conta.modo,
    usuario,
    comNuvem: supabaseConfigurado,
    sincronizando,
    pendentes,
    online,
    pronto,
    decidiu,
    diaCorrente,
    perfil: conta.modo === "demonstracao" ? PERFIL : (conta.perfil ?? PERFIL_NEUTRO),
    temPerfilProprio: conta.perfil !== null,
    hoje: conta.modo === "demonstracao" ? HOJE : new Date(),
    torneios: ordenarPorData([...base.torneios, ...locais.torneios]),
    satelites: ordenarPorData([...base.satelites, ...locais.satelites]),
    movimentos: ordenarPorData([...base.movimentos, ...locais.movimentos]),
    jogadores: fundirJogadores(base.jogadores, locais.jogadores),
    mesaAtual: locais.mesaAtual,
    diario: ordenarPorData([...base.diario, ...locais.diario]),
    medicoes: ordenarPorData([...base.medicoes, ...locais.medicoes]),
    metas: resolverMetas(locais.metas, anoDe(conta.modo)),
    sessao: locais.sessao,
    proprios: locais.torneios.length,
  };
}

const anoDe = (modo: ModoBase) =>
  (modo === "demonstracao" ? HOJE : new Date()).getUTCFullYear();

/**
 * Achata os alvos guardados no ano corrente.
 *
 * Metas são do ano: virou o ano, os alvos voltam ao padrão em vez de arrastar
 * uma promessa de doze meses atrás. Devolver `null` para o que não foi definido
 * deixa a decisão de qual é o padrão onde ela pertence — em `painel.ts`, que é
 * quem sabe quanto o jogador aportou e o que faz sentido como alvo de banca.
 */
function resolverMetas(
  guardadas: Record<string, MetaDefinida>,
  ano: number,
): Record<ChaveMeta, MetaDefinida | null> {
  const saida = {} as Record<ChaveMeta, MetaDefinida | null>;
  for (const chave of CHAVES_META) saida[chave] = guardadas[`${ano}:${chave}`] ?? null;
  return saida;
}

/** Instantâneo do servidor: imutável e sempre a mesma referência. */
const ESTADO_SERVIDOR: Estado = montar(vazio, CONTA_INICIAL, false, false, null);

let decidiu = false;
let locais: Registros = vazio;
let diaCorrente: string | null = null;
let instantaneo: Estado = ESTADO_SERVIDOR;
let carregado = false;

const ouvintes = new Set<() => void>();

function avisar() {
  // Referência nova a cada mutação — é assim que useSyncExternalStore sabe
  // que precisa re-renderizar. Guardar o objeto entre chamadas (em vez de
  // remontá-lo em getSnapshot) é o que impede o laço infinito de render.
  instantaneo = montar(locais, conta, carregado, decidiu, diaCorrente);
  ouvintes.forEach((f) => f());
}

const chaveDe = (modo: ModoBase) => (modo === "demonstracao" ? CHAVE_DEMO : CHAVE_PROPRIO);

function ler(modo: ModoBase): Registros {
  if (typeof window === "undefined") return vazio;
  try {
    const bruto = window.localStorage.getItem(chaveDe(modo));
    if (!bruto) return vazio;
    const dados = JSON.parse(bruto) as Partial<Registros>;
    if (dados.jogadores) dados.jogadores = traduzirPerfis(dados.jogadores);
    return {
      torneios: dados.torneios ?? [],
      satelites: dados.satelites ?? [],
      movimentos: dados.movimentos ?? [],
      jogadores: dados.jogadores ?? {},
      mesaAtual: dados.mesaAtual ?? [],
      diario: dados.diario ?? [],
      medicoes: dados.medicoes ?? [],
      metas: dados.metas ?? {},
      sessao: dados.sessao ?? null,
    };
  } catch {
    // Armazenamento corrompido ou indisponível (modo privado, cota estourada):
    // seguir com a base semeada é melhor do que derrubar o painel.
    return vazio;
  }
}

/**
 * Traduz os perfis de adversário gravados antes de eles virarem português.
 *
 * Roda na leitura, e não numa migração de uma vez: o balde da demonstração e o
 * dos dados próprios são lidos em momentos diferentes, e um jogador pode
 * voltar num navegador que ficou meses sem abrir. Converter no ponto de
 * entrada é o único lugar que pega todos os casos.
 */
const PERFIS_ANTIGOS: Record<string, string> = {
  TAG: "Sólido",
  LAG: "Solto agressivo",
  Nit: "Pão-duro",
  Rock: "Múmia",
  "Calling Station": "Paga-tudo",
};

function traduzirPerfis(jogadores: Record<string, Jogador>): Record<string, Jogador> {
  let mudou = false;
  const saida: Record<string, Jogador> = {};
  for (const [id, j] of Object.entries(jogadores)) {
    const novo = PERFIS_ANTIGOS[j.perfil as string];
    if (novo) mudou = true;
    saida[id] = novo ? { ...j, perfil: novo as Jogador["perfil"] } : j;
  }
  return mudou ? saida : jogadores;
}

function gravar() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chaveDe(conta.modo), JSON.stringify(locais));
  } catch {
    /* sem espaço ou sem permissão — o estado em memória continua válido */
  }
}

/**
 * Onde uma alteração é gravada.
 *
 * Logado e nos dados próprios, vai para o Postgres **e** para o espelho local;
 * caso contrário, só para o localStorage. Gravar nos dois é o que faz uma
 * oscilação de rede não custar nada: o Postgres é a verdade, o espelho é o que
 * garante que a verdade continue na tela quando o sinal cai no meio do torneio.
 *
 * A escrita na nuvem é disparada sem espera de propósito — a memória já mudou e
 * a tela já mostra o novo estado. Poker se anota no celular, dentro do clube,
 * com sinal ruim; travar a interface esperando um POST seria o pior desenho
 * possível. Se a chamada falhar, a alteração entra na fila e sobe depois.
 */
function persistir(naNuvem?: () => Promise<unknown>) {
  if (usuario && conta.modo === "proprio") {
    espelhar();
    if (naNuvem) void comFila(naNuvem);
    return;
  }
  gravar();
}

// ── resiliência a rede ─────────────────────────────────────────────────────
//
// Um jogador no clube tem sinal instável por seis horas seguidas. Duas coisas
// não podem depender da rede: **ver** os próprios dados e **registrar** um
// intervalo. O espelho resolve a primeira; a fila resolve a segunda.

const chaveEspelho = (id: string) => `oblix:espelho:${id}`;
const CHAVE_FILA = "oblix:fila:v1";

/**
 * Guarda no aparelho uma cópia do que veio da nuvem.
 *
 * Sem ela, abrir o app sem sinal mostra um painel vazio — o que é pior do que
 * mostrar dados de dois minutos atrás, porque um painel vazio parece perda de
 * dados. É por usuário: num aparelho compartilhado, o espelho de um não pode
 * aparecer para o outro.
 */
function espelhar() {
  if (typeof window === "undefined" || !usuario) return;
  try {
    window.localStorage.setItem(chaveEspelho(usuario.id), JSON.stringify(locais));
  } catch {
    /* cota estourada: a memória e o Postgres continuam corretos */
  }
}

function lerEspelho(id: string): Registros | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(chaveEspelho(id));
    if (!bruto) return null;
    const d = JSON.parse(bruto) as Partial<Registros>;
    return {
      torneios: d.torneios ?? [],
      satelites: d.satelites ?? [],
      movimentos: d.movimentos ?? [],
      jogadores: traduzirPerfis(d.jogadores ?? {}),
      mesaAtual: d.mesaAtual ?? [],
      diario: d.diario ?? [],
      medicoes: d.medicoes ?? [],
      metas: d.metas ?? {},
      sessao: d.sessao ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Executa a escrita e, se ela falhar, conta como pendente.
 *
 * A fila guarda o NÚMERO de pendências e não as operações: o espelho já tem o
 * estado final, então reenviar a base inteira ao reconectar é mais simples e
 * mais correto do que reproduzir uma sequência de chamadas que pode ter ficado
 * fora de ordem. O contador existe para a interface poder ser honesta sobre o
 * que ainda não subiu.
 */
async function comFila(op: () => Promise<unknown>) {
  try {
    await op();
    // Uma escrita que passa é sinal de que a rede voltou: é o momento certo
    // de tentar escoar o que ficou para trás, sem esperar evento de sistema.
    if (pendentes > 0) void escoar();
  } catch {
    // Uma pendência por ALTERAÇÃO, não por chamada: `registrar` dispara três
    // escritas em sequência, e contar cada uma faria o aviso na tela dizer
    // "3 alterações" para um único torneio.
    pendentes++;
    gravarFila();
    avisar();
  }
}

function gravarFila() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAVE_FILA, String(pendentes));
  } catch {
    /* idem */
  }
}

/** Reenvia tudo o que está em memória. Idempotente: são upserts por id. */
async function escoar() {
  if (escoando || !usuario || !pendentes) return;
  escoando = true;
  const erro = await nuvem.migrarParaNuvem(locais, usuario.id);
  escoando = false;
  if (!erro) {
    pendentes = 0;
    gravarFila();
    avisar();
  }
}

export const temPendencias = () => pendentes;

function gravarConta() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAVE_CONTA, JSON.stringify(conta));
  } catch {
    /* idem: a escolha vale para esta sessão mesmo sem conseguir persistir */
  }
}

function lerConta(): { conta: Conta; decidiu: boolean } {
  if (typeof window === "undefined") return { conta: CONTA_INICIAL, decidiu: false };
  try {
    const bruto = window.localStorage.getItem(CHAVE_CONTA);
    // Ausência da chave é justamente o sinal de primeira visita.
    if (!bruto) return { conta: CONTA_INICIAL, decidiu: false };
    const dados = JSON.parse(bruto) as Partial<Conta>;
    const modo: ModoBase = dados.modo === "proprio" ? "proprio" : "demonstracao";
    return { conta: { modo, perfil: dados.perfil ?? null }, decidiu: true };
  } catch {
    return { conta: CONTA_INICIAL, decidiu: false };
  }
}

export function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  if (!carregado) {
    carregado = true;
    const lida = lerConta();
    conta = lida.conta;
    decidiu = lida.decidiu;
    locais = ler(conta.modo);
    diaCorrente = diaLocalDe(new Date());
    // Sempre avisa, mesmo sem registros locais: o dia corrente sozinho já é
    // uma diferença em relação ao instantâneo do servidor.
    avisar();
    // A sessão do Supabase chega depois, sem bloquear o primeiro render: o
    // painel aparece com o que já está neste navegador e é substituído pelo da
    // conta quando ela responde.
    pendentes = Number(window.localStorage.getItem(CHAVE_FILA) ?? 0) || 0;
    online = navigator.onLine;
    // Voltar a ter sinal é o momento exato de tentar de novo — esperar a
    // próxima ação do jogador deixaria o registro parado sem motivo.
    window.addEventListener("online", () => {
      online = true;
      avisar();
      void escoar();
    });
    window.addEventListener("offline", () => {
      online = false;
      avisar();
    });
    void recuperarSessao();
  }
  return () => ouvintes.delete(ouvinte);
}

export const obterInstantaneo = () => instantaneo;
export const obterInstantaneoServidor = () => ESTADO_SERVIDOR;

// ── conta e modo da base ───────────────────────────────────────────────────

/** Troca a base em uso. Nada é apagado: cada modo tem o seu próprio balde. */
export function usarModo(modo: ModoBase) {
  if (conta.modo === modo) {
    decidiu = true;
    gravarConta();
    avisar();
    return;
  }
  conta = { ...conta, modo };
  locais = ler(modo);
  decidiu = true;
  gravarConta();
  avisar();
}

/** Aceita a demonstração como base — o caminho de quem só quer ver o produto. */
export const usarDemonstracao = () => usarModo("demonstracao");

/**
 * Entra nos dados próprios com o perfil recém-preenchido.
 *
 * A banca inicial vira um aporte de verdade, e não um número à parte: assim a
 * curva de bankroll começa do lugar certo sem que `serieBankroll` precise
 * conhecer o conceito de "saldo de abertura".
 */
export function comecarDoZero(perfil: Perfil, bancaInicial: number) {
  conta = { modo: "proprio", perfil };
  locais = ler("proprio");
  decidiu = true;

  const jaTemAbertura = locais.movimentos.some((m) => m.descricao === "Banca inicial");
  if (bancaInicial > 0 && !jaTemAbertura) {
    locais = {
      ...locais,
      movimentos: [
        ...locais.movimentos,
        {
          id: crypto.randomUUID(),
          data: new Date().toISOString(),
          tipo: "aporte",
          valor: bancaInicial,
          descricao: "Banca inicial",
        },
      ],
    };
  }

  gravarConta();
  persistir(async () => {
    const u = usuario?.id ?? "";
    if (conta.perfil) await nuvem.salvarPerfil(conta.perfil, u);
    const abertura = locais.movimentos.find((m) => m.descricao === "Banca inicial");
    if (abertura) await nuvem.gravar("movimentos", movimentoParaLinha(abertura, u), "a banca inicial");
  });
  avisar();
}

export function atualizarPerfil(perfil: Perfil) {
  if (conta.modo !== "proprio") return;
  conta = { ...conta, perfil };
  gravarConta();
  if (usuario) void nuvem.salvarPerfil(perfil, usuario.id);
  avisar();
}

// ── conta na nuvem ─────────────────────────────────────────────────────────

/**
 * Puxa a base do Postgres para a memória e passa a operar em cima dela.
 *
 * Entrar na conta implica estar nos dados próprios: os números da nuvem são os
 * do jogador, e deixá-lo logado olhando a demonstração seria mostrar dados de
 * mentira para quem acabou de pedir os dele.
 */
async function adotarSessao(nova: Usuario) {
  usuario = nova;
  sincronizando = true;
  conta = { ...conta, modo: "proprio" };
  decidiu = true;
  gravarConta();
  avisar();

  // O espelho entra primeiro: se houver cópia local, o painel aparece cheio
  // no mesmo instante, mesmo sem rede. A nuvem substitui em seguida, quando
  // (e se) responder.
  const copia = lerEspelho(nova.id);
  if (copia) {
    locais = copia;
    avisar();
  }

  // `finally` porque a bandeira precisa cair mesmo se a busca explodir: uma
  // tela parada em "Sincronizando…" é indistinguível de um app quebrado.
  try {
    const base = await nuvem.carregarDaNuvem();
    if (base) {
      locais = base.registros;
      if (base.perfil) {
        conta = { ...conta, perfil: base.perfil };
        gravarConta();
      }
      espelhar();
      if (pendentes > 0) void escoar();
    }
  } finally {
    sincronizando = false;
    avisar();
  }
}

export interface ResultadoAuth {
  erro: string | null;
  /** Cadastro que ficou pendente de confirmação por e-mail. */
  confirmar?: boolean;
}

/**
 * Mensagens do Supabase em português.
 *
 * As de configuração ("signups are disabled") entram junto com as de uso
 * porque são as que mais confundem: descrevem um estado do projeto, não um
 * erro de quem está digitando, e em inglês fazem a pessoa achar que errou a
 * senha. Dizer de quem é o problema é metade da mensagem.
 */
const TRADUZIR: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "User already registered": "Já existe uma conta com este e-mail. Tente entrar.",
  "Password should be at least 6 characters": "A senha precisa ter ao menos 6 caracteres.",
  "Email not confirmed": "Confirme o e-mail que enviamos antes de entrar.",
  "Email signups are disabled":
    "O cadastro por e-mail está desligado neste projeto. Quem administra precisa ativar o provedor de e-mail no Supabase.",
  "Signups not allowed for this instance":
    "Este projeto não está aceitando cadastros novos no momento.",
  "Email logins are disabled":
    "O login por e-mail está desligado neste projeto. Quem administra precisa ativar o provedor de e-mail no Supabase.",
  "For security purposes, you can only request this after 60 seconds":
    "Aguarde um minuto antes de tentar de novo.",
};

const traduzir = (m: string) => TRADUZIR[m] ?? m;

export async function entrar(email: string, senha: string): Promise<ResultadoAuth> {
  const sb = obterSupabase();
  if (!sb) return { erro: "Este Oblix não está ligado a nenhum projeto." };

  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) return { erro: traduzir(error.message) };
  if (!data.user) return { erro: "Não consegui entrar. Tente de novo." };

  await adotarSessao({ id: data.user.id, email: data.user.email ?? email });
  return { erro: null };
}

export async function cadastrar(email: string, senha: string): Promise<ResultadoAuth> {
  const sb = obterSupabase();
  if (!sb) return { erro: "Este Oblix não está ligado a nenhum projeto." };

  const { data, error } = await sb.auth.signUp({ email: email.trim(), password: senha });
  if (error) return { erro: traduzir(error.message) };

  // Sem sessão de volta quer dizer que o projeto exige confirmação por e-mail.
  // É um estado normal, não erro: a interface precisa dizer isso em vez de
  // deixar a pessoa achando que o cadastro falhou.
  if (!data.session || !data.user) return { erro: null, confirmar: true };

  await adotarSessao({ id: data.user.id, email: data.user.email ?? email });
  return { erro: null };
}

/**
 * Sai da conta e devolve o painel ao que existe neste navegador.
 *
 * Nada do que estava na nuvem fica em memória: o próximo login busca de novo.
 * Manter um resquício seria pior do que buscar duas vezes — num aparelho
 * compartilhado, o jogador seguinte veria os números do anterior.
 */
export async function sair() {
  const anterior = usuario;
  await obterSupabase()?.auth.signOut();
  // O espelho sai junto: num aparelho compartilhado, o painel do próximo não
  // pode ser o do anterior.
  if (anterior && typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(chaveEspelho(anterior.id));
    } catch {
      /* nada a fazer */
    }
  }
  usuario = null;
  locais = ler("proprio");
  avisar();
}

/** Restaura a sessão guardada pelo Supabase, no carregamento da página. */
async function recuperarSessao() {
  const sb = obterSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const u = data.session?.user;
  if (u) await adotarSessao({ id: u.id, email: u.email ?? "" });
}

/**
 * Sobe para a conta o que já estava neste navegador.
 *
 * Vale a pena existir porque a ordem natural de uso é ao contrário da ordem
 * técnica: a pessoa experimenta o Oblix, registra alguns torneios e só então
 * decide criar conta. Perder esses registros no login seria punir justamente
 * quem se convenceu.
 */
export async function migrarLocaisParaNuvem(): Promise<string | null> {
  if (!usuario) return "Você não está em nenhuma conta.";
  const guardados = ler("proprio");
  if (!guardados.torneios.length && !Object.keys(guardados.jogadores).length) {
    return "Não há nada neste navegador para subir.";
  }

  const erro = await nuvem.migrarParaNuvem(guardados, usuario.id);
  if (erro) return erro;

  const base = await nuvem.carregarDaNuvem();
  if (base) locais = base.registros;
  avisar();
  return null;
}

/** Quantos registros locais esperam por uma conta. */
export function contarLocaisPendentes(): number {
  const g = ler("proprio");
  return g.torneios.length + g.diario.length + Object.keys(g.jogadores).length;
}

export const definirTratadorDeFalha = nuvem.definirTratadorDeFalha;

// ── escrita ────────────────────────────────────────────────────────────────

export interface EntradaRegistro {
  torneio: Omit<Torneio, "id" | "sateliteId">;
  satelite: Omit<Satelite, "id" | "torneioId" | "valorVaga"> | null;
}

/**
 * Grava um torneio e, quando houver, o satélite que levou até ele. Os dois
 * saem juntos porque o vínculo é a razão de a feature existir: é ele que
 * permite comparar as duas vias de entrada depois.
 */
export function registrar(entrada: EntradaRegistro): Torneio {
  const idTorneio = crypto.randomUUID();
  let idSatelite: string | null = null;

  if (entrada.satelite) {
    idSatelite = crypto.randomUUID();
    locais = {
      ...locais,
      satelites: [
        ...locais.satelites,
        {
          ...entrada.satelite,
          id: idSatelite,
          valorVaga: entrada.torneio.buyIn,
          // Só vira vínculo quando classificou: um satélite perdido é custo
          // avulso, não a entrada de um principal.
          torneioId: entrada.satelite.classificou ? idTorneio : null,
        },
      ],
    };
  }

  const torneio: Torneio = {
    ...entrada.torneio,
    id: idTorneio,
    sateliteId: entrada.torneio.via === "satelite" ? idSatelite : null,
  };

  locais = { ...locais, torneios: [...locais.torneios, torneio] };
  // Satélite antes do torneio: é o torneio que aponta para ele, e a chave
  // estrangeira recusaria a ordem inversa.
  persistir(async () => {
    const u = usuario?.id ?? "";
    const sat = idSatelite ? locais.satelites.find((x) => x.id === idSatelite) : null;
    if (sat) await nuvem.gravar("satelites", { ...sateliteParaLinha(sat, u), torneio_id: null }, "o satélite");
    await nuvem.gravar("torneios", torneioParaLinha(torneio, u), "o torneio");
    if (sat?.torneioId) await nuvem.gravar("satelites", sateliteParaLinha(sat, u), "o vínculo do satélite");
  });
  avisar();
  return torneio;
}

/**
 * Corrige um torneio já registrado, e o satélite vinculado junto.
 *
 * Sem isso, um dígito errado na premiação custava apagar o registro inteiro e
 * digitar tudo de novo — punição desproporcional para o erro mais comum que
 * existe, e o tipo de atrito que faz alguém parar de registrar.
 *
 * Só alcança o que o jogador criou: a base de demonstração é leitura, e deixar
 * editá-la faria os números do onboarding divergirem entre dois navegadores.
 */
export function atualizarTorneio(
  id: string,
  torneio: Omit<Torneio, "id" | "sateliteId">,
  satelite: Omit<Satelite, "id" | "torneioId" | "valorVaga"> | null,
): Torneio | null {
  const atual = locais.torneios.find((t) => t.id === id);
  if (!atual) return null;

  // O satélite vinculado é reaproveitado quando já existe, para o vínculo não
  // se perder a cada edição — e criado se o jogador passou a informar um.
  const vinculado = locais.satelites.find((s) => s.torneioId === id) ?? null;
  let idSatelite: string | null = vinculado?.id ?? null;
  let satelites = locais.satelites;

  if (satelite) {
    idSatelite ??= crypto.randomUUID();
    const novo: Satelite = {
      ...satelite,
      id: idSatelite,
      valorVaga: torneio.buyIn,
      torneioId: satelite.classificou ? id : null,
    };
    satelites = vinculado
      ? satelites.map((s) => (s.id === idSatelite ? novo : s))
      : [...satelites, novo];
  } else if (vinculado) {
    satelites = satelites.filter((s) => s.id !== vinculado.id);
    idSatelite = null;
  }

  const atualizado: Torneio = {
    ...torneio,
    id,
    sateliteId: torneio.via === "satelite" ? idSatelite : null,
  };

  locais = {
    ...locais,
    satelites,
    torneios: locais.torneios.map((t) => (t.id === id ? atualizado : t)),
  };

  persistir(async () => {
    const u = usuario?.id ?? "";
    const sat = satelites.find((s) => s.id === idSatelite);
    if (sat) await nuvem.gravar("satelites", { ...sateliteParaLinha(sat, u), torneio_id: null }, "o satélite");
    await nuvem.gravar("torneios", torneioParaLinha(atualizado, u), "o torneio");
    if (sat?.torneioId) await nuvem.gravar("satelites", sateliteParaLinha(sat, u), "o vínculo do satélite");
    if (!satelite && vinculado) await nuvem.apagar("satelites", "id", vinculado.id, "o satélite");
  });
  avisar();
  return atualizado;
}

export function remover(idTorneio: string) {
  locais = {
    ...locais,
    torneios: locais.torneios.filter((t) => t.id !== idTorneio),
    satelites: locais.satelites.filter((s) => s.torneioId !== idTorneio),
  };
  persistir(async () => {
    await nuvem.apagar("satelites", "torneio_id", idTorneio, "o satélite");
    await nuvem.apagar("torneios", "id", idTorneio, "o torneio");
  });
  avisar();
}

/** Apaga tudo que o jogador registrou na base em uso. */
export function limparProprios() {
  locais = vazio;
  gravar();
  avisar();
}

/**
 * Distingue o que o jogador criou do que veio da base semeada.
 *
 * O critério é o formato do id: tudo que ele cria é UUID, e a demonstração usa
 * chaves curtas e legíveis (`trn-14`, `jog-3`). Não é convenção gratuita — as
 * chaves primárias no Postgres são `uuid`, então um id no formato antigo
 * (`trn-local-a1b2c3d4`) seria recusado pelo banco na hora de migrar. Um
 * formato só, válido nos dois lados, elimina a tradução de ids na travessia.
 */
const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ehRegistroProprio = (id: string) => FORMATO_UUID.test(id);

// ── banco de adversários ───────────────────────────────────────────────────

export const novoIdJogador = () => crypto.randomUUID();

export function salvarJogador(jogador: Jogador) {
  locais = {
    ...locais,
    jogadores: { ...locais.jogadores, [jogador.id]: jogador },
  };
  persistir(() => nuvem.gravarJogador(jogador, usuario?.id ?? ""));
  avisar();
}

/**
 * Acrescenta uma observação de campo e carimba a data de revisão.
 *
 * Anotar durante o torneio é o momento em que o CRM ganha ou perde valor: se
 * exigir sair da mesa e abrir um formulário, ninguém anota. Por isso a nota é
 * só texto + tipo, e o resto o sistema preenche.
 */
export function adicionarNota(idJogador: string, tipo: NotaJogador["tipo"], texto: string) {
  const atual = fundirJogadores(baseDe(conta.modo).jogadores, locais.jogadores).find(
    (j) => j.id === idJogador,
  );
  if (!atual) return;

  const agora = new Date().toISOString();
  const nota: NotaJogador = {
    id: crypto.randomUUID(),
    data: agora,
    tipo,
    texto: texto.trim(),
  };

  salvarJogador({
    ...atual,
    atualizadoEm: agora,
    notas: [nota, ...atual.notas],
  });
}

export function removerJogador(id: string) {
  const resto = Object.fromEntries(
    Object.entries(locais.jogadores).filter(([chave]) => chave !== id),
  );
  locais = { ...locais, jogadores: resto, mesaAtual: locais.mesaAtual.filter((x) => x !== id) };
  persistir(() => nuvem.apagar("jogadores", "id", id, "o adversário"));
  avisar();
}


// ── diário mental ──────────────────────────────────────────────────────────

export type EntradaCheckIn = Pick<
  DiarioMental,
  "dormiuBem" | "calmo" | "tentandoRecuperar" | "objetivo"
>;

export function registrarCheckIn(entrada: EntradaCheckIn): DiarioMental {
  const registro: DiarioMental = {
    ...entrada,
    id: crypto.randomUUID(),
    data: new Date().toISOString(),
    torneioId: null,
    houveTilt: null,
    comoTerminei: "",
    aprendizado: "",
  };
  locais = { ...locais, diario: [...locais.diario, registro] };
  persistir(() => nuvem.gravar("diario", diarioParaLinha(registro, usuario?.id ?? ""), "o check-in"));
  avisar();
  return registro;
}

export type FechamentoSessao = Pick<
  DiarioMental,
  "houveTilt" | "comoTerminei" | "aprendizado"
>;

/** Fecha a sessão de um check-in aberto. Só entradas locais são editáveis. */
export function fecharSessao(id: string, fechamento: FechamentoSessao) {
  locais = {
    ...locais,
    diario: locais.diario.map((d) => (d.id === id ? { ...d, ...fechamento } : d)),
  };
  persistir(() => {
    const d = locais.diario.find((x) => x.id === id);
    return d
      ? nuvem.gravar("diario", diarioParaLinha(d, usuario?.id ?? ""), "o fecho da sessão")
      : Promise.resolve();
  });
  avisar();
}

export function removerCheckIn(id: string) {
  locais = { ...locais, diario: locais.diario.filter((d) => d.id !== id) };
  persistir(() => nuvem.apagar("diario", "id", id, "o check-in"));
  avisar();
}

// ── movimentações de banca ─────────────────────────────────────────────────
//
// Aporte e saque não são detalhe contábil: sem eles a curva mente. Um saque de
// R$ 900 que o Oblix não conhece vira "prejuízo" no gráfico, e um aporte novo
// vira "lucro" — os dois números que o jogador mais olha, ambos errados. A
// banca inicial é apenas o primeiro aporte, e por isso se edita pelo mesmo
// caminho: quem digitou 5.000 em vez de 500 no cadastro conserta aqui.

export type EntradaMovimento = Omit<MovimentoBankroll, "id">;

export function registrarMovimento(entrada: EntradaMovimento): MovimentoBankroll {
  const movimento: MovimentoBankroll = { ...entrada, id: crypto.randomUUID() };
  locais = { ...locais, movimentos: [...locais.movimentos, movimento] };
  persistir(() =>
    nuvem.gravar("movimentos", movimentoParaLinha(movimento, usuario?.id ?? ""), "a movimentação"),
  );
  avisar();
  return movimento;
}

export function atualizarMovimento(id: string, entrada: EntradaMovimento) {
  const atualizado: MovimentoBankroll = { ...entrada, id };
  locais = {
    ...locais,
    movimentos: locais.movimentos.map((m) => (m.id === id ? atualizado : m)),
  };
  persistir(() =>
    nuvem.gravar("movimentos", movimentoParaLinha(atualizado, usuario?.id ?? ""), "a movimentação"),
  );
  avisar();
}

export function removerMovimento(id: string) {
  locais = { ...locais, movimentos: locais.movimentos.filter((m) => m.id !== id) };
  persistir(() => nuvem.apagar("movimentos", "id", id, "a movimentação"));
  avisar();
}

// ── sessão ao vivo ─────────────────────────────────────────────────────────
//
// Fica só neste aparelho, como a mesa em andamento: ninguém começa um torneio
// no celular e termina no computador. O que sobe para a conta é o torneio
// pronto, quando a sessão fecha.

export function iniciarSessao(preparo: PreparoSessao, energia: NivelEnergia): SessaoAoVivo {
  const sessao: SessaoAoVivo = {
    id: crypto.randomUUID(),
    iniciadaEm: new Date().toISOString(),
    finalizadaEm: null,
    energiaInicial: energia,
    preparo,
    paradas: [],
    torneioId: null,
  };
  locais = { ...locais, sessao };
  gravar();
  avisar();
  return sessao;
}

export type EntradaParada = Omit<ParadaSessao, "id" | "em">;

/**
 * Registra uma parada e grava na hora.
 *
 * Gravar a cada parada, e não ao final, é o que separa um registro útil de um
 * prejuízo: o app passa seis horas indo para segundo plano no bolso de alguém,
 * e perder o histórico do torneio inteiro por um refresh acidental faria o
 * jogador nunca mais confiar na feature.
 */
export function registrarParada(entrada: EntradaParada): ParadaSessao | null {
  if (!locais.sessao) return null;
  const parada: ParadaSessao = { ...entrada, id: crypto.randomUUID(), em: new Date().toISOString() };
  locais = { ...locais, sessao: { ...locais.sessao, paradas: [...locais.sessao.paradas, parada] } };
  gravar();
  avisar();
  return parada;
}

export function removerParada(id: string) {
  if (!locais.sessao) return;
  const paradas = locais.sessao.paradas.filter((p) => p.id !== id);
  locais = { ...locais, sessao: { ...locais.sessao, paradas } };
  gravar();
  avisar();
}

/** Marca o fim do jogo. A sessão continua existindo até virar torneio. */
export function encerrarSessao(): SessaoAoVivo | null {
  if (!locais.sessao) return null;
  const sessao = { ...locais.sessao, finalizadaEm: new Date().toISOString() };
  locais = { ...locais, sessao };
  gravar();
  avisar();
  return sessao;
}

/** Abandona o torneio em andamento sem registrar nada. */
export function descartarSessao() {
  locais = { ...locais, sessao: null };
  gravar();
  avisar();
}

export interface ResultadoDaSessao {
  colocacao: number | null;
  premiacao: number;
  rebuys: number;
  addon: number;
  notaDisciplina: number;
  melhorDecisao?: string;
  piorDecisao?: string;
  aprendizado?: string;
}

/**
 * Fecha a sessão e a transforma em torneio registrado.
 *
 * A duração sai do cronômetro, não da memória de quem acabou de ser eliminado
 * às três da manhã — é o único campo do formulário antigo que a sessão ao vivo
 * torna desnecessário perguntar. A energia também: foi respondida no começo,
 * quando ainda descrevia como a pessoa chegou.
 */
export function concluirSessao(resultado: ResultadoDaSessao): Torneio | null {
  const sessao = locais.sessao;
  if (!sessao) return null;

  const fim = sessao.finalizadaEm ?? new Date().toISOString();
  const duracaoMin = Math.max(
    1,
    Math.round((new Date(fim).getTime() - new Date(sessao.iniciadaEm).getTime()) / 60_000),
  );

  const torneio = registrar({
    torneio: {
      data: sessao.iniciadaEm,
      nome: sessao.preparo.nome,
      clube: sessao.preparo.clube,
      modalidade: sessao.preparo.modalidade,
      buyIn: sessao.preparo.buyIn,
      jogadores: sessao.preparo.jogadores,
      via: sessao.preparo.via,
      energia: sessao.energiaInicial,
      duracaoMin,
      ...resultado,
    },
    satelite: sessao.preparo.satelite,
  });

  locais = { ...locais, sessao: null };
  gravar();
  avisar();
  return torneio;
}

// ── saúde técnica ──────────────────────────────────────────────────────────

export type EntradaMedicao = Omit<MedicaoTecnica, "id" | "data">;

/**
 * Registra uma medição técnica com a data de agora.
 *
 * Nunca sobrescreve a anterior: é a série inteira que dá sentido ao cartão,
 * porque "VPIP 23%" só vira informação ao lado de onde ele estava antes e de
 * quando foi medido.
 */
export function registrarMedicao(entrada: EntradaMedicao): MedicaoTecnica {
  const medicao: MedicaoTecnica = {
    ...entrada,
    id: crypto.randomUUID(),
    data: new Date().toISOString(),
  };
  locais = { ...locais, medicoes: [...locais.medicoes, medicao] };
  persistir(() => nuvem.gravar("saude_tecnica", medicaoParaLinha(medicao, usuario?.id ?? ""), "a medição"));
  avisar();
  return medicao;
}

export function removerMedicao(id: string) {
  locais = { ...locais, medicoes: locais.medicoes.filter((m) => m.id !== id) };
  persistir(() => nuvem.apagar("saude_tecnica", "id", id, "a medição"));
  avisar();
}

// ── metas ──────────────────────────────────────────────────────────────────

/** Grava o alvo escolhido pelo jogador para uma meta do ano corrente. */
export function definirMeta(chave: ChaveMeta, alvo: number, ativa: boolean) {
  const ano = anoDe(conta.modo);
  locais = {
    ...locais,
    metas: { ...locais.metas, [`${ano}:${chave}`]: { chave, alvo, ativa, ano } },
  };
  persistir(() => nuvem.gravar("metas", metaParaLinha({ chave, alvo, ativa, ano }, usuario?.id ?? ""), "a meta"));
  avisar();
}

/** Devolve as metas do ano corrente aos padrões, apagando as escolhas. */
export function restaurarMetas() {
  const ano = anoDe(conta.modo);
  const resto = Object.fromEntries(
    Object.entries(locais.metas).filter(([chave]) => !chave.startsWith(`${ano}:`)),
  );
  locais = { ...locais, metas: resto };
  gravar();
  avisar();
}

// ── mesa em andamento ──────────────────────────────────────────────────────

export function definirMesa(ids: string[]) {
  locais = { ...locais, mesaAtual: ids };
  gravar();
  avisar();
}

export function alternarNaMesa(id: string) {
  const presente = locais.mesaAtual.includes(id);
  definirMesa(presente ? locais.mesaAtual.filter((x) => x !== id) : [...locais.mesaAtual, id]);
}
