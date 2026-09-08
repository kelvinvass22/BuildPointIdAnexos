/**
 * Catálogo fixo de especialidades/tipos de gerente -- espelha
 * `usuarios.models.TipoGerente` no backend. Antes esses campos
 * (`especialidade` do vínculo com a obra, `tipo_gerente` do perfil) eram
 * texto livre; agora são um valor fechado (funciona como uma "sub-role"
 * dentro do papel GERENTE), escolhido num seletor em vez de digitado.
 *
 * Se o catálogo mudar no backend (`TipoGerente`), atualize esta lista
 * junto -- os `value` têm que bater exatamente com os códigos do backend.
 */
export const TIPOS_GERENTE = [
  { value: "OBRA", label: "Gerente de Obra" },
  { value: "CIVIL_ESTRUTURAL", label: "Gerente Civil/Estrutural" },
  { value: "ELETRICA", label: "Gerente Elétrico" },
  { value: "HIDRAULICA", label: "Gerente Hidráulico/Sanitário" },
  { value: "SEGURANCA_TRABALHO", label: "Gerente de Segurança do Trabalho" },
  { value: "QUALIDADE", label: "Gerente de Qualidade" },
  { value: "PLANEJAMENTO", label: "Gerente de Planejamento e Controle" },
  { value: "SUPRIMENTOS", label: "Gerente de Suprimentos/Compras" },
  { value: "MANUTENCAO", label: "Gerente de Manutenção/Equipamentos" },
  { value: "AMBIENTAL", label: "Gerente Ambiental" },
  { value: "FINANCEIRO", label: "Gerente Financeiro" },
  { value: "RECURSOS_HUMANOS", label: "Gerente de Recursos Humanos" },
  { value: "COMERCIAL", label: "Gerente Comercial" },
  { value: "GERAL", label: "Gerente Geral" },
  { value: "OUTRO", label: "Outro" },
];

export function labelDoTipoGerente(value) {
  return TIPOS_GERENTE.find((t) => t.value === value)?.label || value || "";
}

export default TIPOS_GERENTE;
