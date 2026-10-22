// Regras de negócio das doações.
// Implementado conforme as histórias 6, 7 e regras 1 e 2 de docs/analise.md.
import * as repo from './repositorio.js';

const DUAS_HORAS_EM_MS = 2 * 60 * 60 * 1000;

function parseValidade(valor) {
  if (typeof valor !== 'string') {
    return null;
  }

  // Formato usado pelo frontend: YYYY-MM-DDTHH:mm (sem fuso explícito).
  const localMatch = valor.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (localMatch) {
    const [, ano, mes, dia, hora, minuto] = localMatch;
    const dataLocal = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      0,
      0
    );

    // Revalida os componentes para barrar datas inválidas (ex.: 2026-02-31T10:00).
    if (
      dataLocal.getFullYear() === Number(ano)
      && dataLocal.getMonth() === Number(mes) - 1
      && dataLocal.getDate() === Number(dia)
      && dataLocal.getHours() === Number(hora)
      && dataLocal.getMinutes() === Number(minuto)
    ) {
      return dataLocal;
    }

    return null;
  }

  // Compatibilidade com entradas ISO completas usadas em testes/API.
  const dataISO = new Date(valor);
  if (!Number.isNaN(dataISO.getTime())) {
    return dataISO;
  }

  return null;
}

// História 6 — "um doador publica uma doação" (fatia mínima: tipo, quantidade e validade).
// Regra 1 (docs/analise.md): a validade deve ter no mínimo 2 horas a partir de agora.
export async function criarDoacao({ tipo, quantidade, validade }) {
  if (!tipo || !quantidade || !validade) {
    throw new Error('Os campos tipo, quantidade e validade são obrigatórios');
  }

  const dataValidade = parseValidade(validade);
  if (!dataValidade) {
    throw new Error('Validade inválida');
  }
  // O frontend envia no formato YYYY-MM-DDTHH:mm (sem segundos);
  // a validação usa a mesma precisão para evitar inconsistência de borda.
  const agora = new Date();
  agora.setSeconds(0, 0);
  if (dataValidade.getTime() - agora.getTime() < DUAS_HORAS_EM_MS) {
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

export async function contarAceitasNoMes(mes) {
  if (typeof mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new Error('Informe o mês no formato AAAA-MM');
  }

  return repo.contarAceitasNoMes(mes);
}
