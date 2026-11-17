# Helpdesk TI — Sistema de Gestão de Chamados

Aplicação web full-stack desenvolvida para centralizar, classificar e acompanhar solicitações de suporte técnico e manutenção de infraestrutura, substituindo controles informais por uma fila organizada com autenticação de técnicos e indicadores em tempo real.

## Problema Resolvido

Em ambientes de suporte técnico, pedidos enviados por mensagens avulsas se perdem facilmente e dificultam a priorização de incidentes críticos. Este sistema oferece acesso autenticado para a equipe de TI, interface multipáginas para abertura e acompanhamento de chamados e uma API RESTful protegida por token para gerenciar todo o ciclo de vida dos atendimentos (`Aberto`, `Em Andamento` e `Resolvido`).

## Tecnologias Utilizadas

- **Back-end:** Node.js e Express
- **Autenticação:** Sessões protegidas via token (`Bearer Token`) na API
- **Front-end:** HTML5 semântico (arquitetura multipáginas), CSS3 (Grid, Flexbox, variáveis CSS e design responsivo) e JavaScript (Fetch API, LocalStorage e manipulação dinâmica do DOM)
- **Persistência de Dados:** Arquivo JSON local (`data/chamados.json`), dispensando configuração de banco de dados externo para execução

## Estrutura do Projeto

```text
sistema-chamados-ti/
├── data/
│   └── chamados.json          # Base de dados local gerada automaticamente
├── public/
│   ├── css/
│   │   └── style.css          # Estilização completa e responsiva
│   ├── js/
│   │   └── app.js             # Autenticação, consumo da API REST e regras de tela
│   ├── dashboard.html         # Painel principal com KPIs, filtros e fila de atendimento
│   ├── index.html             # Tela de login do sistema
│   └── novo-chamado.html      # Formulário de abertura de chamados e guia de SLA
├── .gitignore
├── package.json
├── README.md
└── server.js                  # Servidor Express, autenticação e endpoints da API
```

## Credenciais de Acesso (Demonstração)

Para testar a aplicação após iniciar o servidor, utilize um dos usuários abaixo na tela inicial (ou clique no botão **Preencher dados de acesso**):

- **Analista de Suporte:** `lucas@helpdesk.com` | **Senha:** `123456`
- **Administrador TI:** `admin@helpdesk.com` | **Senha:** `admin`

## Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior) instalado na máquina.

### Passo a passo

1. Clone este repositório:
   ```bash
   git clone [https://github.com/SEU-USUARIO/sistema-chamados-ti.git](https://github.com/SEU-USUARIO/sistema-chamados-ti.git)
   ```

2. Acesse a pasta do projeto:
   ```bash
   cd sistema-chamados-ti
   ```

3. Instale as dependências:
   ```bash
   npm install
   ```

4. Inicie o servidor:
   ```bash
   node server.js
   ```

5. Abra o navegador e acesse:
   ```text
   http://localhost:3000
   ```

## Endpoints da API REST

As rotas de chamados exigem o cabeçalho `Authorization: Bearer <token>` obtido no login.

| Método | Rota | Autenticação | Descrição |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/login` | Pública | Valida credenciais e retorna o token de sessão |
| `POST` | `/api/logout` | Protegida | Encerra a sessão ativa do usuário |
| `GET` | `/api/chamados` | Protegida | Lista os chamados (aceita filtros `?status=` e `?prioridade=`) |
| `POST` | `/api/chamados` | Protegida | Registra um novo chamado com validação de campos |
| `PATCH` | `/api/chamados/:id/status` | Protegida | Atualiza o status de um chamado existente |
| `DELETE` | `/api/chamados/:id` | Protegida | Remove um chamado pelo número de protocolo |

### Exemplo de Requisição (`POST /api/chamados`)

```json
{
  "solicitante": "Lucas Nogueira (Suporte TI)",
  "titulo": "Ponto de rede sem conexão na sala 4",
  "categoria": "Rede / Internet",
  "prioridade": "Alta",
  "descricao": "Estação sem acesso à intranet após queda de energia."
}
```

## Autor

Desenvolvido por **Lucas Leite Carvalho Nogueira** — Projeto acadêmico de Desenvolvimento Web.