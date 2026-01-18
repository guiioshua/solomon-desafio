package main

import (
	"database/sql"
	"fmt"
)

type DailyMetric struct {
	Date                  string  `json:"date"`
	TotalRevenueApproved  float64 `json:"total_revenue_approved"`
	TotalRevenuePending   float64 `json:"total_revenue_pending"`
	TotalRevenueCancelled float64 `json:"total_revenue_cancelled"`
	CountApproved         int     `json:"count_approved"`
	CountPending          int     `json:"count_pending"`
	CountCancelled        int     `json:"count_cancelled"`
}

// Tudo injetado durante o handler em main
func GetDailyMetrics(db *sql.DB, startDate, endDate string) ([]DailyMetric, error) {
	baseQuery := `
		SELECT 
			date::text, 
			total_revenue_approved, total_revenue_pending, total_revenue_cancelled,
			count_approved, count_pending, count_cancelled
		FROM aggregated.daily_metrics
		WHERE 1=1
	`
	
	// Speração entre o valor da data e a posição pra inserção dinamica na query
	var args []any
	var conditions []string
	argCounter := 1

	if startDate != "" {
		conditions = append(conditions, fmt.Sprintf("date >= $%d", argCounter))
		args = append(args, startDate)
		argCounter++
	}
	if endDate != "" {
		conditions = append(conditions, fmt.Sprintf("date <= $%d", argCounter))
		args = append(args, endDate)
		argCounter++
	}

	finalQuery := baseQuery
	for _, cond := range conditions {
		finalQuery += " AND " + cond
	}
	finalQuery += " ORDER BY date ASC"

	rows, err := db.Query(finalQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []DailyMetric
	for rows.Next() {
		var m DailyMetric
		err := rows.Scan(
			&m.Date,
			&m.TotalRevenueApproved, &m.TotalRevenuePending, &m.TotalRevenueCancelled,
			&m.CountApproved, &m.CountPending, &m.CountCancelled,
		)
		if err != nil {
			return nil, err
		}
		metrics = append(metrics, m)
	}

	return metrics, nil
}