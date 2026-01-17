from datetime import timedelta
from dotenv import load_dotenv
from werkzeug.security import check_password_hash
from os import getenv, environ
import requests 
import psycopg2

from flask import Flask, Response
from flask import jsonify
from flask import request
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager

load_dotenv()

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = environ["API_SECRET_KEY"]
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=30)
jwt = JWTManager(app)

DB_URL = getenv("DATABASE_URL")
connection = psycopg2.connect(DB_URL)

PIPELINE_URL = getenv("PIPELINE_SERVICE_URL")

@app.route("/login", methods=["POST"])
def login():
    # Já checa content type
    data = request.get_json()
    email_input = data.get("email")
    password_input = data.get("password")

    if not email_input or not password_input:
        return jsonify({"msg": "Credenciais ausentes"}), 400

    with connection.cursor() as cur:
        query = "SELECT id, email, password_hash FROM auth.users WHERE email = %s"
        cur.execute(query, (email_input,))
        record = cur.fetchone()
        
        if not record:
            # Pode ser genérico também
            return jsonify({"msg": "Email não existe"}), 401

        id_db, email_db, password_hash_db = record 
        
        if not check_password_hash(password_hash_db, password_input):
            return jsonify({"msg": "Senha incorreta"}), 401    
        
        access_token = create_access_token(identity=str(id_db))
          
    return jsonify(access_token=access_token), 200

# É possível configurar fallbacks para problemas do token (faltante, não verificável, mal formado etc)            
@app.route("/sync", methods=["GET"])
@jwt_required()
def sync():
    r = requests.post(PIPELINE_URL, timeout=10)
    return Response(
        r.text,
        status=r.status_code,
        content_type=r.headers['Content-Type'],
    )


if __name__ == "__main__":
    app.run()
    
    