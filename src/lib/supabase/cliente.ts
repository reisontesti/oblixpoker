"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O cliente Supabase do Oblix.
 *
 * Só existe o cliente de navegador, e isso é deliberado. Todas as telas do
 * Oblix são client components e o HTML sai pré-renderizado estático; não há
 * consulta no servidor para proteger, então não há middleware de sessão nem
 * cliente de servidor. Quem impede um usuário de ler os dados de outro é a RLS
 * no Postgres, não uma verificação no meio do caminho — e é bom que seja assim:
 * uma checagem que se pode esquecer de escrever protege menos que uma política
 * que nega por padrão.
 *
 * A chave `anon` vai no bundle e isso é o esperado: ela identifica o projeto,
 * não autoriza nada. Quem autoriza é o JWT do usuário logado, contra as
 * políticas. A `service_role` ignora RLS e nunca pode chegar aqui.
 */

const URL_PROJETO = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * O Oblix funciona sem backend nenhum.
 *
 * Sem as variáveis preenchidas, o produto inteiro segue rodando em
 * localStorage e nada de conta aparece na interface. Não é hedge: é o que
 * permite clonar o repositório e ver a demonstração funcionando em trinta
 * segundos, sem criar projeto na nuvem antes.
 */
export const supabaseConfigurado = Boolean(URL_PROJETO && CHAVE_ANON);

let cliente: SupabaseClient | null = null;

/** Nulo quando não há projeto configurado — quem chama precisa tratar isso. */
export function obterSupabase(): SupabaseClient | null {
  if (!supabaseConfigurado) return null;
  cliente ??= createBrowserClient(URL_PROJETO!, CHAVE_ANON!);
  return cliente;
}
