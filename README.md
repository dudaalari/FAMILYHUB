# 🏠 FamilyHub — Sistema de Gestão da Tribo

Sistema web completo para gerenciar a rotina da família.

## 🚀 Como Rodar

### 1. Instalar dependências
```bash
npm init -y
npm install express cors better-sqlite3 sqlite3
npm install
```

### 2. Iniciar o servidor
```bash
node server.js

Ctrl + C -> Para parar.cls

```

### 3. Acessar
Abra o navegador em: **http://localhost:3000**
Visualizar BD: Ctrl + Shift + P -> SQLite -> Aparece guia lado esquerdo em baixo -> clicar na tabela para ver

---

## 🗂️ Estrutura

```
familyhub/
├── server.js        # Backend Node.js + SQLite
├── index.html       # Frontend completo (HTML/CSS/JS)
├── package.json
└── familyhub.db     # Banco SQLite (criado automaticamente)
```

## ✅ Funcionalidades MVP
- Cadastro de Membros da Família (nome, papel, cor)
- Gestão de Atividades (Escolar, Esporte, Social, Saúde)
- Visualização em Calendário mensal
- Notificações de compromissos

## ⭐ Funcionalidades PRO
- Gamificação com sistema de pontos e ranking
- Relatórios com gráficos por membro, tipo e prioridade
- Sistema de conquistas
- Filtros avançados por tipo, membro e busca
- Interface responsiva (mobile + desktop)

## 🛠️ Tecnologias
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (better-sqlite3)

## 📡 API Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/membros | Lista membros |
| POST | /api/membros | Cria membro |
| PUT | /api/membros/:id | Edita membro |
| DELETE | /api/membros/:id | Remove membro |
| GET | /api/atividades | Lista atividades |
| POST | /api/atividades | Cria atividade |
| PUT | /api/atividades/:id | Edita atividade |
| PATCH | /api/atividades/:id/concluir | Toggle conclusão |
| DELETE | /api/atividades/:id | Remove atividade |
| GET | /api/atividades/hoje | Atividades de hoje |
| GET | /api/stats | Estatísticas gerais |
| GET | /api/notificacoes | Lista notificações |
| PATCH | /api/notificacoes/lidas | Marca todas como lidas |
