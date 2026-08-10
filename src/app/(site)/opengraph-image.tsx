import { ImageResponse } from "next/og";

/**
 * A imagem que aparece quando alguém cola o link do Oblix.
 *
 * Desenhada aqui em vez de exportada de um editor: assim ela usa as cores do
 * produto, e uma mudança de identidade não deixa para trás um PNG que ninguém
 * lembra de trocar.
 *
 * Nada de número. A vitrine da página mostra a base de demonstração com o
 * aviso ao lado; num cartão de link não cabe o aviso, e número grande sem
 * contexto seria lido como resultado de alguém.
 *
 * `ImageResponse` não usa o CSS do projeto — o Satori entende um subconjunto
 * de flexbox e cores literais. Os valores estão repetidos de propósito e são
 * poucos: fundo, jade e as duas tintas.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Oblix — plataforma de performance para jogadores de poker";

const PLANO = "#08090a";
const JADE = "#199e70";
const JADE_CLARO = "#4fe0ab";
const TINTA = "#f2f4f3";
const TINTA_2 = "#9ba3a1";

export default function Imagem() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PLANO,
          padding: 72,
          position: "relative",
        }}
      >
        {/* O halo jade do herói, reduzido ao essencial. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 180,
            width: 900,
            height: 620,
            borderRadius: 999,
            // Paradas explícitas: o Satori desenha `closest-side` com aresta
            // dura, e o halo saía como um disco recortado em vez de luz.
            background:
              "radial-gradient(circle, rgba(25,158,112,0.26) 0%, rgba(25,158,112,0.10) 38%, rgba(8,9,10,0) 66%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="46" height="46" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 1.6 30.4 16 16 30.4 1.6 16 16 1.6Z"
              stroke={JADE_CLARO}
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M16 8.8 23.2 16 16 23.2 8.8 16 16 8.8Z" fill={JADE} />
          </svg>
          <span
            style={{
              color: TINTA,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 9,
            }}
          >
            OBLIX
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: TINTA,
              fontSize: 82,
              fontWeight: 600,
              letterSpacing: -2.6,
              lineHeight: 1.05,
            }}
          >
            Pare de jogar no escuro.
          </div>
          <div
            style={{
              color: TINTA_2,
              fontSize: 31,
              lineHeight: 1.35,
              marginTop: 24,
              maxWidth: 900,
            }}
          >
            Cada torneio vira dado, decisão e evolução — banca, adversários e treino
            direcionado.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 3, background: JADE, borderRadius: 999 }} />
          <span style={{ color: TINTA_2, fontSize: 24 }}>
            Plataforma de performance para jogadores de poker
          </span>
        </div>
      </div>
    ),
    size,
  );
}
