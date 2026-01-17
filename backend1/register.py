import os
from dotenv import load_dotenv
from flask_bcrypt import generate_password_hash
import psycopg2

load_dotenv()

ADMIN_EMAIL = "admin@email.com"
ADMIN_PASSWORD = "secret_password_123" 
DB_URL = os.getenv('DATABASE_URL')

connection = psycopg2.connect(DB_URL)

def create_admin():
    cur = connection.cursor()

    # Caso volume do banco já tenha gravado os dados, mantém idempotente
    cur.execute("SELECT 1 FROM auth.users WHERE email = %s", (ADMIN_EMAIL,))
    if cur.fetchone() is None:

        hashed_pw = generate_password_hash(ADMIN_PASSWORD).decode('utf-8')
        cur.execute(
            "INSERT INTO auth.users (email, password_hash) VALUES (%s, %s)",
            (ADMIN_EMAIL, hashed_pw)
        )
        connection.commit()
        print("Admin da aplicação criado")
    else:
        print("Admin já existe no banco")

    cur.close()
    connection.close()

if __name__ == "__main__":
    create_admin()