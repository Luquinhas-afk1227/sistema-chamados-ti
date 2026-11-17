function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function obterClassePrioridade(prioridade) {
  const mapa = {
    'Baixa': 'baixa',
    'Média': 'media',
    'Alta': 'alta',
    'Crítica': 'critica'
  };
  return mapa[prioridade] || 'media';
}

function obterClasseStatus(status) {
  const mapa = {
    'Aberto': 'aberto',
    'Em Andamento': 'em-andamento',
    'Resolvido': 'resolvido'
  };
  return mapa[status] || 'aberto';
}

function exibirFeedback(elemento, texto, tipo) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `mensagem-feedback ${tipo}`;
  setTimeout(() => {
    elemento.textContent = '';
    elemento.className = 'mensagem-feedback';
  }, 4000);
}

// Controle de Autenticação e Sessão
function obterToken() {
  return localStorage.getItem('helpdesk_token');
}

function redirecionarParaLogin() {
  localStorage.removeItem('helpdesk_token');
  localStorage.removeItem('helpdesk_usuario');
  window.location.href = 'index.html';
}

async function requisicaoAutenticada(url, opcoes = {}) {
  const token = obterToken();
  const headers = {
    ...(opcoes.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const resposta = await fetch(url, { ...opcoes, headers });

  if (resposta.status === 401) {
    redirecionarParaLogin();
    throw new Error('Sessão expirada');
  }

  return resposta;
}

// ==========================================
// PÁGINA 1: LOGIN (index.html)
// ==========================================
const formLogin = document.getElementById('form-login');
if (formLogin) {
  if (obterToken()) {
    window.location.href = 'dashboard.html';
  }

  const mensagemLogin = document.getElementById('mensagem-login');
  const btnPreencherDemo = document.getElementById('btn-preencher-demo');

  btnPreencherDemo.addEventListener('click', () => {
    document.getElementById('login-email').value = 'lucas@helpdesk.com';
    document.getElementById('login-senha').value = '123456';
  });

  formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
      const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        exibirFeedback(mensagemLogin, dados.erro || 'Falha no login.', 'erro');
        return;
      }

      localStorage.setItem('helpdesk_token', dados.token);
      localStorage.setItem('helpdesk_usuario', JSON.stringify(dados.usuario));
      window.location.href = 'dashboard.html';
    } catch {
      exibirFeedback(mensagemLogin, 'Erro de conexão com o servidor.', 'erro');
    }
  });
}

// ==========================================
// PROTEÇÃO E CABEÇALHO DAS PÁGINAS INTERNAS
// ==========================================
const btnSair = document.getElementById('btn-sair');
if (btnSair) {
  const token = obterToken();
  const usuarioSalvo = localStorage.getItem('helpdesk_usuario');

  if (!token || !usuarioSalvo) {
    redirecionarParaLogin();
  } else {
    const usuario = JSON.parse(usuarioSalvo);
    document.getElementById('nome-usuario-logado').textContent = usuario.nome;
    document.getElementById('cargo-usuario-logado').textContent = usuario.cargo;
  }

  btnSair.addEventListener('click', async () => {
    try {
      await requisicaoAutenticada('/api/logout', { method: 'POST' });
    } catch {
      // Ignora erro de rede ao sair
    } finally {
      redirecionarParaLogin();
    }
  });
}

// ==========================================
// PÁGINA 2: PAINEL DE CHAMADOS (dashboard.html)
// ==========================================
const listaChamados = document.getElementById('lista-chamados');
if (listaChamados) {
  const filtroStatus = document.getElementById('filtro-status');
  const filtroPrioridade = document.getElementById('filtro-prioridade');
  const kpiTotal = document.getElementById('kpi-total');
  const kpiAbertos = document.getElementById('kpi-abertos');
  const kpiAndamento = document.getElementById('kpi-andamento');
  const kpiResolvidos = document.getElementById('kpi-resolvidos');

  async function atualizarResumoKPIs() {
    try {
      const resposta = await requisicaoAutenticada('/api/chamados');
      const todosChamados = await resposta.json();

      kpiTotal.textContent = todosChamados.length;
      kpiAbertos.textContent = todosChamados.filter((c) => c.status === 'Aberto').length;
      kpiAndamento.textContent = todosChamados.filter((c) => c.status === 'Em Andamento').length;
      kpiResolvidos.textContent = todosChamados.filter((c) => c.status === 'Resolvido').length;
    } catch (erro) {
      console.error('Erro ao atualizar KPIs:', erro);
    }
  }

  async function carregarChamados() {
    try {
      const params = new URLSearchParams({
        status: filtroStatus.value,
        prioridade: filtroPrioridade.value
      });

      const resposta = await requisicaoAutenticada(`/api/chamados?${params.toString()}`);
      const chamados = await resposta.json();

      renderizarChamados(chamados);
      await atualizarResumoKPIs();
    } catch (erro) {
      if (erro.message !== 'Sessão expirada') {
        listaChamados.innerHTML = `
          <div class="estado-vazio">
            Não foi possível carregar os chamados. Verifique se o servidor está rodando.
          </div>
        `;
      }
    }
  }

  function renderizarChamados(chamados) {
    if (!chamados.length) {
      listaChamados.innerHTML = `
        <div class="estado-vazio">
          Nenhum chamado encontrado para os filtros selecionados.
        </div>
      `;
      return;
    }

    listaChamados.innerHTML = chamados
      .map((chamado) => {
        const classePrioridade = obterClassePrioridade(chamado.prioridade);
        const classeStatus = obterClasseStatus(chamado.status);

        return `
          <article class="chamado-card prioridade-${classePrioridade}">
            <div class="chamado-topo">
              <span class="chamado-id">${escaparHTML(chamado.id)}</span>
              <div class="chamado-badges">
                <span class="badge badge-categoria">${escaparHTML(chamado.categoria)}</span>
                <span class="badge badge-prioridade-${classePrioridade}">
                  Prioridade: ${escaparHTML(chamado.prioridade)}
                </span>
                <span class="badge badge-status-${classeStatus}">
                  ${escaparHTML(chamado.status)}
                </span>
              </div>
            </div>

            <h3 class="chamado-titulo">${escaparHTML(chamado.titulo)}</h3>
            <p class="chamado-meta">
              Solicitante: <strong>${escaparHTML(chamado.solicitante)}</strong> • Aberto em ${formatarData(chamado.criadoEm)}
            </p>
            <p class="chamado-descricao">${escaparHTML(chamado.descricao)}</p>

            <div class="chamado-acoes">
              <div class="controle-status">
                <label for="status-${escaparHTML(chamado.id)}">Alterar status:</label>
                <select
                  id="status-${escaparHTML(chamado.id)}"
                  class="select-status"
                  onchange="alterarStatus('${escaparHTML(chamado.id)}', this.value)"
                >
                  <option value="Aberto" ${chamado.status === 'Aberto' ? 'selected' : ''}>Aberto</option>
                  <option value="Em Andamento" ${chamado.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
                  <option value="Resolvido" ${chamado.status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
                </select>
              </div>

              <button
                type="button"
                class="btn-excluir"
                onclick="excluirChamado('${escaparHTML(chamado.id)}')"
              >
                Excluir
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  window.alterarStatus = async function (id, novoStatus) {
    try {
      const resposta = await requisicaoAutenticada(`/api/chamados/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (resposta.ok) {
        await carregarChamados();
      }
    } catch (erro) {
      console.error('Erro ao atualizar status:', erro);
    }
  };

  window.excluirChamado = async function (id) {
    const confirmou = confirm(`Deseja realmente excluir o chamado ${id}?`);
    if (!confirmou) return;

    try {
      const resposta = await requisicaoAutenticada(`/api/chamados/${id}`, {
        method: 'DELETE'
      });

      if (resposta.ok) {
        await carregarChamados();
      }
    } catch (erro) {
      console.error('Erro ao excluir chamado:', erro);
    }
  };

  filtroStatus.addEventListener('change', carregarChamados);
  filtroPrioridade.addEventListener('change', carregarChamados);

  carregarChamados();
}

// ==========================================
// PÁGINA 3: ABRIR CHAMADO (novo-chamado.html)
// ==========================================
const formChamado = document.getElementById('form-chamado');
if (formChamado) {
  const mensagemForm = document.getElementById('mensagem-form');

  formChamado.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dadosNovoChamado = {
      solicitante: document.getElementById('solicitante').value,
      titulo: document.getElementById('titulo').value,
      categoria: document.getElementById('categoria').value,
      prioridade: document.getElementById('prioridade').value,
      descricao: document.getElementById('descricao').value
    };

    try {
      const resposta = await requisicaoAutenticada('/api/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosNovoChamado)
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        exibirFeedback(mensagemForm, resultado.erro || 'Erro ao registrar chamado.', 'erro');
        return;
      }

      exibirFeedback(
        mensagemForm,
        `Protocolo ${resultado.id} criado com sucesso! Redirecionando para a fila...`,
        'sucesso'
      );

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    } catch (erro) {
      if (erro.message !== 'Sessão expirada') {
        exibirFeedback(mensagemForm, 'Falha de comunicação com o servidor.', 'erro');
      }
    }
  });
}