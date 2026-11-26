import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

class ElementFalso {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.value = id === 'ong' ? 'Minha ONG' : '';
    this.textContent = '';
    this.className = '';
    this.onclick = undefined;
    this.onchange = undefined;
  }

  set innerHTML(valor) {
    this._innerHTML = valor;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(elemento) {
    this.children.push(elemento);
    return elemento;
  }
}

function resposta(status, corpo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo
  };
}

async function abrirPagina(fetch) {
  const elementos = new Map();
  const document = {
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, new ElementFalso(id));
      return elementos.get(id);
    },
    createElement() {
      return new ElementFalso();
    }
  };

  runInNewContext(script, { document, fetch, encodeURIComponent });
  await new Promise((resolve) => setImmediate(resolve));
  return elementos;
}

describe('feedback da interface', () => {
  it('mostra confirmação após publicar uma doação', async () => {
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes' && options.method === 'POST') {
        return resposta(201, { id: 12, status: 'disponivel' });
      }
      if (url === '/api/doacoes') return resposta(200, []);
      if (url.startsWith('/api/doacoes/pendencias?')) return resposta(200, []);
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    await elementos.get('publicar').onclick();

    expect(elementos.get('mensagem').textContent).toBe('Doação #12 publicada com sucesso.');
    expect(elementos.get('mensagem').className).toBe('sucesso');
  });

  it('mostra o erro retornado pela API ao recusar validade curta', async () => {
    const erro = 'O prazo de validade deve ser de no mínimo 2 horas a partir de agora';
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes' && options.method === 'POST') {
        return resposta(400, { erro });
      }
      if (url === '/api/doacoes') return resposta(200, []);
      if (url.startsWith('/api/doacoes/pendencias?')) return resposta(200, []);
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    await elementos.get('publicar').onclick();

    expect(elementos.get('mensagem').textContent).toBe(erro);
    expect(elementos.get('mensagem').className).toBe('erro');
  });

  it('mostra confirmação de reserva exclusiva após aceitar', async () => {
    let carregamentos = 0;
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes/7/aceitar' && options.method === 'POST') {
        return resposta(200, { id: 7, ong: 'Minha ONG', status: 'aceita' });
      }
      if (url === '/api/doacoes') {
        carregamentos += 1;
        return resposta(200, carregamentos === 1
          ? [{ id: 7, tipo: 'Sopa', quantidade: '10 porções', validade: '2099-01-01' }]
          : []);
      }
      if (url.startsWith('/api/doacoes/pendencias?')) return resposta(200, []);
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    await elementos.get('lista').children[0].children[0].onclick();

    expect(elementos.get('mensagem').textContent).toBe('Reserva exclusiva confirmada para Minha ONG.');
    expect(elementos.get('mensagem').className).toBe('sucesso');
  });

  it('mostra à ONG perdedora o erro de disputa retornado pela API', async () => {
    const erro = 'Este lote já foi reservado por outra ONG';
    let carregamentos = 0;
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes/8/aceitar' && options.method === 'POST') {
        return resposta(400, { erro });
      }
      if (url === '/api/doacoes') {
        carregamentos += 1;
        return resposta(200, carregamentos === 1
          ? [{ id: 8, tipo: 'Pão', quantidade: '20 unidades', validade: '2099-01-01' }]
          : []);
      }
      if (url.startsWith('/api/doacoes/pendencias?')) return resposta(200, []);
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    await elementos.get('lista').children[0].children[0].onclick();

    expect(elementos.get('mensagem').textContent).toBe(erro);
    expect(elementos.get('mensagem').className).toBe('erro');
  });

  // H2 — o voluntário confirma a coleta pela tela de pendências da ONG.
  it('H2: mostra confirmação após o voluntário confirmar a coleta', async () => {
    let carregamentos = 0;
    let historicos = 0;
    let corpoEnviado;
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes/9/confirmar-coleta' && options.method === 'POST') {
        corpoEnviado = JSON.parse(options.body);
        return resposta(200, { id: 9, ong: 'Minha ONG', status: 'coletada', voluntario: 'Rui' });
      }
      if (url === '/api/doacoes') return resposta(200, []);
      if (url.startsWith('/api/doacoes/pendencias?')) {
        carregamentos += 1;
        return resposta(200, carregamentos === 1
          ? [{ id: 9, tipo: 'Arroz', quantidade: '5 kg', validade: '2099-01-01' }]
          : []);
      }
      if (url.startsWith('/api/doacoes/historico?')) {
        historicos += 1;
        return resposta(200, historicos === 1
          ? []
          : [{ id: 9, tipo: 'Arroz', quantidade: '5 kg', voluntario: 'Rui', coletada_em: '2026-11-20 20:00:00' }]);
      }
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);
    // O campo só é lido no clique; o DOM falso cria o elemento quando o script o pede.
    elementos.set('voluntario', Object.assign(new ElementFalso('voluntario'), { value: 'Rui' }));

    await elementos.get('pendencias').children[0].children[0].onclick();

    expect(corpoEnviado).toEqual({ ong: 'Minha ONG', voluntario: 'Rui' });
    expect(elementos.get('mensagem').textContent).toBe('Coleta confirmada por Rui para Minha ONG.');
    expect(elementos.get('mensagem').className).toBe('sucesso');
    expect(elementos.get('historico').children[0].textContent)
      .toBe('Arroz — 5 kg (coletada por Rui em 2026-11-20 20:00:00)');
  });

  // H1 — tela "Minhas doações": o doador digita o nome e vê cada doação com a situação.
  it('H1: mostra as doações do doador com a situação de cada uma', async () => {
    const consultas = [];
    const fetch = async (url) => {
      if (url.startsWith('/api/doacoes/minhas?')) {
        consultas.push(url);
        return resposta(200, [
          { id: 1, tipo: 'Pão', quantidade: '20 unidades', situacao: 'disponível' },
          { id: 2, tipo: 'Bolo', quantidade: '2 unidades', situacao: 'aceita por Casa Esperança' }
        ]);
      }
      if (url === '/api/doacoes') return resposta(200, []);
      if (url.startsWith('/api/doacoes/pendencias?')) return resposta(200, []);
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    elementos.get('doador').value = 'Padaria Pão Bom';
    await elementos.get('doador').onchange();

    expect(consultas).toEqual(['/api/doacoes/minhas?doador=Padaria%20P%C3%A3o%20Bom']);
    const itens = elementos.get('minhas').children.map(({ textContent }) => textContent);
    expect(itens).toEqual([
      'Pão — 20 unidades: disponível',
      'Bolo — 2 unidades: aceita por Casa Esperança'
    ]);
  });

  it('H1: sem nome de doador, a tela pede o nome em vez de consultar', async () => {
    const fetch = async (url) => {
      if (url.startsWith('/api/doacoes/minhas?')) throw new Error('não deveria consultar');
      if (url === '/api/doacoes') return resposta(200, []);
      if (url.startsWith('/api/doacoes/pendencias?')) return resposta(200, []);
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    expect(elementos.get('minhas').innerHTML).toBe('<li>Informe o nome do doador para ver suas doações.</li>');
  });

  // H3 — a ONG devolve, pela tela de pendências, uma doação que aceitou.
  it('H3: devolve uma pendência com o motivo e mostra a confirmação', async () => {
    let pendencias = 0;
    let corpoEnviado;
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes/5/devolver' && options.method === 'POST') {
        corpoEnviado = JSON.parse(options.body);
        return resposta(200, { id: 5, status: 'disponivel', ong: null, motivo: 'sem voluntário hoje' });
      }
      if (url === '/api/doacoes') return resposta(200, []);
      if (url.startsWith('/api/doacoes/pendencias?')) {
        pendencias += 1;
        return resposta(200, pendencias === 1
          ? [{ id: 5, tipo: 'Pão', quantidade: '20 unidades', validade: '2099-01-01' }]
          : []);
      }
      if (url.startsWith('/api/doacoes/historico?')) return resposta(200, []);
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);
    elementos.set('motivo', Object.assign(new ElementFalso('motivo'), { value: 'sem voluntário hoje' }));

    const [, botaoDevolver] = elementos.get('pendencias').children[0].children;
    expect(botaoDevolver.textContent).toBe('Devolver');
    await botaoDevolver.onclick();

    expect(corpoEnviado).toEqual({ ong: 'Minha ONG', motivo: 'sem voluntário hoje' });
    expect(elementos.get('mensagem').textContent)
      .toBe('Doação #5 devolvida para a lista de disponíveis (motivo: sem voluntário hoje).');
    expect(elementos.get('mensagem').className).toBe('sucesso');
  });
});
