// Regras de negócio das doações.
// Implementado conforme as histórias 6, 7 e regras 1 e 2 de docs/analise.md.
import * as repo from './repositorio.js';

const DUAS_HORAS_EM_MS = 2 * 60 * 60 * 1000;

// História 6 — "um doador publica uma doação" (fatia mínima: tipo, quantidade e validade).
// Regra 1 (docs/analise.md): a validade deve ter no mínimo 2 horas a partir de agora.
export async function criarDoacao({ tipo, quantidade, validade }) {
  if (!tipo || !quantidade || !validade) {
    throw new Error('Os campos tipo, quantidade e validade são obrigatórios');
  }

  const dataValidade = new Date(validade);
  if (Number.isNaN(dataValidade.getTime())) {
    throw new Error('Validade inválida');
  }
  if (dataValidade.getTime() - Date.now() < DUAS_HORAS_EM_MS) {
    throw new Error('O prazo de validade deve ser de no mínimo 2 horas a partir de agora');
  }

  return repo.inserir({ tipo, quantidade, validade });
}

// História zero — "uma ONG vê as doações disponíveis".
export async function listarDisponiveis() {
  return repo.listarDisponiveis();
}

// História 7 (★ história zero) — "uma ONG aceita um lote com exclusividade garantida".
// Regra 2 (docs/analise.md): uma doação aceita sai da lista e não pode ser aceita de novo.
export async function aceitar(id, ong) {
  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('Doação não encontrada');
  }

  const atualizada = await repo.aceitar(id, ong);
  if (!atualizada) {
    // A busca acima encontrou a doação, mas o UPDATE não afetou nenhuma linha:
    // outra ONG venceu a corrida (ou a própria já não está mais disponível).
    throw new Error('Este lote já foi reservado por outra ONG');
  }

  return atualizada;
}
