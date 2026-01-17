CREATE SCHEMA IF NOT EXISTS raw_data;
CREATE SCHEMA IF NOT EXISTS aggregated;

CREATE TABLE IF NOT EXISTS raw_data.transactions (
    order_id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP,
    status VARCHAR(20),
    value NUMERIC(10,2),
    payment_method VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS aggregated.daily_metrics (
    date DATE PRIMARY KEY,
    total_revenue_approved NUMERIC (15,2) DEFAULT 0,
    total_revenue_pending NUMERIC (15,2) DEFAULT 0,
    total_revenue_cancelled NUMERIC (15,2) DEFAULT 0,
    count_approved INT DEFAULT 0,
    count_pending INT DEFAULT 0,
    count_cancelled INT DEFAULT 0
);

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CHAMADO PELO runPipeline() do pipeline_service
CREATE OR REPLACE PROCEDURE refresh_dashboard_metrics()
LANGUAGE plpgsql
AS $$
BEGIN
    TRUNCATE TABLE aggregated.daily_metrics; -- Garante idepotencia no procedimento

    INSERT INTO aggregated.daily_metrics (
        date,
        total_revenue_approved,
        total_revenue_pending,
        total_revenue_cancelled,
        count_approved,
        count_pending,
        count_cancelled
    )
    SELECT
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'pending' THEN value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN value ELSE 0 END), 0),
        COUNT(CASE WHEN status = 'approved' THEN 1 END),
        COUNT(CASE WHEN status = 'pending' THEN 1 END),
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)
    FROM raw_data.transactions
    GROUP BY DATE(created_at);
END;
$$;