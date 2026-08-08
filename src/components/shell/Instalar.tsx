"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Botao } from "@/components/ui/Botao";

/**
 * Registra o service worker e oferece a instalação na tela inicial.
 *
 * O registro é o que faz o Oblix abrir sem sinal. A instalação é o que faz
 * sentido no uso real: quem passa seis horas num clube quer o app no mesmo
 * lugar dos outros — em tela cheia, sem barra de navegador comendo altura, e
 * a um toque no meio do intervalo.
 *
 * O convite só aparece quando o navegador diz que é possível instalar, e some
 * para sempre depois de recusado. Um botão que reaparece toda visita é o tipo
 * de insistência que faz alguém desinstalar em vez de instalar.
 *
 * O evento fica num store de módulo, e não no estado de um componente, porque
 * `beforeinstallprompt` dispara UMA vez por carregamento. Com o convite dentro
 * do componente, quem montasse depois do disparo — o menu "Mais", a tela de
 * Configurações — nunca receberia o evento e nunca ofereceria a instalação.
 */

const CHAVE_RECUSA = "oblix:instalar:recusado";

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let convite: EventoInstalacao | null = null;
let escutando = false;
const ouvintes = new Set<() => void>();

function definirConvite(e: EventoInstalacao | null) {
  convite = e;
  for (const o of ouvintes) o();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  if (!escutando && typeof window !== "undefined") {
    escutando = true;
    window.addEventListener("beforeinstallprompt", (e) => {
      // Segurar o evento é o que permite oferecer no momento certo em vez de
      // deixar o navegador decidir com uma barra genérica.
      e.preventDefault();
      try {
        if (localStorage.getItem(CHAVE_RECUSA)) return;
      } catch {
        /* sem localStorage, oferece — recusar de novo é barato */
      }
      definirConvite(e as EventoInstalacao);
    });
    window.addEventListener("appinstalled", () => definirConvite(null));
  }
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Sobe o service worker. Montado uma vez só, no topo do app. */
export function RegistrarOffline() {
  useEffect(() => {
    // Não existe em desenvolvimento nem em navegador antigo; nos dois casos o
    // app segue funcionando, só sem a camada offline.
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sem service worker o Oblix continua inteiro, só perde o offline */
    });
  }, []);
  return null;
}

export function Instalar() {
  const disponivel = useSyncExternalStore(assinar, () => convite, () => null);
  if (!disponivel) return null;

  return (
    <div className="mt-2 rounded-xl border border-hairline bg-sunken p-3.5">
      <p className="text-[13px] leading-snug font-medium text-ink">Instalar no celular</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
        Abre em tela cheia e funciona sem sinal — feito para usar dentro do clube.
      </p>
      <div className="mt-3 flex gap-2">
        <Botao
          tom="primario"
          largo
          aoClicar={async () => {
            await disponivel.prompt();
            await disponivel.userChoice;
            definirConvite(null);
          }}
        >
          Instalar
        </Botao>
        <Botao
          tom="discreto"
          aoClicar={() => {
            try {
              localStorage.setItem(CHAVE_RECUSA, "1");
            } catch {
              /* sem persistência o convite volta na próxima visita */
            }
            definirConvite(null);
          }}
        >
          Agora não
        </Botao>
      </div>
    </div>
  );
}
