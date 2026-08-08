"use client";

import { useEffect, useState } from "react";

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
 */
const CHAVE_RECUSA = "oblix:instalar:recusado";

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function Instalar() {
  const [convite, setConvite] = useState<EventoInstalacao | null>(null);

  useEffect(() => {
    // O service worker não existe em desenvolvimento nem em navegador antigo;
    // nos dois casos o app segue funcionando, só sem a camada offline.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sem service worker o Oblix continua inteiro, só perde o offline */
      });
    }

    const aoPoderInstalar = (e: Event) => {
      // Segurar o evento é o que permite oferecer no momento certo em vez de
      // deixar o navegador decidir com uma barra genérica.
      e.preventDefault();
      if (localStorage.getItem(CHAVE_RECUSA)) return;
      setConvite(e as EventoInstalacao);
    };

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", () => setConvite(null));
    return () => window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
  }, []);

  if (!convite) return null;

  return (
    <div className="mt-2 rounded-xl border border-hairline bg-sunken p-3">
      <p className="text-[12px] leading-snug font-medium text-ink">Instalar no celular</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        Abre em tela cheia e funciona sem sinal — feito para usar dentro do clube.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await convite.prompt();
            await convite.userChoice;
            setConvite(null);
          }}
          className="flex-1 cursor-pointer rounded-lg bg-[var(--color-positivo)] px-3 py-1.5 text-[12px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(CHAVE_RECUSA, "1");
            setConvite(null);
          }}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
