import express from 'express';
import * as doacoes from './doacoes.js';

export function criarApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));

  // Verificação de saúde: usada pelo CI para provar que a aplicação sobe.
  app.get('/api/saude', (req, res) => res.json({ ok: true }));

  app.get('/api/doacoes', async (req, res) => {
    try {
      res.json(await doacoes.listarDisponiveis());
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.get('/api/doacoes/minhas', async (req, res) => {
    try {
      res.json(await doacoes.listarDoDoador(req.query.doador));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.get('/api/doacoes/pendencias', async (req, res) => {
    try {
      res.json(await doacoes.listarPendencias(req.query.ong));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.get('/api/doacoes/historico', async (req, res) => {
    try {
      res.json(await doacoes.listarHistorico(req.query.ong));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.post('/api/doacoes', async (req, res) => {
    try {
      res.status(201).json(await doacoes.criarDoacao(req.body));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.post('/api/doacoes/:id/aceitar', async (req, res) => {
    try {
      res.json(await doacoes.aceitar(req.params.id, req.body?.ong ?? 'ONG'));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.post('/api/doacoes/:id/confirmar-retirada', async (req, res) => {
    try {
      res.json(await doacoes.confirmarRetirada(req.params.id, req.body?.ong));
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  app.get('/api/relatorios/doacoes-aceitas', async (req, res) => {
    try {
      const mes = req.query.mes;
      res.json({ mes, total: await doacoes.contarAceitasNoMes(mes) });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  });

  return app;
}
