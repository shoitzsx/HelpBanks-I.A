import os
import re
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from groq import Groq
from datetime import datetime

# Tenta importar o conciliador, se falhar cria uma função de fallback
try:
    from conciliador import conciliar_comprovante_manual
except ImportError:
    def conciliar_comprovante_manual(c): 
        return {"error": "Arquivo conciliador.py nao encontrado"}

app = Flask(__name__)

# --- CONFIGURAÇÕES GERAIS ---
app.config['SECRET_KEY'] = 'purple-neon-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///helpbanks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- CONFIGURAÇÃO GROQ ---
CHAVE_API = "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"
client = Groq(api_key=CHAVE_API)
MODELO_GROQ = "llama-3.3-70b-versatile"

# --- CONFIGURAÇÃO LOGIN E BANCO ---
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# ==========================================
# 📊 MODELOS DE BANCO DE DADOS
# ==========================================

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cpf = db.Column(db.String(11), unique=True, nullable=False)
    username = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(200), nullable=False)
    gastos = db.relationship('Gasto', backref='usuario', lazy=True)
    contas_fixas = db.relationship('ContaFixa', backref='usuario', lazy=True)
    saldo_info = db.relationship('Saldo', backref='usuario', uselist=False)

class Gasto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    descricao = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    categoria = db.Column(db.String(50), nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

class ContaFixa(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, default=0.0)

class Saldo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    valor_atual = db.Column(db.Float, default=0.0)
    reserva_emergencia = db.Column(db.Float, default=0.0)

class Simulacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    banco = db.Column(db.String(50))
    valor = db.Column(db.Float)
    aula_texto = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==========================================
# 📷 ROTA DE CONCILIAÇÃO
# ==========================================

@app.route('/api/conciliar', methods=['POST'])
@login_required
def rota_conciliacao():
    if 'file' not in request.files:
        return jsonify({"error": "Nenhuma foto enviada"}), 400
        
    foto = request.files['file']
    caminho = os.path.join(UPLOAD_FOLDER, "temp_nota.jpg")
    foto.save(caminho)
    
    try:
        resultado = conciliar_comprovante_manual(caminho)
        # Sincronização de chaves para o JavaScript (ajuste para valor_a_pagar)
        if isinstance(resultado, dict):
            if "valor_total" in resultado and "valor_a_pagar" not in resultado:
                resultado["valor_a_pagar"] = resultado["valor_total"]
            return jsonify(resultado)
        return jsonify({"error": "Formato de retorno invalido"}), 500
    except Exception as e:
        return jsonify({"error": f"Erro ao processar: {str(e)}"}), 500

# ==========================================
# 🛡️ ROTAS DE AUTENTICAÇÃO
# ==========================================

def cpf_valido(cpf):
    cpf = re.sub(r'\D', '', cpf)
    if len(cpf) != 11 or len(set(cpf)) == 1: return False
    return True 

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        cpf = re.sub(r'\D', '', request.form.get('cpf', ''))
        senha = request.form.get('password', '')
        user = User.query.filter_by(cpf=cpf).first()
        if user and check_password_hash(user.password, senha):
            login_user(user)
            return redirect(url_for('index'))
        flash('CPF ou Senha incorretos!')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        cpf = re.sub(r'\D', '', request.form.get('cpf', ''))
        nome = request.form.get('username', '')
        senha = request.form.get('password', '')
        if not cpf_valido(cpf) or User.query.filter_by(cpf=cpf).first():
            flash('Erro no CPF ou ja cadastrado!')
            return redirect(url_for('register'))
        hashed_pw = generate_password_hash(senha)
        novo_usuario = User(cpf=cpf, username=nome, password=hashed_pw)
        db.session.add(novo_usuario)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html', usuario=current_user.username)

# ==========================================
# 💰 API FINANCEIRA
# ==========================================

@app.route('/api/saldo', methods=['GET', 'PUT'])
@login_required
def gerenciar_saldo():
    saldo_obj = Saldo.query.filter_by(user_id=current_user.id).first()
    if not saldo_obj:
        saldo_obj = Saldo(user_id=current_user.id, valor_atual=0.0, reserva_emergencia=0.0)
        db.session.add(saldo_obj)
        db.session.commit()
    if request.method == 'GET':
        return jsonify({"valor_atual": saldo_obj.valor_atual, "reserva_emergencia": saldo_obj.reserva_emergencia})
    
    data = request.json
    saldo_obj.valor_atual = float(data.get('valor_atual', saldo_obj.valor_atual))
    saldo_obj.reserva_emergencia = float(data.get('reserva_emergencia', saldo_obj.reserva_emergencia))
    db.session.commit()
    return jsonify({"status": "sucesso"})

@app.route('/api/gastos', methods=['GET', 'POST'])
@login_required
def gerenciar_gastos():
    if request.method == 'GET':
        gastos = Gasto.query.filter_by(user_id=current_user.id).all()
        return jsonify([{"descricao": g.descricao, "valor": g.valor, "categoria": g.categoria} for g in gastos])
    
    data = request.json
    novo = Gasto(
        user_id=current_user.id, 
        descricao=data['descricao'], 
        valor=float(data['valor']), 
        categoria=data['categoria']
    )
    db.session.add(novo)
    db.session.commit()
    return jsonify({"status": "salvo"})

@app.route('/api/contas-fixas', methods=['GET', 'POST'])
@login_required
def gerenciar_contas():
    if request.method == 'GET':
        contas = ContaFixa.query.filter_by(user_id=current_user.id).all()
        return jsonify([{"id": c.id, "nome": c.nome, "valor": c.valor} for c in contas])
    
    data = request.json
    nova = ContaFixa(user_id=current_user.id, nome=data['nome'], valor=float(data.get('valor', 0)))
    db.session.add(nova)
    db.session.commit()
    return jsonify({"status": "salvo", "id": nova.id})

# ==========================================
# 🤖 IA E SIMULAÇÕES
# ==========================================

@app.route('/analisar', methods=['POST'])
@login_required
def analisar():
    dados = request.json
    prompt = f"Analise: {dados.get('descricao')}. Seja um mentor financeiro duro (max 15 palavras)."
    completion = client.chat.completions.create(model=MODELO_GROQ, messages=[{"role": "user", "content": prompt}])
    return jsonify({"dica": completion.choices[0].message.content})

@app.route('/simular_investimento', methods=['POST'])
@login_required
def simular_investimento():
    dados = request.json
    banco = dados.get('banco')
    valor = float(dados.get('valor', 0))
    tipo = dados.get('tipo', 'CDB')
    
    taxa_mensal = (1 + 0.105)**(1/12) - 1
    evolucao = [round(valor * (1 + taxa_mensal)**i, 2) for i in range(13)]
    
    prompt = f"Explique investimento de R${valor} no {banco} ({tipo}). CDI 10.5%. Use HTML. Final: R${evolucao[-1]}."
    completion = client.chat.completions.create(model=MODELO_GROQ, messages=[{"role": "user", "content": prompt}])
    return jsonify({"resposta": completion.choices[0].message.content, "dados_grafico": evolucao})

@app.route('/comparar_bancos', methods=['POST'])
@login_required
def api_comparar_bancos():
    dados = request.json
    b1, b2, valor = dados.get('banco1'), dados.get('banco2'), dados.get('valor')
    
    prompt = (f"Duelo: {b1} vs {b2} for R${valor}. Retorne JSON rigorosamente neste formato: "
              f'{{"vencedor": "nome", "score": "nota 0-10", "resumo": "2 linhas", "aula": "texto formatado com tags HTML"}}')
    
    completion = client.chat.completions.create(
        model=MODELO_GROQ, 
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content

@app.route('/api/historico_simulacoes', methods=['GET', 'POST'])
@login_required
def api_historico_simulacoes():
    if request.method == 'GET':
        sims = Simulacao.query.filter_by(user_id=current_user.id).order_by(Simulacao.data_criacao.desc()).all()
        return jsonify([{
            "banco": s.banco, "valor": s.valor, "aula": s.aula_texto, "data": s.data_criacao.strftime('%d/%m/%Y')
        } for s in sims])
    
    data = request.json
    nova = Simulacao(
        user_id=current_user.id, 
        banco=data.get('banco'), 
        valor=float(data.get('valor')), 
        aula_texto=data.get('aula')
    )
    db.session.add(nova)
    db.session.commit()
    return jsonify({"status": "sucesso"}), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)