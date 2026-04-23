/**
 * FAMILY HUB PROFESSIONAL LITE
 * Lógica robusta, limpa e performática
 */

const App = {
    state: {
        db: JSON.parse(localStorage.getItem("familyHubProfDB")) || {
            atividades: [],
            membros: [],
            compras: [],
            mural: [],
            config: { theme: 'light' }
        },
        currentUser: null
    },

    init() {
        this.applyTheme();
        this.setupEventListeners();
        this.checkSession();
    },

    // --- Persistência ---
    save() {
        localStorage.setItem("familyHubProfDB", JSON.stringify(this.state.db));
        this.render();
    },

    // --- Autenticação ---
    login() {
        const input = document.getElementById("login-user");
        const nome = input.value.trim();
        
        if (!nome) return this.notify("Por favor, digite seu nome.", "error");
        
        this.state.currentUser = nome;
        
        // Adiciona membro se não existir
        if (!this.state.db.membros.find(m => m.nome.toLowerCase() === nome.toLowerCase())) {
            this.state.db.membros.push({ nome, pontos: 0 });
        }
        
        document.getElementById("auth-screen").style.display = "none";
        document.getElementById("app-screen").style.display = "flex";
        document.getElementById("saudacao").innerText = `Olá, ${nome}!`;
        
        this.save();
    },

    logout() {
        if (confirm("Deseja realmente sair?")) {
            location.reload();
        }
    },

    checkSession() {
        // Simples verificação de carregamento inicial
        if (this.state.currentUser) {
            document.getElementById("auth-screen").style.display = "none";
            document.getElementById("app-screen").style.display = "flex";
        }
    },

    // --- Funcionalidades ---
    addAtividade() {
        const descInput = document.getElementById("atv-desc");
        const quemInput = document.getElementById("atv-quem");
        
        const desc = descInput.value.trim();
        const quem = quemInput.value;

        if (!desc || !quem) return this.notify("Preencha a descrição e o responsável.", "warning");

        this.state.db.atividades.push({
            id: crypto.randomUUID(),
            desc,
            quem,
            data: new Date().toISOString()
        });

        descInput.value = "";
        this.save();
        this.notify("Atividade adicionada!");
    },

    concluirAtividade(id) {
        const index = this.state.db.atividades.findIndex(a => a.id === id);
        if (index !== -1) {
            const atv = this.state.db.atividades[index];
            const membro = this.state.db.membros.find(m => m.nome === atv.quem);
            
            if (membro) membro.pontos += 10;
            
            this.state.db.atividades.splice(index, 1);
            this.save();
            this.notify(`Tarefa concluída! +10 pts para ${atv.quem}`);
        }
    },

    addCompra() {
        const input = document.getElementById("compra-nome");
        const nome = input.value.trim();
        
        if (!nome) return;

        this.state.db.compras.push({ id: crypto.randomUUID(), nome });
        input.value = "";
        this.save();
    },

    addMural() {
        const input = document.getElementById("mural-txt");
        const txt = input.value.trim();
        
        if (!txt) return;

        this.state.db.mural.push({
            id: crypto.randomUUID(),
            autor: this.state.currentUser,
            txt,
            timestamp: new Date().getTime()
        });

        input.value = "";
        this.save();
    },

    // --- UI & Render ---
    navegar(id, btn) {
        document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
        document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
        
        document.getElementById(`aba-${id}`).classList.add("ativa");
        btn.classList.add("active");
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        this.state.db.config.theme = next;
        this.applyTheme();
        this.save();
    },

    applyTheme() {
        document.documentElement.setAttribute("data-theme", this.state.db.config.theme);
    },

    notify(msg, type = "success") {
        // Simples alerta profissional (pode ser expandido para toasts)
        console.log(`[${type.toUpperCase()}] ${msg}`);
    },

    render() {
        // Render Atividades
        const listaAtv = document.getElementById("lista-atividades");
        listaAtv.innerHTML = this.state.db.atividades.length 
            ? this.state.db.atividades.map(a => `
                <div class="item-list">
                    <div>
                        <div style="font-weight: 600;">${a.desc}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.quem}</div>
                    </div>
                    <button class="btn-submit" style="padding: 6px 12px; font-size: 0.8rem;" onclick="App.concluirAtividade('${a.id}')">Concluir</button>
                </div>
            `).join("")
            : `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhuma atividade pendente.</p>`;

        // Render Compras
        const listaComp = document.getElementById("lista-compras");
        listaComp.innerHTML = this.state.db.compras.map(c => `
            <div class="item-list">
                <span>${c.nome}</span>
                <button class="btn-icon" onclick="App.state.db.compras = App.state.db.compras.filter(i => i.id !== '${c.id}'); App.save();">🗑️</button>
            </div>
        `).join("");

        // Render Mural
        const listaMural = document.getElementById("lista-mural");
        listaMural.innerHTML = this.state.db.mural.slice().reverse().map(m => `
            <div class="card" style="margin-bottom: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 700; font-size: 0.85rem; color: var(--primary);">${m.autor}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p style="font-size: 0.95rem;">${m.txt}</p>
            </div>
        `).join("");

        // Render Ranking
        const listaRank = document.getElementById("lista-ranking");
        listaRank.innerHTML = this.state.db.membros.sort((a,b) => b.pontos - a.pontos).map((m, i) => `
            <div class="item-list">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 800; color: var(--text-muted); width: 20px;">${i+1}º</span>
                    <span style="font-weight: 500;">${m.nome}</span>
                </div>
                <span class="badge" style="background: var(--primary-soft); color: var(--primary);">${m.pontos} pts</span>
            </div>
        `).join("");

        // Update Selects
        const sel = document.getElementById("atv-quem");
        const currentVal = sel.value;
        sel.innerHTML = `<option value="">Responsável</option>` + 
            this.state.db.membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join("");
        sel.value = currentVal;
    },

    setupEventListeners() {
        // Atalho para Enter nos inputs
        const inputs = ['login-user', 'atv-desc', 'compra-nome', 'mural-txt'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        if (id === 'login-user') this.login();
                        if (id === 'atv-desc') this.addAtividade();
                        if (id === 'compra-nome') this.addCompra();
                        if (id === 'mural-txt') this.addMural();
                    }
                });
            }
        });
    }
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => App.init());