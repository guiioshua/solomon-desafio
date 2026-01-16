package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// Schema dos dados brutos, source_server
type Transaction struct {
	OrderID       string  `json:"order_id"`
	CreatedAt     string  `json:"created_at"`
	Status        string  `json:"status"`
	Value         float64 `json:"value"`
	PaymentMethod string  `json:"payment_method"`
}
// Metadados da execução da pipeline pra quem chamar
type PipelineOutput struct {
	Status            string `json:"status"`
	RecordsSynced     int    `json:"records_synced"`
	LastProcessedDate string `json:"last_processed_date"`
	Message           string `json:"message"`
}

func runPipeline(db *sql.DB) (*PipelineOutput, error) {
	sourceURL := os.Getenv("SOURCE_API_URL")
	resp, err := http.Get(sourceURL)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar na API de origem de dados: %v", err)
	}
	defer resp.Body.Close()

	var transactions []Transaction
	if err := json.NewDecoder(resp.Body).Decode(&transactions); err != nil {
		return nil, fmt.Errorf("erro ao decodificar JSON da origem: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	statement, err := tx.Prepare(`
		INSERT INTO raw_data.transactions (order_id, created_at, status, value, payment_method)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (order_id) DO UPDATE 
		SET status = EXCLUDED.status, value = EXCLUDED.value;
	`)
	if err != nil {
		return nil, err
	}
	defer statement.Close()

	for _, t := range transactions {
		if _, err := statement.Exec(t.OrderID, t.CreatedAt, t.Status, t.Value, t.PaymentMethod); err != nil {
			return nil, fmt.Errorf("erro ao inserir transação %s: %v", t.OrderID, err)
		}
	}

	_, err = tx.Exec("CALL refresh_dashboard_metrics();")
	if err != nil {
		return nil, fmt.Errorf("erro ao processar dados para tabela daily_metrics: %v", err)
	}

	var lastDate string
	err = tx.QueryRow("SELECT MAX(date)::text FROM aggregated.daily_metrics").Scan(&lastDate)
	if err != nil {
		lastDate = "N/A"
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	log.Printf("Pipeline finalizada com sucesso. %d registros processados.", len(transactions))

	return &PipelineOutput{
		Status:            "success",
		RecordsSynced:     len(transactions),
		LastProcessedDate: lastDate,
		Message:           "Dados brutos sincronizados e processados com sucesso.",
	}, nil
}