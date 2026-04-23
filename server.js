const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Usa sqlite3 nativo do Node ou cria mock em memória
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database('./familyhub.db');
  db.pragma('journal_mode = WAL');
} catch(e) {
  // Fallback: usa sqlite3
  try {
    const sqlite3 = require('sqlite3').verbose();
    // Wrap sqlite3 em interface síncrona simulada
    db = null; // vai usar melhor alternativa abaixo
  } catch(e2) {
    db = null;
  }
}

// Se nenhum driver disponível, usa armazenamento em memória
let memDB = { membros: [], atividades: [], notificacoes: [], pontos: [] };
let nextId = { membros: 1, atividades: 1, notificacoes: 1 };

const useMem = !db;

function initDB() {
  if (!useMem) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS membros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        papel TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        cor TEXT DEFAULT '#6366f1',
        pontos INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS atividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        tipo TEXT NOT NULL,
        prioridade TEXT DEFAULT 'media',
        id_membro INTEGER NOT NULL,
        data_inicio TEXT NOT NULL,
        data_fim TEXT,
        hora TEXT,
        concluida INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(id_membro) REFERENCES membros(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mensagem TEXT NOT NULL,
        lida INTEGER DEFAULT 0,
        id_atividade INTEGER,
        criado_em TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        criado_em TEXT DEFAULT (datetime('now'))
      );
    `);
    // Seed
    const count = db.prepare('SELECT COUNT(*) as c FROM membros').get();
    if (count.c === 0) {
      db.prepare("INSERT INTO membros (nome, papel, cor) VALUES (?, ?, ?)").run('Maria Silva', 'Mãe', '#f472b6');
      db.prepare("INSERT INTO membros (nome, papel, cor) VALUES (?, ?, ?)").run('João Silva', 'Pai', '#60a5fa');
      db.prepare("INSERT INTO membros (nome, papel, cor) VALUES (?, ?, ?)").run('Ana Silva', 'Filho(a)', '#34d399');
      const hoje = new Date().toISOString().split('T')[0];
      db.prepare("INSERT INTO atividades (titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora) VALUES (?, ?, ?, ?, ?, ?, ?)").run('Reunião Escolar', 'Reunião de pais e mestres', 'Escolar', 'alta', 1, hoje, '14:00');
      db.prepare("INSERT INTO atividades (titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora) VALUES (?, ?, ?, ?, ?, ?, ?)").run('Treino de Futebol', 'Treino semanal', 'Esporte', 'media', 3, hoje, '16:00');
    }
  } else {
    if (memDB.membros.length === 0) {
      const hoje = new Date().toISOString().split('T')[0];
      memDB.membros = [
        { id: 1, nome: 'Maria Silva', papel: 'Mãe', cor: '#f472b6', pontos: 0, criado_em: new Date().toISOString() },
        { id: 2, nome: 'João Silva', papel: 'Pai', cor: '#60a5fa', pontos: 0, criado_em: new Date().toISOString() },
        { id: 3, nome: 'Ana Silva', papel: 'Filho(a)', cor: '#34d399', pontos: 10, criado_em: new Date().toISOString() },
      ];
      memDB.atividades = [
        { id: 1, titulo: 'Reunião Escolar', descricao: 'Reunião de pais e mestres', tipo: 'Escolar', prioridade: 'alta', id_membro: 1, data_inicio: hoje, hora: '14:00', concluida: 0, criado_em: new Date().toISOString() },
        { id: 2, titulo: 'Treino de Futebol', descricao: 'Treino semanal', tipo: 'Esporte', prioridade: 'media', id_membro: 3, data_inicio: hoje, hora: '16:00', concluida: 0, criado_em: new Date().toISOString() },
      ];
      nextId = { membros: 4, atividades: 3, notificacoes: 1 };
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

initDB();

// ===== MEMBROS =====
app.get('/api/membros', (req, res) => {
  if (!useMem) {
    const rows = db.prepare(`
      SELECT m.*, 
        (SELECT COUNT(*) FROM atividades WHERE id_membro = m.id AND concluida = 1) as concluidas,
        (SELECT COUNT(*) FROM atividades WHERE id_membro = m.id) as total
      FROM membros m ORDER BY m.id
    `).all();
    res.json(rows);
  } else {
    const rows = memDB.membros.map(m => ({
      ...m,
      concluidas: memDB.atividades.filter(a => a.id_membro === m.id && a.concluida === 1).length,
      total: memDB.atividades.filter(a => a.id_membro === m.id).length
    }));
    res.json(rows);
  }
});

app.post('/api/membros', (req, res) => {
  const { nome, papel, cor } = req.body;
  if (!nome || !papel) return res.status(400).json({ error: 'Nome e papel são obrigatórios' });
  if (!useMem) {
    const r = db.prepare('INSERT INTO membros (nome, papel, cor) VALUES (?, ?, ?)').run(nome, papel, cor || '#6366f1');
    res.json({ id: r.lastInsertRowid, nome, papel, cor: cor || '#6366f1', pontos: 0 });
  } else {
    const novo = { id: nextId.membros++, nome, papel, cor: cor || '#6366f1', pontos: 0, criado_em: new Date().toISOString() };
    memDB.membros.push(novo);
    res.json(novo);
  }
});

app.put('/api/membros/:id', (req, res) => {
  const { nome, papel, cor } = req.body;
  const id = parseInt(req.params.id);
  if (!useMem) {
    db.prepare('UPDATE membros SET nome=?, papel=?, cor=? WHERE id=?').run(nome, papel, cor, id);
    res.json({ success: true });
  } else {
    const m = memDB.membros.find(x => x.id === id);
    if (!m) return res.status(404).json({ error: 'Não encontrado' });
    Object.assign(m, { nome, papel, cor });
    res.json({ success: true });
  }
});

app.delete('/api/membros/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!useMem) {
    db.prepare('DELETE FROM atividades WHERE id_membro=?').run(id);
    db.prepare('DELETE FROM membros WHERE id=?').run(id);
  } else {
    memDB.atividades = memDB.atividades.filter(a => a.id_membro !== id);
    memDB.membros = memDB.membros.filter(m => m.id !== id);
  }
  res.json({ success: true });
});

// ===== ATIVIDADES =====
app.get('/api/atividades', (req, res) => {
  const { mes, ano, id_membro, tipo } = req.query;
  if (!useMem) {
    let q = `SELECT a.*, m.nome as membro_nome, m.cor as membro_cor FROM atividades a JOIN membros m ON a.id_membro=m.id WHERE 1=1`;
    const params = [];
    if (mes && ano) { q += ` AND strftime('%m', a.data_inicio)=? AND strftime('%Y', a.data_inicio)=?`; params.push(String(mes).padStart(2,'0'), ano); }
    if (id_membro) { q += ` AND a.id_membro=?`; params.push(id_membro); }
    if (tipo) { q += ` AND a.tipo=?`; params.push(tipo); }
    q += ` ORDER BY a.data_inicio, a.hora`;
    res.json(db.prepare(q).all(...params));
  } else {
    let rows = memDB.atividades.map(a => {
      const m = memDB.membros.find(x => x.id === a.id_membro) || {};
      return { ...a, membro_nome: m.nome, membro_cor: m.cor };
    });
    if (mes && ano) rows = rows.filter(a => {
      const d = new Date(a.data_inicio);
      return d.getMonth()+1 === parseInt(mes) && d.getFullYear() === parseInt(ano);
    });
    if (id_membro) rows = rows.filter(a => a.id_membro === parseInt(id_membro));
    if (tipo) rows = rows.filter(a => a.tipo === tipo);
    res.json(rows.sort((a,b) => a.data_inicio.localeCompare(b.data_inicio)));
  }
});

app.get('/api/atividades/hoje', (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  if (!useMem) {
    const rows = db.prepare(`SELECT a.*, m.nome as membro_nome, m.cor as membro_cor FROM atividades a JOIN membros m ON a.id_membro=m.id WHERE a.data_inicio=? ORDER BY a.hora`).all(hoje);
    res.json(rows);
  } else {
    const rows = memDB.atividades.filter(a => a.data_inicio === hoje).map(a => {
      const m = memDB.membros.find(x => x.id === a.id_membro) || {};
      return { ...a, membro_nome: m.nome, membro_cor: m.cor };
    });
    res.json(rows);
  }
});

app.post('/api/atividades', (req, res) => {
  const { titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora } = req.body;
  if (!titulo || !tipo || !id_membro || !data_inicio) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  if (!useMem) {
    const r = db.prepare('INSERT INTO atividades (titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora) VALUES (?,?,?,?,?,?,?)').run(titulo, descricao||'', tipo, prioridade||'media', id_membro, data_inicio, hora||'');
    // Notificação
    db.prepare("INSERT INTO notificacoes (mensagem, id_atividade) VALUES (?, ?)").run(`Nova atividade: ${titulo} em ${data_inicio}`, r.lastInsertRowid);
    res.json({ id: r.lastInsertRowid, titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora });
  } else {
    const novo = { id: nextId.atividades++, titulo, descricao: descricao||'', tipo, prioridade: prioridade||'media', id_membro: parseInt(id_membro), data_inicio, hora: hora||'', concluida: 0, criado_em: new Date().toISOString() };
    memDB.atividades.push(novo);
    memDB.notificacoes.push({ id: nextId.notificacoes++, mensagem: `Nova atividade: ${titulo} em ${data_inicio}`, lida: 0, id_atividade: novo.id, criado_em: new Date().toISOString() });
    res.json(novo);
  }
});

app.put('/api/atividades/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora, concluida } = req.body;
  if (!useMem) {
    db.prepare('UPDATE atividades SET titulo=?,descricao=?,tipo=?,prioridade=?,id_membro=?,data_inicio=?,hora=?,concluida=? WHERE id=?').run(titulo, descricao, tipo, prioridade, id_membro, data_inicio, hora, concluida ? 1 : 0, id);
    // Pontos ao concluir
    if (concluida) {
      const pts = prioridade === 'alta' ? 30 : prioridade === 'media' ? 20 : 10;
      db.prepare('UPDATE membros SET pontos = pontos + ? WHERE id=?').run(pts, id_membro);
    }
    res.json({ success: true });
  } else {
    const a = memDB.atividades.find(x => x.id === id);
    if (!a) return res.status(404).json({ error: 'Não encontrado' });
    if (concluida && !a.concluida) {
      const m = memDB.membros.find(x => x.id === (id_membro || a.id_membro));
      if (m) m.pontos += prioridade === 'alta' ? 30 : prioridade === 'media' ? 20 : 10;
    }
    Object.assign(a, { titulo, descricao, tipo, prioridade, id_membro: parseInt(id_membro), data_inicio, hora, concluida: concluida ? 1 : 0 });
    res.json({ success: true });
  }
});

app.patch('/api/atividades/:id/concluir', (req, res) => {
  const id = parseInt(req.params.id);
  if (!useMem) {
    const a = db.prepare('SELECT * FROM atividades WHERE id=?').get(id);
    if (!a) return res.status(404).json({ error: 'Não encontrado' });
    const novo = a.concluida ? 0 : 1;
    db.prepare('UPDATE atividades SET concluida=? WHERE id=?').run(novo, id);
    if (novo === 1) {
      const pts = a.prioridade === 'alta' ? 30 : a.prioridade === 'media' ? 20 : 10;
      db.prepare('UPDATE membros SET pontos = pontos + ? WHERE id=?').run(pts, a.id_membro);
    }
    res.json({ concluida: novo });
  } else {
    const a = memDB.atividades.find(x => x.id === id);
    if (!a) return res.status(404).json({ error: 'Não encontrado' });
    a.concluida = a.concluida ? 0 : 1;
    if (a.concluida) {
      const m = memDB.membros.find(x => x.id === a.id_membro);
      if (m) m.pontos += a.prioridade === 'alta' ? 30 : a.prioridade === 'media' ? 20 : 10;
    }
    res.json({ concluida: a.concluida });
  }
});

app.delete('/api/atividades/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!useMem) {
    db.prepare('DELETE FROM atividades WHERE id=?').run(id);
  } else {
    memDB.atividades = memDB.atividades.filter(x => x.id !== id);
  }
  res.json({ success: true });
});

// ===== NOTIFICAÇÕES =====
app.get('/api/notificacoes', (req, res) => {
  if (!useMem) {
    res.json(db.prepare('SELECT * FROM notificacoes ORDER BY criado_em DESC LIMIT 20').all());
  } else {
    res.json([...memDB.notificacoes].reverse().slice(0, 20));
  }
});

app.patch('/api/notificacoes/lidas', (req, res) => {
  if (!useMem) db.prepare('UPDATE notificacoes SET lida=1').run();
  else memDB.notificacoes.forEach(n => n.lida = 1);
  res.json({ success: true });
});

// ===== DASHBOARD STATS =====
app.get('/api/stats', (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  if (!useMem) {
    const totalMembros = db.prepare('SELECT COUNT(*) as c FROM membros').get().c;
    const totalAtiv = db.prepare('SELECT COUNT(*) as c FROM atividades').get().c;
    const concluidasHoje = db.prepare("SELECT COUNT(*) as c FROM atividades WHERE concluida=1 AND data_inicio=?").get(hoje).c;
    const pendentes = db.prepare("SELECT COUNT(*) as c FROM atividades WHERE concluida=0 AND data_inicio>=?").get(hoje).c;
    const notLidas = db.prepare('SELECT COUNT(*) as c FROM notificacoes WHERE lida=0').get().c;
    const porTipo = db.prepare("SELECT tipo, COUNT(*) as total FROM atividades GROUP BY tipo").all();
    const topMembros = db.prepare("SELECT m.nome, m.cor, m.pontos, COUNT(a.id) as atividades FROM membros m LEFT JOIN atividades a ON m.id=a.id_membro GROUP BY m.id ORDER BY m.pontos DESC").all();
    res.json({ totalMembros, totalAtiv, concluidasHoje, pendentes, notLidas, porTipo, topMembros });
  } else {
    const totalMembros = memDB.membros.length;
    const totalAtiv = memDB.atividades.length;
    const concluidasHoje = memDB.atividades.filter(a => a.concluida && a.data_inicio === hoje).length;
    const pendentes = memDB.atividades.filter(a => !a.concluida && a.data_inicio >= hoje).length;
    const notLidas = memDB.notificacoes.filter(n => !n.lida).length;
    const tipos = {};
    memDB.atividades.forEach(a => tipos[a.tipo] = (tipos[a.tipo]||0)+1);
    const porTipo = Object.entries(tipos).map(([tipo,total]) => ({tipo,total}));
    const topMembros = memDB.membros.map(m => ({
      ...m,
      atividades: memDB.atividades.filter(a => a.id_membro === m.id).length
    })).sort((a,b) => b.pontos - a.pontos);
    res.json({ totalMembros, totalAtiv, concluidasHoje, pendentes, notLidas, porTipo, topMembros });
  }
});

// Serve index.html para qualquer rota não-API
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🚀 FamilyHub rodando em http://localhost:${PORT}\n`));
