package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq" 
)

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

	http.HandleFunc("/run", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Método não permitido.", http.StatusMethodNotAllowed)
			return
		}

		log.Println("Iniciando processamento da pipeline...")

		sumario, err := runPipeline(db)
		if err != nil {
			log.Printf("Erro na pipeline: %v", err)
			http.Error(w, fmt.Sprintf("Falha na execução: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(sumario)
	})

	log.Println("Pipeline Service ouvindo na porta 8081...")
	log.Fatal(http.ListenAndServe(":8081", nil))
}