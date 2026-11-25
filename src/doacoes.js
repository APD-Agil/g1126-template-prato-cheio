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

// Refatoração 2 (docs/refatoracoes.md) — as transições permitidas (docs/projeto.md,
// decisão 4) num só lugar. Cada operação diz de que estado parte e com que mensagem
// recusa; `erroOng` existe quando só a ONG que aceitou pode fazer a operação.
const TRANSICOES = {
  aceitar: {
    de: 'disponivel',
    erro: 'Este lote já foi reservado por outra ONG'
  },
  coletar: {
    de: 'aceita',
    erro: 'Só é possível confirmar a retirada de uma doação aceita',
    erroOng: 'Só a ONG que aceitou pode confirmar a retirada'
  },
  devolver: {
    de: 'aceita',
    erro: 'Só é possível devolver uma doação aceita',
    erroOng: 'Só a ONG que aceitou pode devolver a doação'
  }
};

// Busca a doação, recusa se não existe, confere se a transição é permitida e só então
// chama `atualizar` (o UPDATE condicional do repositório). Se o UPDATE não afetar
// nenhuma linha, outra requisição mudou a doação entre a busca e a escrita: recusa
// com a mesma mensagem da transição proibida.
async function transicionar(id, operacao, { ong, atualizar }) {
  const transicao = TRANSICOES[operacao];

  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('Doação não encontrada');
  }
  if (doacao.status !== transicao.de) {
    throw new Error(transicao.erro);
  }
  if (transicao.erroOng && doacao.ong !== ong) {
    throw new Error(transicao.erroOng);
  }

  const atualizada = await atualizar();
  if (!atualizada) {
    throw new Error(transicao.erro);
  }
  return atualizada;
}

// História 7 (★ história zero) — "uma ONG aceita um lote com exclusividade garantida".
// Regra 2 (docs/analise.md): uma doação aceita sai da lista e não pode ser aceita de novo.
// A exclusividade sob concorrência vem do UPDATE ... WHERE status = 'disponivel'.
export async function aceitar(id, ong) {
  return transicionar(id, 'aceitar', {
    atualizar: () => repo.aceitar(id, ong)
  });
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

  return transicionar(id, 'coletar', {
    ong: ong.trim(),
    atualizar: () => repo.confirmarColeta(id, ong.trim(), voluntario.trim())
  });
}

// H3 (Trabalho 3) — "a ONG devolve uma doação aceita": a doação volta para a lista
// de disponíveis, sem a ONG, e o motivo fica registrado (docs/projeto.md, decisão 7).
export async function devolver(id, { ong, motivo } = {}) {
  if (typeof ong !== 'string' || !ong.trim()) {
    throw new Error('Informe a ONG');
  }

  return transicionar(id, 'devolver', {
    ong: ong.trim(),
    atualizar: () => repo.devolver(id, ong.trim(), motivo)
  });
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
