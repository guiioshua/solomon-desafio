package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq" // Postgres Driver
)

type Transaction struct {
	OrderID       string  `json:"order_id"`
	CreatedAt     string  `json:"created_at"`
	Status        string  `json:"status"`
	Value         float64 `json:"value"`
	PaymentMethod string  `json:"payment_method"`
}

func main() {
	// Setup conexão com postgresql
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Variável de ambiente DATABASE_URL não achada")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Falha ao tentar abrir conexão com banco:", err)
	}
	defer db.Close()
	// Teste de conexão com banco
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping DB:", err)
	}

	// Definição de endpoint, validação básica etc
	http.HandleFunc("/run", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Método não permitido", http.StatusMethodNotAllowed)
			return
		}
		log.Println("Pipeline iniciada")
				
		// Chama método que interage com postgresql
		if err := runPipeline(db); err != nil {
			http.Error(w, fmt.Sprintf("Erro durante a pipeline de interação com o banco: %v", err), 500)
			return
		}


		w.WriteHeader(http.StatusOK)

		w.Write([]byte("Pipeline inicializada"))
	})
	log.Println("Pipeline Service listening on port 8081...")
	log.Fatal(http.ListenAndServe(":8081", nil))
}

// 
func runPipeline(db *sql.DB) error {
	// Request para servidor com dados de origem
	sourceURL := os.Getenv("SOURCE_API_URL")
	resp, err := http.Get(sourceURL)
	if err != nil {
		return fmt.Errorf("Falha ao tentar obter dados do servidor: %v", err)
	}
	defer resp.Body.Close()

	// Decodifica bytes da resposta em JSON e serializa para schema de registro de transaction
	var transactions []Transaction
	if err := json.NewDecoder(resp.Body).Decode(&transactions); err != nil {
		return fmt.Errorf("failed to decode JSON: %v", err)
	}

	log.Printf("Obtido %d transactions do servidor de origem de dados", len(transactions))

	// Transação de inserção no postgresql
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	statement, err := tx.Prepare(`
		INSERT INTO raw_data.transactions (order_id, created_at, status, value, payment_method)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (order_id) DO UPDATE 
		SET status = EXCLUDED.status, value = EXCLUDED.value; -- Para garantir idepotência na inserção de dados
	`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer statement.Close()

	// Inserção de dados brutos
	for _, transact := range transactions {
		_, err := statement.Exec(transact.OrderID, transact.CreatedAt, transact.Status, transact.Value, transact.PaymentMethod)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert order %s: %v", transact.OrderID, err)
		}
	}

	// Agregação dos dados inseridos na tabela de dados transformados
	log.Println("Iniciando redução dos dados...")
	_, err = tx.Exec("CALL refresh_dashboard_metrics();")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("Falha na transformação dos dados: %v", err)
	}

	return tx.Commit()
}