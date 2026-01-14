import re

def conciliar_comprovante_manual(caminho_imagem):
    try:
        # Abre o arquivo para simular a extração de texto
        with open(caminho_imagem, 'rb') as f:
            conteudo_bruto = f.read().decode('latin-1', errors='ignore')

        # 1. Busca o nome do estabelecimento
        nome_match = re.search(r'([A-Z0-9\s]{5,20})', conteudo_bruto)
        estabelecimento = nome_match.group(1).strip() if nome_match else "Estabelecimento"

        # 2. Busca o Valor Total (0,00 ou 0.00)
        # Prioriza a chave 'valor_a_pagar' que o JS espera
        match = re.search(r'(\d+[,\.]\d{2})', conteudo_bruto)
        valor = float(match.group(1).replace(',', '.')) if match else 0.0
            
        return {
            "estabelecimento": estabelecimento,
            "valor_a_pagar": valor,
            "itens": [{"nome": "Consumo Geral", "preco": valor}]
        }
    except Exception as e:
        return {"error": str(e)}