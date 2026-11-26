export default {
  test: {
    // Os arquivos de teste que usam o PostgreSQL limpam o mesmo banco no
    // beforeEach; rodando em paralelo, um apagaria os dados do outro. Por isso
    // os arquivos rodam um de cada vez (os testes de cada arquivo já eram sequenciais).
    fileParallelism: false,
    env: {
      // PostgreSQL de teste (Unidade 3). Em CI, o job já define DATABASE_URL
      // apontando para o serviço postgres do workflow — process.env.DATABASE_URL
      // é respeitado aqui. Localmente, sem nada definido, cai neste padrão,
      // que é o mesmo usuário/banco combinado em .env.example.
      DATABASE_URL: process.env.DATABASE_URL || 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio',
      // Guarda de limparBanco() no caminho PostgreSQL (src/db.js) — só aqui
      // esse valor é definido como 'test'.
      NODE_ENV: 'test'
    }
  }
};
