import os
from flask import Flask, jsonify
import pandas as pd

app = Flask(__name__)

DADOS_CSV = 'orders.csv'

@app.route('/transactions', methods=['GET'])
def get_transactions():
    if not os.path.exists(DADOS_CSV):
        return jsonify({"error": "CSV não foi achado"})
    try:
        df = pd.read_csv(DADOS_CSV, sep=';')
        if df['value'].dtype == 'object':
            df['value'].str.replace(',', '.').astype(float)
        
        dados = df.to_dict(orient='records')
        '''
        schema retornado:
        [
            {
                "order_id": string,
                "created_at": Datetime (string),
                "status": string,
                "value": float,
                "payment_method": string
            },
            ...
        ]
        '''
        return jsonify(dados)
    
    except Exception as error:
        return jsonify({"error": str(error)}), 500
        
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)