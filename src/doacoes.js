// Regras de negócio das doações.
// Implementado conforme as histórias 6, 7 e regras 1 e 2 de docs/analise.md.
import * as repo from './repositorio.js';

const DUAS_HORAS_EM_MS = 2 * 60 * 60 * 1000;

// História 6 — "um doador publica uma doação" (fatia mínima: tipo, quantidade e validade).
// Regra 1 (docs/analise.md): a validade deve ter no mínimo 2 horas a partir de agora.
// H1 (Trabalho 3): o doador é obrigatório — sem ele a doação é recusada e nada é gravado.
export async function criarDoacao({ tipo, quantidade, validade, doador }) {
  if (!tipo || !quantidade || !validade) {
    throw new Error('Os campos tipo, quantidade e validade são obrigatórios');
  }
  const nomeDoador = exigirDoador(doador);

  const dataValidade = new Date(validade);
  if (Number.isNaN(dataValidade.getTime())) {
    throw new Error('Validade inválida');
  }
  if (dataValidade.getTime() - Date.now() < DUAS_HORAS_EM_MS) {
    throw new Error('O prazo de validade deve ser de no mínimo 2 horas a partir de agora');
  }

  return repo.inserir({ tipo, quantidade, validade, doador: nomeDoador });
}

function exigirDoador(doador) {
  if (typeof doador !== 'string' || !doador.trim()) {
    throw new Error('Informe o nome do doador');
  }
  return doador.trim();
}

// Texto que o doador lê para cada estado (docs/projeto.md, decisão 4).
export function situacao(doacao) {
  if (doacao.status === 'aceita') return `aceita por ${doacao.ong}`;
  if (doacao.status === 'disponivel') return 'disponível';
  if (doacao.status === 'coletada') return `coletada por ${doacao.voluntario} em ${doacao.coletada_em}`;
  return doacao.status;
}

// H1 — "o doador acompanha as suas doações": todas as dele, com a situação de cada uma.
export async function listarDoDoador(doador) {
  const doacoes = await repo.listarPorDoador(exigirDoador(doador));
  return doacoes.map((doacao) => ({ ...doacao, situacao: situacao(doacao) }));
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

// H2 (Trabalho 3) — "o voluntário confirma a coleta". Evolui a confirmação de retirada
// da História 8: a doação vai de `aceita` para `coletada`, com o voluntário e o horário.
// Decisões: o nome do voluntário é obrigatório; confirmar duas vezes é recusado.
export async function confirmarColeta(id, { ong, voluntario } = {}) {
  if (typeof ong !== 'string' || !ong.trim()) {
    throw new Error('Informe a ONG');
  }
  if (typeof voluntario !== 'string' || !voluntario.trim()) {
    throw new Error('Informe o nome do voluntário');
  }

  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('Doação não encontrada');
  }
  if (doacao.status !== 'aceita') {
    throw new Error('Só é possível confirmar a retirada de uma doação aceita');
  }
  if (doacao.ong !== ong.trim()) {
    throw new Error('Só a ONG que aceitou pode confirmar a retirada');
  }

  const atualizada = await repo.confirmarColeta(id, ong.trim(), voluntario.trim());
  if (!atualizada) {
    throw new Error('Só é possível confirmar a retirada de uma doação aceita');
  }

  return atualizada;
}

export async function listarPendencias(ong) {
  if (typeof ong !== 'string' || !ong.trim()) {
    throw new Error('Informe a ONG');
  }

  return repo.listarPendencias(ong.trim());
}

export async function listarHistorico(ong) {
  if (typeof ong !== 'string' || !ong.trim()) {
    throw new Error('Informe a ONG');
  }

  return repo.listarHistorico(ong.trim());
}

export async function contarAceitasNoMes(mes) {
  if (typeof mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new Error('Informe o mês no formato AAAA-MM');
  }

  return repo.contarAceitasNoMes(mes);
}
