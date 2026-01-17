package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
)

// Para padronizar respostas sempre em JSON 
func sendJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func PipelineHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			sendJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Método não permitido"})
			return
		}

		log.Println("Iniciando processamento da pipeline...")

		sumario, err := runPipeline(db)
		if err != nil {
			log.Printf("Erro na pipeline: %v", err)
			sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		sendJSON(w, http.StatusOK, sumario)
	}
}

func main() {
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

	// Precisa instanciar um gerenciador de roteamento
	mux := http.NewServeMux()
	mux.HandleFunc("/run", PipelineHandler(db)) // Chama função que injeta dependência no handler pra abrir conexões

	log.Println("Pipeline Service ouvindo na porta 8081...")
	if err := http.ListenAndServe(":8081", mux); err != nil {
		log.Fatal(err)
	}
}