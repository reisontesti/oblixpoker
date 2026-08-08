"use client";

import { useState } from "react";
import {
  CampoEscolha,
  CampoNumero,
  CampoTexto,
  CampoTextoLongo,
} from "@/components/ui/Campo";
import { novoIdJogador, salvarJogador } from "@/lib/data/repositorio";
import { PERFIS } from "@/lib/jogadores";
import { useClubes } from "@/lib/painel";
import { ROTULO_PERFIL, type Jogador, type PerfilJogador } from "@/lib/types";

/** Uma linha por item: editar lista em campo de texto é mais rápido do que
 *  gerenciar botões de adicionar e remover, e é assim que se anota de verdade. */
const paraLinhas = (itens: string[]) => itens.join("\n");
const deLinhas = (texto: string) =>
  texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

interface Props {
  jogador?: Jogador;
  aoConcluir: () => void;
  aoCancelar: () => void;
}

export function FormularioJogador({ jogador, aoConcluir, aoCancelar }: Props) {
  const clubes = useClubes();
  const [nome, setNome] = useState(jogador?.nome ?? "");
  const [clube, setClube] = useState(jogador?.clube ?? clubes[0] ?? "");
  const [perfil, setPerfil] = useState<PerfilJogador>(jogador?.perfil ?? "solido");
  const [fortes, setFortes] = useState(paraLinhas(jogador?.pontosFortes ?? []));
  const [fracos, setFracos] = useState(paraLinhas(jogador?.pontosFracos ?? []));
  const [exploracoes, setExploracoes] = useState(paraLinhas(jogador?.exploracoes ?? []));
  const [tells, setTells] = useState(paraLinhas(jogador?.tells ?? []));
  const [confrontos, setConfrontos] = useState<number | null>(jogador?.confrontos ?? 0);
  const [saldo, setSaldo] = useState<number | null>(jogador?.saldoConfrontos ?? 0);
  const [erroNome, setErroNome] = useState<string>();

  function salvar() {
    if (!nome.trim()) {
      setErroNome("Informe o nome do adversário");
      return;
    }
    salvarJogador({
      id: jogador?.id ?? novoIdJogador(),
      nome: nome.trim(),
      clube,
      perfil,
      pontosFortes: deLinhas(fortes),
      pontosFracos: deLinhas(fracos),
      exploracoes: deLinhas(exploracoes),
      tells: deLinhas(tells),
      confrontos: confrontos ?? 0,
      saldoConfrontos: saldo ?? 0,
      // Salvar é revisar: a data de frescor acompanha a edição, então a
      // leitura volta a valer como recente.
      atualizadoEm: new Date().toISOString(),
      notas: jogador?.notas ?? [],
    });
    aoConcluir();
  }

  return (
    <div className="placa grao relative overflow-hidden">
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative space-y-5 p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink">
          {jogador ? `Editar ${jogador.nome}` : "Novo adversário"}
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            rotulo="Nome"
            valor={nome}
            aoMudar={(v) => {
              setNome(v);
              setErroNome(undefined);
            }}
            placeholder="Como você o chama na mesa"
            erro={erroNome}
          />
          <CampoTexto
            rotulo="Clube"
            valor={clube}
            aoMudar={setClube}
            sugestoes={clubes}
            placeholder="Onde você joga contra ele"
          />
        </div>

        <CampoEscolha
          rotulo="Perfil"
          dica="Define como o Modo Mesa agrupa e o que sugere contra ele"
          valor={perfil}
          aoMudar={setPerfil}
          opcoes={PERFIS.map((p) => ({ valor: p, rotulo: ROTULO_PERFIL[p] }))}
        />

        <CampoTextoLongo
          rotulo="Como explorar"
          dica="Uma por linha — é o que aparece em destaque na mesa"
          valor={exploracoes}
          aoMudar={setExploracoes}
          placeholder={"Roubar o blind dele sempre que estiver no BB\nFoldar quando ele aumentar no river"}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTextoLongo
            rotulo="Pontos fortes"
            dica="Uma por linha"
            valor={fortes}
            aoMudar={setFortes}
            linhas={3}
          />
          <CampoTextoLongo
            rotulo="Pontos fracos"
            dica="Uma por linha"
            valor={fracos}
            aoMudar={setFracos}
            linhas={3}
          />
        </div>

        <CampoTextoLongo
          rotulo="Tells"
          dica="Uma por linha"
          valor={tells}
          aoMudar={setTells}
          linhas={2}
          placeholder="Arruma as fichas antes de apostar forte"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoNumero
            rotulo="Confrontos"
            dica="Torneios em que dividiram mesa"
            valor={confrontos}
            aoMudar={setConfrontos}
            min={0}
          />
          <CampoNumero
            rotulo="Saldo direto"
            dica="Sua estimativa, positiva ou negativa"
            valor={saldo}
            aoMudar={setSaldo}
            prefixo="R$"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={aoCancelar}
            className="cursor-pointer px-3 py-2 text-[13px] font-medium text-ink-secondary transition-colors duration-200 hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            className="cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
          >
            Salvar adversário
          </button>
        </div>
      </div>
    </div>
  );
}
