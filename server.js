const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'chamados.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Usuários autorizados da equipe de suporte
const USUARIOS_VALIDOS = [
  {
    email: 'lucas@helpdesk.com',
    senha: '123456',
    nome: 'Lucas Nogueira',
    cargo: 'Analista de Suporte TI'
  },
  {
    email: 'admin@helpdesk.com',
    senha: 'admin',
    nome: 'Administrador TI',
    cargo: 'Coordenador de Infraestrutura'
  }
];

// Armazena os tokens de sessão ativos
const sessoesAtivas = new Map();

const STATUS_VALIDOS = ['Aberto', 'Em Andamento', 'Resolvido'];
const PRIORIDADES_VALIDAS = ['Baixa', 'Média', 'Alta', 'Crítica'];

const DADOS_INICIAIS = [
  {
    id: 'CH-1001',
    solicitante: 'Mariana Costa (Financeiro)',
    titulo: 'Sem acesso à pasta compartilhada de notas fiscais',
    categoria: 'Software / Acesso',
    prioridade: 'Alta',
    descricao: 'Ao tentar abrir o diretório da rede aparece erro de permissão negada desde hoje cedo.',
    status: 'Aberto',
    criadoEm: new Date(Date.now() - 7200000).toISOString(),
    atualizadoEm: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'CH-1002',
    solicitante: 'Carlos Eduardo (Recepção)',
    titulo: 'Ponto de rede sem conexão no guichê 2',
    categoria: 'Rede / Internet',
    prioridade: 'Crítica',
    descricao: 'Computador indica cabo de rede desconectado mesmo após trocar o patch cord.',
    status: 'Em Andamento',
    criadoEm: new Date(Date.now() - 3600000).toISOString(),
    atualizadoEm: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'CH-1003',
    solicitante: 'Fernanda Lima (RH)',
    titulo: 'Instalação de segundo monitor na estação',
    categoria: 'Hardware',
    prioridade: 'Baixa',
    descricao: 'Solicitação de cabo HDMI e configuração de tela estendida.',
    status: 'Resolvido',
    criadoEm: new Date(Date.now() - 86400000).toISOString(),
    atualizadoEm: new Date(Date.now() - 43200000).toISOString()
  }
];

async function garantirArquivoDados() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(DADOS_INICIAIS, null, 2), 'utf-8');
  }
}

async function lerChamados() {
  await garantirArquivoDados();
  const conteudo = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(conteudo);
}

async function salvarChamados(chamados) {
  await fs.writeFile(DATA_FILE, JSON.stringify(chamados, null, 2), 'utf-8');
}

// Middleware de autenticação para proteger as rotas da API
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.split(' ')[1];
  const usuario = sessoesAtivas.get(token);

  if (!usuario) {
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  req.usuario = usuario;
  req.token = token;
  next();
}

// POST /api/login - Autentica o técnico e gera token de sessão
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email?.trim() || !senha?.trim()) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const usuarioEncontrado = USUARIOS_VALIDOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha
  );

  if (!usuarioEncontrado) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  const token = crypto.randomUUID();
  const dadosSessao = {
    email: usuarioEncontrado.email,
    nome: usuarioEncontrado.nome,
    cargo: usuarioEncontrado.cargo
  };

  sessoesAtivas.set(token, dadosSessao);

  res.status(200).json({
    token,
    usuario: dadosSessao
  });
});

// POST /api/logout - Encerra a sessão ativa
app.post('/api/logout', autenticar, (req, res) => {
  sessoesAtivas.delete(req.token);
  res.status(200).json({ mensagem: 'Sessão encerrada com sucesso.' });
});

// GET /api/chamados - Lista todos os chamados (protegido)
app.get('/api/chamados', autenticar, async (req, res) => {
  try {
    const { status, prioridade } = req.query;
    let chamados = await lerChamados();

    if (status && status !== 'Todos') {
      chamados = chamados.filter((c) => c.status === status);
    }

    if (prioridade && prioridade !== 'Todas') {
      chamados = chamados.filter((c) => c.prioridade === prioridade);
    }

    res.status(200).json(chamados);
  } catch (error) {
    res.status(500).json({ erro: 'Erro interno ao carregar os chamados.' });
  }
});

// POST /api/chamados - Abre um novo chamado (protegido)
app.post('/api/chamados', autenticar, async (req, res) => {
  try {
    const { solicitante, titulo, categoria, prioridade, descricao } = req.body;

    if (!solicitante?.trim() || !titulo?.trim() || !categoria?.trim() || !descricao?.trim()) {
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    if (!PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({ erro: 'Prioridade inválida.' });
    }

    const chamados = await lerChamados();
    const numeroProtocolo = Math.floor(1000 + Math.random() * 9000);
    const agora = new Date().toISOString();

    const novoChamado = {
      id: `CH-${numeroProtocolo}`,
      solicitante: solicitante.trim(),
      titulo: titulo.trim(),
      categoria: categoria.trim(),
      prioridade,
      descricao: descricao.trim(),
      status: 'Aberto',
      criadoEm: agora,
      atualizadoEm: agora
    };

    chamados.unshift(novoChamado);
    await salvarChamados(chamados);

    res.status(201).json(novoChamado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro interno ao registrar o chamado.' });
  }
});

// PATCH /api/chamados/:id/status - Atualiza o status (protegido)
app.patch('/api/chamados/:id/status', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    const chamados = await lerChamados();
    const indice = chamados.findIndex((c) => c.id === id);

    if (indice === -1) {
      return res.status(404).json({ erro: 'Chamado não encontrado.' });
    }

    chamados[indice].status = status;
    chamados[indice].atualizadoEm = new Date().toISOString();
    await salvarChamados(chamados);

    res.status(200).json(chamados[indice]);
  } catch (error) {
    res.status(500).json({ erro: 'Erro interno ao atualizar o status.' });
  }
});

// DELETE /api/chamados/:id - Remove um chamado (protegido)
app.delete('/api/chamados/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;
    const chamados = await lerChamados();
    const novaLista = chamados.filter((c) => c.id !== id);

    if (novaLista.length === chamados.length) {
      return res.status(404).json({ erro: 'Chamado não encontrado.' });
    }

    await salvarChamados(novaLista);
    res.status(200).json({ mensagem: 'Chamado removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro interno ao excluir o chamado.' });
  }
});

app.listen(PORT, async () => {
  await garantirArquivoDados();
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});