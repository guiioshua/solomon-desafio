package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
)

func sendJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func MetricsHandler(db *sql.DB, apiSecret []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			sendJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Método não permitido"})
		}
		authHeader := r.Header.Get("Authorization");
		if authHeader =="" {
			sendJSON(w, http.StatusUnauthorized, map[string]string{"error": "Header de autenticação ausente"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de assinatura inesperado: %v", token.Header["alg"])
			}
			return apiSecret, nil
		})
		if err != nil || !token.Valid {
			sendJSON(w, http.StatusUnauthorized, map[string]string{"error": "Token inválido ou expirado"})
			return
		}
		log.Println("Requisição de métricas autorizada.")
		
		

		sendJSON(w, http.StatusOK, map[string]string{"message": "Dados das métricas aqui"})
	}
}

func main() {
	apiSecret := []byte(os.Getenv("API_SECRET_KEY"))
    if len(apiSecret) == 0 {
        log.Fatal("API_SECRET_KEY não definida")
    }

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Variável de ambiente DATABASE_URL não encontrada")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Falha ao abrir conexão com o banco:", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("Não foi possível alcançar o banco de dados:", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/metrics", MetricsHandler(db, apiSecret))

	log.Println("Pipeline Service ouvindo na porta 8081...")
	log.Fatal(http.ListenAndServe(":8081", nil))
}