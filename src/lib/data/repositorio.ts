"use client";

import {
  DIARIO,
  HOJE,
  JOGADORES,
  MOVIMENTOS,
  PERFIL,
  SATELITES,
  TORNEIOS,
} from "@/lib/data/seed";
import type {
  DiarioMental,
  Jogador,
  MovimentoBankroll,
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
}

export interface Conta {
  modo: ModoBase;
  /** Só existe no modo próprio; na demonstração o perfil vem da base semeada. */
  perfil: Perfil | null;
}

export interface Estado extends Omit<Registros, "jogadores"> {
  jogadores: Jogador[];
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
}

const BASE_DEMO: Base = {
  torneios: TORNEIOS,
  satelites: SATELITES,
  movimentos: MOVIMENTOS,
  jogadores: JOGADORES,
  diario: DIARIO,
};

const BASE_VAZIA: Base = {
  torneios: [],
  satelites: [],
  movimentos: [],
  jogadores: [],
  diario: [],
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
    proprios: locais.torneios.length,
  };
}

/** Instantâneo do servidor: imutável e sempre a mesma referência. */
const ESTADO_SERVIDOR: Estado = montar(vazio, CONTA_INICIAL, false, false, null);

let conta: Conta = CONTA_INICIAL;
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
    return {
      torneios: dados.torneios ?? [],
      satelites: dados.satelites ?? [],
      movimentos: dados.movimentos ?? [],
      jogadores: dados.jogadores ?? {},
      mesaAtual: dados.mesaAtual ?? [],
      diario: dados.diario ?? [],
    };
  } catch {
    // Armazenamento corrompido ou indisponível (modo privado, cota estourada):
    // seguir com a base semeada é melhor do que derrubar o painel.
    return vazio;
  }
}

function gravar() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chaveDe(conta.modo), JSON.stringify(locais));
  } catch {
    /* sem espaço ou sem permissão — o estado em memória continua válido */
  }
}

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

  const jaTemAbertura = locais.movimentos.some((m) => m.id === "mov-abertura");
  if (bancaInicial > 0 && !jaTemAbertura) {
    locais = {
      ...locais,
      movimentos: [
        ...locais.movimentos,
        {
          id: "mov-abertura",
          data: new Date().toISOString(),
          tipo: "aporte",
          valor: bancaInicial,
          descricao: "Banca inicial",
        },
      ],
    };
  }

  gravarConta();
  gravar();
  avisar();
}

export function atualizarPerfil(perfil: Perfil) {
  if (conta.modo !== "proprio") return;
  conta = { ...conta, perfil };
  gravarConta();
  avisar();
}

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
  const idTorneio = `trn-local-${crypto.randomUUID().slice(0, 8)}`;
  let idSatelite: string | null = null;

  if (entrada.satelite) {
    idSatelite = `sat-local-${crypto.randomUUID().slice(0, 8)}`;
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
  gravar();
  avisar();
  return torneio;
}

export function remover(idTorneio: string) {
  locais = {
    ...locais,
    torneios: locais.torneios.filter((t) => t.id !== idTorneio),
    satelites: locais.satelites.filter((s) => s.torneioId !== idTorneio),
  };
  gravar();
  avisar();
}

/** Apaga tudo que o jogador registrou na base em uso. */
export function limparProprios() {
  locais = vazio;
  gravar();
  avisar();
}

export const ehRegistroProprio = (id: string) => id.includes("-local-");

// ── banco de adversários ───────────────────────────────────────────────────

export const novoIdJogador = () => `jog-local-${crypto.randomUUID().slice(0, 8)}`;

export function salvarJogador(jogador: Jogador) {
  locais = {
    ...locais,
    jogadores: { ...locais.jogadores, [jogador.id]: jogador },
  };
  gravar();
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
    id: `nota-${crypto.randomUUID().slice(0, 8)}`,
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
  gravar();
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
    id: `dia-local-${crypto.randomUUID().slice(0, 8)}`,
    data: new Date().toISOString(),
    torneioId: null,
    houveTilt: null,
    comoTerminei: "",
    aprendizado: "",
  };
  locais = { ...locais, diario: [...locais.diario, registro] };
  gravar();
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
  gravar();
  avisar();
}

export function removerCheckIn(id: string) {
  locais = { ...locais, diario: locais.diario.filter((d) => d.id !== id) };
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
