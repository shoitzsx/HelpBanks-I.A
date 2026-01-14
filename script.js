// --- VARIÁVEIS GLOBAIS ---
let saldoGlobal = 0;
let totalEmergencia = 0;
let listaGeralParaIA = [];
let contasFixas = [];

// Dados dos bancos para o Ranking
const bancosData = [
    { nome: "Nubank", tipo: "CDB 100% CDI", risco: "Baixo" },
    { nome: "Banco Inter", tipo: "LCI/LCA", risco: "Baixo" },
    { nome: "Itaú", tipo: "CDB Progressivo", risco: "Muito Baixo" },
    { nome: "BTG Pactual", tipo: "Tesouro Direto", risco: "Baixo" },
    { nome: "XP Investimentos", tipo: "CDB XP", risco: "Baixo" },
    { nome: "C6 Bank", tipo: "CDB Pós-fixado", risco: "Médio" },
    { nome: "Banco Safra", tipo: "Letras Financeiras", risco: "Baixo" },
    { nome: "Banco do Brasil", tipo: "LCA", risco: "Muito Baixo" },
    { nome: "Bradesco", tipo: "CDB Fácil", risco: "Muito Baixo" },
    { nome: "Santander", tipo: "CDB Diário", risco: "Muito Baixo" },
    { nome: "PagBank", tipo: "CDB 110% CDI", risco: "Médio" },
    { nome: "Mercado Pago", tipo: "Conta Rendeira", risco: "Médio" },
    { nome: "Banco Pan", tipo: "CDB Liquidez", risco: "Médio" },
    { nome: "Daycoval", tipo: "LCI Isenta", risco: "Baixo" },
    { nome: "Banco BMG", tipo: "CDB Super", risco: "Baixo" }
];

// ==========================================
// 🛡️ SEGURANÇA E CARREGAMENTO INICIAL
// ==========================================

window.onload = async () => {
    await carregarDadosDoBanco();
};

async function carregarDadosDoBanco() {
    try {
        const respSaldo = await fetch('/api/saldo');
        const dataSaldo = await respSaldo.json();
        saldoGlobal = dataSaldo.valor_atual || 0;
        totalEmergencia = dataSaldo.reserva_emergencia || 0;

        const respGastos = await fetch('/api/gastos');
        listaGeralParaIA = await respGastos.json();

        const respFixas = await fetch('/api/contas-fixas');
        contasFixas = await respFixas.json();

        atualizarSaldo();
        document.getElementById('total-emergencia').innerText = totalEmergencia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        renderizarContasFixas();
        const listaLazer = document.getElementById('lista-lazer');
        const listaVariaveis = document.getElementById('lista-variaveis');
        if (listaLazer) listaLazer.innerHTML = "";
        if (listaVariaveis) listaVariaveis.innerHTML = "";

        listaGeralParaIA.forEach(g => {
            const listaUL = document.getElementById(g.categoria === 'Lazer' ? 'lista-lazer' : 'lista-variaveis');
            if (listaUL) listaUL.innerHTML += `<li>${g.descricao}: R$ ${g.valor.toFixed(2).replace('.', ',')}</li>`;
        });

    } catch (e) { console.error("Erro ao carregar dados:", e); }
}

// --- NAVEGAÇÃO ---
// --- NAVEGAÇÃO ATUALIZADA ---
function navegarPara(aba) {
    const abas = {
        'dashboard': document.getElementById('aba-dashboard'),
        'comprovantes': document.getElementById('aba-comprovantes'),
        'ranking': document.getElementById('aba-ranking'),
        'aulas': document.getElementById('aba-aulas') // Adicionada nova aba
    };

    Object.keys(abas).forEach(key => {
        if (abas[key]) {
            abas[key].style.display = (key === aba) ? 'block' : 'none';
        }
    });

    // Gatilhos específicos ao entrar em cada aba
    if (aba === 'ranking') {
        atualizarRankingIA();
    }

    if (aba === 'aulas') {
        exibirHistorico(); // Carrega as aulas salvas apenas quando entra na aba de aulas
    }

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('fechada')) toggleMenu();
    }
}

// --- SISTEMA DE BUSCA (RANKING E AULAS) ---

// Filtra os bancos na aba Ranking
function filtrarBancos() {
    const input = document.getElementById('input-busca').value.toLowerCase();
    const cards = document.querySelectorAll('#lista-ranking-bancos .card-ia');

    cards.forEach(card => {
        const nome = card.querySelector('h4').innerText.toLowerCase();
        card.style.display = nome.includes(input) ? "block" : "none";
    });
}

// Filtra as aulas salvas na aba Rever Aulas
function filtrarAulas() {
    const termo = document.getElementById('busca-aula').value.toLowerCase();
    const aulas = document.querySelectorAll('#historico-lista-aulas .card-ia');

    aulas.forEach(aula => {
        const conteudo = aula.innerText.toLowerCase();
        aula.style.display = conteudo.includes(termo) ? "block" : "none";
    });
}

// --- HISTÓRICO CORRIGIDO PARA A NOVA ABA ---
async function exibirHistorico() {
    try {
        const resp = await fetch('/api/historico_simulacoes');
        const sims = await resp.json();

        // Agora aponta para o ID correto da aba "Rever Aulas"
        const container = document.getElementById('historico-lista-aulas');
        if (!container) return;

        if (sims.length === 0) {
            container.innerHTML = "<p style='color:var(--text-dim); text-align:center; padding:20px;'>Nenhuma aula salva no seu cofre ainda.</p>";
            return;
        }

        container.innerHTML = sims.map(s => `
            <div class="card-ia" style="border-left: 4px solid var(--purple-neon); margin-bottom:15px; padding:15px; background: rgba(168, 85, 247, 0.05);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div>
                        <h4 style="color: #fff; margin:0;">${s.banco}</h4>
                        <small style="color:var(--purple-neon)">Simulação: R$ ${s.valor.toLocaleString('pt-BR')}</small>
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-dim);">${s.data}</span>
                </div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">
                <details style="font-size:0.9rem; color:#e2e2e2;">
                    <summary style="cursor:pointer; color:var(--purple-neon); font-weight:bold;">
                        <i class="fas fa-book-open"></i> ABRIR CONTEÚDO DA AULA
                    </summary>
                    <div class="conteudo-aula-salva" style="margin-top:15px; line-height:1.6;">
                        ${s.aula}
                    </div>
                </details>
            </div>
        `).join('');
    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
    }
}
// --- GESTÃO DE SALDO ---
function atualizarSaldo() {
    const elementoSaldo = document.getElementById('saldo-valor');
    if (elementoSaldo) {
        elementoSaldo.innerText = saldoGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        elementoSaldo.style.color = saldoGlobal < 0 ? "#ff4444" : "#22c55e";
    }
}

function abrirModalSaldo() { document.getElementById('modal-overlay').style.display = 'flex'; }
function fecharModalSaldo() { document.getElementById('modal-overlay').style.display = 'none'; }

async function confirmarNovoSaldo() {
    const input = document.getElementById('novo-valor-saldo');
    let valor = parseFloat(input.value.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor)) return alert("Valor inválido");

    saldoGlobal = valor;
    await fetch('/api/saldo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_atual: saldoGlobal, reserva_emergencia: totalEmergencia })
    });

    atualizarSaldo();
    fecharModalSaldo();
    input.value = '';
}

// --- GASTOS E RESERVA ---
// CORREÇÃO: Removida a chamada automática de analisarTudoComIA() para focar no relatório
async function adicionarGasto() {
    const desc = document.getElementById('desc-gasto').value;
    const valor = parseFloat(document.getElementById('valor-gasto').value);
    const categoria = document.getElementById('categoria-gasto').value;

    if (!desc || isNaN(valor)) return alert("Preencha tudo!");

    const resp = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: desc, valor: valor, categoria: categoria })
    });

    if (resp.ok) {
        saldoGlobal -= valor;
        await fetch('/api/saldo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor_atual: saldoGlobal })
        });

        listaGeralParaIA.push({ categoria, descricao: desc, valor });
        const listaUL = document.getElementById(categoria === 'Lazer' ? 'lista-lazer' : 'lista-variaveis');
        listaUL.innerHTML += `<li>${desc}: R$ ${valor.toFixed(2).replace('.', ',')}</li>`;

        atualizarSaldo();
        document.getElementById('desc-gasto').value = '';
        document.getElementById('valor-gasto').value = '';
    }
}

async function salvarEmergencia() {
    const input = document.getElementById('valor-emergencia');
    const valor = parseFloat(input.value) || 0;
    if (valor <= 0) return alert("Digite um valor!");

    saldoGlobal -= valor;
    totalEmergencia += valor;

    await fetch('/api/saldo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_atual: saldoGlobal, reserva_emergencia: totalEmergencia })
    });

    atualizarSaldo();
    document.getElementById('total-emergencia').innerText = totalEmergencia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    input.value = '';
}

// --- CONTAS FIXAS ---
async function criarNovaContaFixo() {
    const nomeInput = document.getElementById('nova-conta-nome');
    const nome = nomeInput.value.trim();
    if (!nome) return alert("Digite o nome!");

    const resp = await fetch('/api/contas-fixas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, valor: 0 })
    });

    const data = await resp.json();
    contasFixas.push({ id: data.id, nome: nome, valor: 0 });
    renderizarContasFixas();
    nomeInput.value = '';
}

function renderizarContasFixas() {
    const container = document.getElementById('container-contas-fixas');
    if (!container) return;
    container.innerHTML = contasFixas.map(conta => `
        <div class="item-fixo" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; background: rgba(168, 85, 247, 0.05); padding: 10px; border-radius: 8px;">
            <span style="flex: 1; color: #fff;">${conta.nome}</span>
            <input type="number" value="${conta.valor}" onchange="atualizarValorFixa(${conta.id}, this.value)" style="width: 80px; background: #000; color: #fff; border: 1px solid #444;">
        </div>
    `).join('');
}

async function atualizarValorFixa(id, valor) {
    const conta = contasFixas.find(c => c.id === id);
    if (conta) {
        conta.valor = parseFloat(valor) || 0;
    }
}

// --- FUNÇÕES DA IA (RELATÓRIO E MENTOR) ---

async function gerarRelatorioMensal() {
    const relatorioDiv = document.getElementById('relatorio-detalhado');
    const textoRelatorio = document.getElementById('texto-relatorio');

    relatorioDiv.style.display = 'block';
    textoRelatorio.innerHTML = `
        <div style="max-width: 300px; margin: 0 auto 20px;">
            <canvas id="graficoGastos"></canvas>
        </div>
        <div id="analise-ia-conteudo">⏳ <b>O Mentor está analisando seus riscos...</b></div>
    `;

    const categorias = {};
    listaGeralParaIA.forEach(g => {
        categorias[g.categoria] = (categorias[g.categoria] || 0) + g.valor;
    });

    // Adiciona contas fixas no gráfico também
    let totalFixas = 0;
    contasFixas.forEach(c => totalFixas += c.valor);
    if (totalFixas > 0) categorias['Fixas'] = totalFixas;

    const ctx = document.getElementById('graficoGastos').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categorias),
            datasets: [{
                data: Object.values(categorias),
                // Dentro da função gerarRelatorioMensal, substitua o backgroundColor por este:
                backgroundColor: [
                    '#a855f7', // Roxo Neon (Nu)
                    '#820ad1', // Roxo Nubank Profundo
                    '#22c55e', // Verde Sucesso
                    '#00d7ff', // Azul Elétrico
                    '#f59e0b'  // Amarelo Alerta
                ],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: '#e2e2e2' } }
            }
        }
    });

    try {
        const resumoCompilado = {
            descricao: `Analise os riscos financeiros: Gastos por categoria ${JSON.stringify(categorias)}. Saldo atual: R$${saldoGlobal}. Dê um conselho de mentor focado em riscos.`
        };

        const resp = await fetch('/analisar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resumoCompilado)
        });
        const data = await resp.json();

        document.getElementById('analise-ia-conteudo').innerHTML = `
            <div class="card-ia" style="border-left: 4px solid #f59e0b; margin-top: 20px; background: rgba(245, 158, 11, 0.05);">
                <h4 style="color: #f59e0b;">⚠️ Análise de Risco</h4>
                <p style="font-size: 0.9rem; margin-bottom: 15px; color: #e2e2e2;">${data.dica}</p>
                <hr style="border: 0.5px solid #2d2d44; margin: 10px 0;">
                <h4 style="color: #a855f7;">💎 Conselho do Mentor</h4>
                <p style="color: #e2e2e2;">Com base no seu saldo e distribuição de gastos, sua prioridade deve ser o controle de <b>${Object.keys(categorias)[0] || 'gastos gerais'}</b> para evitar comprometer sua reserva.</p>
            </div>
        `;
    } catch (e) {
        document.getElementById('analise-ia-conteudo').innerText = "Erro ao carregar análise de riscos.";
    }
}

async function perguntarMentor() {
    const pergunta = document.getElementById('pergunta-mentor').value;
    const respostaTexto = document.getElementById('mentor-texto');
    if (!pergunta) return;

    respostaTexto.innerText = "⏳ Consultando inteligência de mercado...";

    try {
        const resp = await fetch('/simular_investimento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banco: "Geral/Mercado", pergunta: pergunta })
        });
        const data = await resp.json();
        respostaTexto.innerHTML = data.resposta;
    } catch (e) { respostaTexto.innerText = "Erro na consulta."; }
}
// ... (mantenha suas variáveis globais e carregarDadosDoBanco)

async function escanearComprovante() {
    const fileInput = document.getElementById('inputNota');
    const display = document.getElementById('resultadoOcr');
    if (!fileInput.files[0]) return;

    display.innerHTML = `<p style="color: #a855f7;">✨ O Mentor está lendo sua nota...</p>`;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/api/conciliar', { method: 'POST', body: formData });
        const dados = await response.json();

        if (dados.error) {
            display.innerHTML = `<p style="color: #ff4444;">❌ Erro: ${dados.error}</p>`;
        } else {
            // CORREÇÃO: Usando a chave correta valor_a_pagar
            display.innerHTML = `
                <div class="card-ia" style="border: 1px solid #a855f7; background: rgba(168, 85, 247, 0.05); padding: 15px;">
                    <h4 style="color: #a855f7;">📄 Nota Processada</h4>
                    <p><strong>Local:</strong> ${dados.estabelecimento}</p>
                    <p style="font-size: 1.2rem; margin: 10px 0;">
                        <strong>Total:</strong> <span style="color: #22c55e;">R$ ${dados.valor_a_pagar.toFixed(2).replace('.', ',')}</span>
                    </p>
                    <button class="btn-add" onclick="abaterGastoAutomatico(${dados.valor_a_pagar}, '${dados.estabelecimento}')" style="width:100%;">
                        Confirmar e Abater
                    </button>
                </div>`;
        }
    } catch (erro) {
        display.innerHTML = `<p style="color: #ff4444;">❌ Erro de conexão.</p>`;
    }
}

async function abaterGastoAutomatico(valor, local) {
    if (!confirm(`Abater R$ ${valor.toFixed(2)} de ${local}?`)) return;

    try {
        // 1. Registra o gasto
        await fetch('/api/gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descricao: `Nota: ${local}`, valor: valor, categoria: 'Variáveis' })
        });

        // 2. Atualiza o saldo global
        saldoGlobal -= valor;
        await fetch('/api/saldo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor_atual: saldoGlobal })
        });

        atualizarSaldo();
        alert("✅ Saldo atualizado!");
        location.reload(); 
    } catch (e) {
        alert("Erro no processo.");
    }
}
// Vincula o evento de mudança do input para disparar a função automaticamente
document.getElementById('inputNota').addEventListener('change', escanearComprovante);
// --- UTILITÁRIOS ---
// --- FUNÇÕES DE RANKING, SIMULAÇÃO E DUELO IA ---

function atualizarRankingIA() {
    const lista = document.getElementById('lista-ranking-bancos');
    if (!lista) return;

    // Renderiza cada banco como um Card Interativo de Simulação e Comparação
    lista.innerHTML = bancosData.map((b, index) => {
        // Criar um ID único para cada banco removendo espaços
        const bankId = b.nome.replace(/\s/g, '');

        return `
            <div class="card-ia" style="margin-bottom: 15px; border-left: 5px solid #a855f7;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4>${b.nome}</h4>
                    <span class="badge-seguranca" style="background: ${b.risco === 'Muito Baixo' ? '#22c55e' : '#f59e0b'}">${b.risco}</span>
                </div>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px;">${b.tipo}</p>
                
                <div class="simulador-inputs" style="display: flex; gap: 8px; margin-top: 10px;">
                    <input type="number" id="valor-sim-${index}" placeholder="R$ Valor" style="flex: 1.5; padding: 8px; font-size: 0.8rem;">
                    <select id="tipo-sim-${index}" style="flex: 1; padding: 8px; font-size: 0.8rem;">
                        <option value="CDB 100% CDI">CDB</option>
                        <option value="LCI/LCA">LCI/LCA</option>
                        <option value="Tesouro">Tesouro</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn-add" onclick="executarSimulacao('${b.nome}', ${index})" style="flex: 2; padding: 8px;">Simular com IA</button>
                    <button class="btn-add" id="btn-comp-${bankId}" onclick="selecionarParaComparar('${b.nome}')" style="flex: 1; background: rgba(168, 85, 247, 0.2); padding: 8px;">⚖️ Comparar</button>
                </div>

                <div id="resultado-sim-${index}" style="margin-top: 15px; font-size: 0.9rem; color: #e2e2e2; display: none; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;">
                    </div>
            </div>
        `;
    }).join('');
}

async function executarSimulacao(nomeBanco, index) {
    const valor = document.getElementById(`valor-sim-${index}`).value;
    const tipo = document.getElementById(`tipo-sim-${index}`).value;
    const display = document.getElementById(`resultado-sim-${index}`);

    if (!valor || valor <= 0) return alert("Digite um valor para simular!");

    display.style.display = "block";
    display.innerHTML = `
        <div style="text-align:center">⏳ <b>Mentor calculando rendimentos...</b></div>
        <canvas id="chart-sim-${index}" style="margin-top:15px; max-height:180px;"></canvas>
        <div id="texto-sim-${index}" style="margin-top:15px; line-height: 1.5;"></div>
    `;

    try {
        const resp = await fetch('/simular_investimento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banco: nomeBanco, valor: valor, tipo: tipo })
        });
        const data = await resp.json();
        // ... dentro do try de executarSimulacao, após preencher data.resposta:
        document.getElementById(`texto-sim-${index}`).innerHTML = `
${data.resposta}
<button class="btn-add" onclick="salvarSimulacaoNoBanco('${nomeBanco}', ${valor}, ${index})" 
        style="margin-top:15px; width:100%; background:#22c55e;">
    💾 Salvar aula no Histórico
</button>
`;
        document.getElementById(`texto-sim-${index}`).innerHTML = data.resposta;

        // Renderiza o gráfico de evolução (CDI 10.5% a.a. simulado no back-end)
        const ctx = document.getElementById(`chart-sim-${index}`).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mês 0', 'Mês 3', 'Mês 6', 'Mês 9', '1 Ano'],
                datasets: [{
                    label: 'Crescimento R$',
                    data: data.dados_grafico.filter((_, i) => i % 3 === 0),
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#2d2d44' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });

    } catch (e) {
        display.innerHTML = "Erro ao conectar com a IA financeira.";
    }
}

// --- LÓGICA DE DUELO (COMPARAÇÃO) ---

let bancosParaComparar = [];

function selecionarParaComparar(nome) {
    const bankId = nome.replace(/\s/g, '');
    const btn = document.getElementById(`btn-comp-${bankId}`);

    if (bancosParaComparar.includes(nome)) {
        bancosParaComparar = bancosParaComparar.filter(b => b !== nome);
        btn.style.background = "rgba(168, 85, 247, 0.2)";
    } else if (bancosParaComparar.length < 2) {
        bancosParaComparar.push(nome);
        btn.style.background = "#a855f7";
    }

    if (bancosParaComparar.length === 2) {
        iniciarComparacaoIA();
    }
}

async function iniciarComparacaoIA() {
    // 1. Coleta o valor e limpa caracteres brasileiros (R$, pontos de milhar)
    const valorInput = prompt(`Duelo: ${bancosParaComparar[0]} vs ${bancosParaComparar[1]}\nQual valor deseja investir para a análise?`, "1000");
    if (!valorInput) return resetarSelecao();

    // Converte "1.500,00" para 1500.00
    const valorNumerico = parseFloat(valorInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNumerico)) return alert("Por favor, digite um valor válido.");

    const container = document.getElementById('lista-ranking-bancos');
    container.innerHTML = `
        <div class="card-ia" style="text-align:center; padding: 40px; background: rgba(168, 85, 247, 0.05); border: 1px dashed #a855f7;">
            <div class="loader-ia" style="margin-bottom: 20px; font-size: 2rem; animation: pulse 1s infinite;">🚀</div>
            <b style="color: #a855f7;">O Mentor está analisando as taxas e segurança...</b>
        </div>`;

    try {
        const resp = await fetch('/comparar_bancos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                banco1: bancosParaComparar[0],
                banco2: bancosParaComparar[1],
                valor: valorNumerico
            })
        });

        if (!resp.ok) throw new Error("Erro na resposta do servidor");

        let data = await resp.json();

        // Se a IA retornar uma string em vez de objeto, tentamos converter
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }

        container.innerHTML = `
            <div class="card-ia" style="border: 2px solid #22c55e; background: rgba(34, 197, 94, 0.05); animation: fadeIn 0.5s ease-in;">
                <div style="text-align:center; margin-bottom: 20px;">
                    <span style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Resultado do Duelo</span>
                    <h2 style="color: #22c55e; margin: 10px 0;">🏆 ${data.vencedor} VENCEU!</h2>
                    <div style="font-size: 1.2rem; font-weight: bold; color: #a855f7; background: rgba(168, 85, 247, 0.1); display: inline-block; padding: 5px 15px; border-radius: 20px;">
                        Score IA: ${data.score}/10
                    </div>
                </div>
                
                <p style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 3px solid #a855f7; line-height: 1.5;">
                    ${data.resumo}
                </p>

                <button class="btn-relatorio" id="btn-aula-ia" style="width: 100%; padding: 12px; font-weight: bold; cursor: pointer;">
                    👨‍🏫 VER EXPLICAÇÃO TÉCNICA
                </button>
                
                <div id="aula-area" style="display:none; margin-top: 20px; padding-top: 20px; border-top: 1px solid #2d2d44;">
                    <h4 style="color: #a855f7; margin-bottom: 10px;">Análise Profunda:</h4>
                    <div style="color: #ccc; line-height: 1.6; font-size: 0.9rem;">
                        ${data.aula}
                    </div>
                    <button class="btn-add" onclick="salvarDueloNoHistorico('${data.vencedor}', ${valorNumerico}, \`${data.aula.replace(/"/g, "'")}\`)" 
                            style="margin-top:15px; width:100%; background:#22c55e;">
                        💾 Salvar duelo no Cofre
                    </button>
                </div>

                <button onclick="resetarSelecao()" style="background:none; color:#64748b; width:100%; border:none; margin-top:25px; cursor:pointer; font-size: 0.8rem;">
                    ⬅ Voltar ao Ranking
                </button>
            </div>
        `;

        document.getElementById('btn-aula-ia').onclick = () => {
            document.getElementById('aula-area').style.display = 'block';
            document.getElementById('btn-aula-ia').style.display = 'none';
        };

    } catch (e) {
        console.error("Erro na comparação:", e);
        alert("O Mentor financeiro está ocupado. Tente novamente em instantes.");
        resetarSelecao();
    }
}

// Função auxiliar para salvar o duelo (opcional, baseada na sua lógica de histórico)
async function salvarDueloNoHistorico(vencedor, valor, aula) {
    try {
        await fetch('/api/historico_simulacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                banco: `Duelo: ${vencedor}`,
                valor: valor,
                aula: aula
            })
        });
        alert("Duelo salvo no histórico!");
    } catch (e) {
        console.error("Erro ao salvar histórico do duelo");
    }
}

function resetarSelecao() {
    bancosParaComparar = [];
    atualizarRankingIA();
}
async function exibirHistorico() {
    const resp = await fetch('/api/historico_simulacoes');
    const sims = await resp.json();
    const container = document.getElementById('historico-lista');
    if (!container) return;

    if (sims.length === 0) {
        container.innerHTML = "<p style='color:var(--text-dim); font-size:0.8rem;'>Nenhuma aula salva ainda.</p>";
        return;
    }

    container.innerHTML = sims.map(s => `
        <div class="card-ia" style="border-left: 3px solid var(--success); margin-bottom:10px; padding:10px;">
            <div style="font-size:0.8rem; display:flex; justify-content:space-between;">
                <b>${s.banco} (R$ ${s.valor})</b>
                <span>${s.data}</span>
            </div>
            <details style="margin-top:5px; font-size:0.85rem; color:#ccc;">
                <summary style="cursor:pointer; color:var(--purple-neon);">Rever aula</summary>
                <div style="margin-top:10px;">${s.aula}</div>
            </details>
        </div>
    `).join('');
}
async function salvarSimulacaoNoBanco(banco, valor, index) {
    const aulaElement = document.getElementById(`texto-sim-${index}`);
    if (!aulaElement) return;

    const aulaConteudo = aulaElement.innerHTML;

    try {
        const resp = await fetch('/api/historico_simulacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                banco: banco,
                valor: valor,
                aula: aulaConteudo
            })
        });

        if (resp.ok) {
            alert("✅ Aula salva com sucesso no seu cofre!");
            exibirHistorico(); // Atualiza a lista lateral imediatamente
        }
    } catch (e) {
        console.error("Erro ao salvar simulação:", e);
        alert("Erro ao salvar no histórico.");
    }
}
async function abaterGastoAutomatico(valor, local) {
    if (!confirm(`Deseja abater R$ ${valor.toFixed(2)} do seu saldo referente a ${local}?`)) return;

    try {
        const resp = await fetch('/api/gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                descricao: `Nota: ${local}`, 
                valor: valor, 
                categoria: 'Variáveis' 
            })
        });

        if (resp.ok) {
            saldoGlobal -= valor;
            atualizarSaldo();
            alert("✅ Gasto registrado e saldo atualizado!");
            location.reload(); // Recarrega para atualizar as listas
        }
    } catch (e) {
        alert("Erro ao processar o abate automático.");
    }
}