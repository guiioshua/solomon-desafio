package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
)

func sendJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func MetricsHandler(db *sql.DB, apiSecret []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Evitar problemas com CORS no frontend
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodGet {
			sendJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Método não permitido"})
			return
		}

		// Chama de auth
		_, err := ValidateToken(r, apiSecret)
		if err != nil {
			sendJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
			return
		}

		// DATA QUERY
		startDate := r.URL.Query().Get("start_date")
		endDate := r.URL.Query().Get("end_date")
		paymentMethod := r.URL.Query().Get("payment_method")
		metrics, err := GetDailyMetrics(db, startDate, endDate, paymentMethod)
		if err != nil {
			log.Printf("Erro na query ao banco: %v", err)
			sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Erro ao buscar dados"})
			return
		}

		sendJSON(w, http.StatusOK, metrics)
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
	log.Fatal(http.ListenAndServe(":8082", mux))
}