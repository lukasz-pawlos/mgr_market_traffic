#!/bin/bash

# Sprawdzenie, czy przekazano prawidłową liczbę parametrów
if [ "$#" -ne 6 ]; then
    echo "Użycie: $0 <number_of_containers> <number_of_companies_per_container> <number_of_cache_elem_per_company> <cache_time_in_sec> <number_of_users_for_traffic> <traffic_time_request>"
    exit 1
fi

NUM_CONTAINERS=$1
NUM_COMPANIES_PER_CONTAINER=$2
NUM_USERS=$3
NUM_OF_CACHE=$4
CACHE_TIME=$5
TRAFFIC_TIME_REQUEST=$6

# Oblicz całkowitą liczbę firm
NUM_COMPANIES=$(( NUM_CONTAINERS * NUM_COMPANIES_PER_CONTAINER ))

# Generowanie nagłówka dla docker-compose.yml
cat <<EOL > docker-compose.generated.yml
version: "3.8"

services:
  database:
    image: postgres:13
    environment:
      POSTGRES_DB: "gielda"
      POSTGRES_USER: "postgres"
      POSTGRES_PASSWORD: "Password"
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d gielda"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - gielda_network

  logdatabase:
    image: postgres:13
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: Password
      POSTGRES_DB: gielda
    ports:
      - "5433:5432"
    volumes:
      - log_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - gielda_network

  market_service:
    build:
      context: ./gielda
      dockerfile: Dockerfile.gielda
    depends_on:
      database:
        condition: service_healthy
      logdatabase:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      DB_TYPE: "postgres"
      DB_HOST: database
      DB_PORT: 5432
      DB_USERNAME: "postgres"
      DB_PASSWORD: "Password"
      DB_NAME: "gielda"
      DB_HOST2: logdatabase
      DB_PORT2: 5432
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/user/allusers || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - gielda_network
EOL

# Generowanie kontenerów trade_service
for (( i=1; i<=NUM_CONTAINERS; i++ ))
do
  OFFSET=$(( (i-1) * NUM_COMPANIES_PER_CONTAINER + 1 ))
  COMPANIES_IDS=$(seq -s, $OFFSET $((OFFSET + NUM_COMPANIES_PER_CONTAINER - 1)))

  cat <<EOL >> docker-compose.generated.yml

  trade_service_$i:
    build:
      context: ./gielda
      dockerfile: Dockerfile.trade
    depends_on:
      market_service:
        condition: service_healthy
    environment:
      TRADE_ID: $i
      DB_TYPE: "postgres"
      DB_HOST: database
      DB_PORT: 5432
      DB_USERNAME: "postgres"
      DB_PASSWORD: "Password"
      DB_NAME: "gielda"
      DB_HOST2: logdatabase
      DB_PORT2: 5432
      COMPANIES_IDS: "$COMPANIES_IDS"
      NUM_OF_CACHE:  $NUM_OF_CACHE
      CACHE_TIME: $CACHE_TIME
      TRANSACTION_TIME: $TRANSACTION_TIME
    networks:
      - gielda_network
EOL
done

# Generowanie kontenera traffic_service
cat <<EOL >> docker-compose.generated.yml

  traffic_service:
    build:
      context: ./traffic
      dockerfile: Dockerfile.traffic
    depends_on:
      market_service:
        condition: service_healthy
    environment:
      NUM_USERS: $NUM_USERS
      TRAFFIC_TIME_REQUEST: $TRAFFIC_TIME_REQUEST
      NUM_COMPANIES: "$NUM_COMPANIES"
      DB_TYPE: "postgres"
      DB_HOST: database
      DB_USERNAME: "postgres"
      DB_PASSWORD: "Password"
      DB_NAME: "gielda"
      DB_HOST2: logdatabase
      DB_PORT2: 5432
    ports:
      - "3001:3001"
    networks:
      - gielda_network
EOL

# Dodanie definicji wolumenów
cat <<EOL >> docker-compose.generated.yml


volumes:
  db_data:
  log_db_data:

networks:
  gielda_network:
    driver: bridge
EOL

echo "Plik docker-compose.generated.yml został wygenerowany."

# Uruchomienie kontenerów za pomocą docker-compose
docker-compose -f docker-compose.generated.yml up -d

# Sprawdzenie, czy kontenery zostały poprawnie uruchomione
if [ $? -eq 0 ]; then
    echo "Kontenery zostały pomyślnie uruchomione."
else
    echo "Wystąpił błąd podczas uruchamiania kontenerów."
fi
