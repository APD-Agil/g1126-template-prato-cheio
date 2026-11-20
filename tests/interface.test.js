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

  it('mostra confirmação após concluir a retirada', async () => {
    let carregamentos = 0;
    let historicos = 0;
    const fetch = async (url, options = {}) => {
      if (url === '/api/doacoes/9/confirmar-retirada') {
        return resposta(200, { id: 9, ong: 'Minha ONG', status: 'concluida' });
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
          : [{ id: 9, tipo: 'Arroz', quantidade: '5 kg', concluida_em: '2026-11-20 20:00:00' }]);
      }
      throw new Error(`Requisição inesperada: ${url}`);
    };
    const elementos = await abrirPagina(fetch);

    await elementos.get('pendencias').children[0].children[0].onclick();

    expect(elementos.get('mensagem').textContent).toBe('Retirada confirmada para Minha ONG.');
    expect(elementos.get('mensagem').className).toBe('sucesso');
    expect(elementos.get('historico').children[0].textContent)
      .toContain('retirada confirmada em 2026-11-20 20:00:00');
  });
});
