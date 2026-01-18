# Solomon - Analytics Dashboard

Aplicação Fullstack de Analytics projetada para ingerir, processar e visualizar métricas financeiras de transações.

Feito numa arquitetura de **Microsserviços** containerizada, separando responsabilidades entre autenticação, processamento de dados (ETL) e delivery para apresentação, e leitura de otimizada.

---

## 🏗 Arquitetura & Tech Stack

A solução foi desenhada para garantir **desacoplamento** e **escalabilidade**.

| Serviço | Tech Stack | Responsabilidade | Porta (Host) |
| :--- | :--- | :--- | :--- |
| **Frontend** | React (Vite) + Nginx | Dashboard Interativo e Visualização de Dados | `3000` |
| **Auth Service** | Python (Flask) | Autenticação (JWT) e orquestração de sincronização | `5000` |
| **Query Service** | Go (Golang) | API de Leitura de alta performance (Métricas) | `8082` |
| **Pipeline ETL** | Go (Golang) | Extração, Transformação e Carga (Batch Processing) | `8081` |
| **Database** | PostgreSQL 15 | Persistência Relacional dos Dados | `5432` |
| **Source Mock** | Python | Simulação de API Bancária Externa | `8000` |

### 🔄 Fluxo de Dados
1.  **Ingestão:** O **Pipeline (Go)** consome dados brutos do *Source Server*.
2.  **Processamento:** Os dados são sanitizados e agregados no **PostgreSQL**.
3.  **Leitura:** O **Query Service (Go)** serve dados agregados para o Frontend com latência mínima.
4.  **Visualização:** O **Frontend (React)** consome as APIs via Axios (com Interceptors JWT).

---

## 🚀 Como Executar

O projeto é 100% containerizado. Você só precisa do **Docker** e **Docker Compose**.

### Pré-requisitos
* Docker Engine (20.10+)
* Docker Compose

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone <repo-url>
    cd project-solomon
    ```

2.  **Crie o arquivo de variáveis de ambiente (.env):**
    Na raiz do projeto, crie um arquivo `.env` com o seguinte conteúdo:
    ```env
    POSTGRES_USER=admin
    POSTGRES_PASSWORD=password123
    POSTGRES_DB=solomon_analytics
    
    # Internal Docker Network URLs
    DATABASE_URL=postgres://admin:password123@postgres:5432/solomon_analytics?sslmode=disable
    API_SECRET_KEY=6a2a81de280077080507cf64681ded9e
    
    PIPELINE_SERVICE_URL=http://pipeline:8081/run
    SOURCE_API_URL=http://source-server:8000/transactions
    ```

3.  **Suba os containers:**
    ```bash
    docker-compose up -d --build
    ```

4.  **Acesse a Aplicação:**
    * **Dashboard:** [http://localhost:3000](http://localhost:3000)
    * **Credenciais de Acesso:**
        * **Email:** `admin@email.com`
        * **Senha:** `secret_password_123`

---

## 📚 Documentação da API

### 1. Auth Service (Python) - `http://localhost:5000`
* `POST /login`
    * **Body:** `{ "email": "admin@email.com", "password": "..." }`
    * **Retorno:** JWT Access Token.
* `POST /sync` (Protegido)
    * Dispara o Pipeline de ETL assincronamente.
    * **Header:** `Authorization: Bearer <token>`

### 2. Query Service (Go) - `http://localhost:8082`
* `GET /metrics` (Protegido)
    * Retorna dados agregados para gráficos.
    * **Params:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
    * **Header:** `Authorization: Bearer <token>`

---

## 📂 Estrutura do Projeto

```text
/
├── backend1/           # Python Flask (Auth & Manager)
├── backend2/           # Go (Query API - Read Only)
├── pipeline_service/   # Go (ETL Worker)
├── frontend/           # React + Vite + Material UI
├── source_server/      # Python (Mock Data Provider)
├── database/           # Scripts SQL de Inicialização
├── docker-compose.yml  # Orquestração
└── README.md