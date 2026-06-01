#!/bin/bash

# Default values for the options and PostgreSQL settings
install=false
docker=true
run=false
postgres_user="user"
postgres_password="pass"
postgres_port="5432"
db_name="indepoveritas"

# Parse command-line options
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --install) install=true ;;
        --docker=false) docker=false ;;
        --run) run=true ;;
        --user=*) postgres_user="${1#*=}" ;;
        --password=*) postgres_password="${1#*=}" ;;
        --port=*) postgres_port="${1#*=}" ;;
        --dbname=*) db_name="${1#*=}" ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Construct DATABASE_URL
database_url="postgresql://${postgres_user}:${postgres_password}@localhost:${postgres_port}/${db_name}?schema=public"

if [ ! -f ".env" ]; then
    echo ".env file not found, copying from .env.example"
    cp .env.example .env
fi

# Update POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING in .env
update_env_variable() {
    local var_name=$1
    local var_value=$2

    if grep -q "${var_name}" .env; then
        echo "Updating ${var_name} in .env"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|${var_name}=.*|${var_name}=\"${var_value}\"|" .env
        else
            sed -i "s|${var_name}=.*|${var_name}=\"${var_value}\"|" .env
        fi
    else
        echo "Appending ${var_name} to .env"
        echo "${var_name}=\"${var_value}\"" >> .env
    fi
}

update_env_variable "POSTGRES_PRISMA_URL" "${database_url}"
update_env_variable "POSTGRES_URL_NON_POOLING" "${database_url}"

# Rest of the script remains the same

if [ "$install" = true ] ; then
    echo "Running npm install"
    npm install
fi

if [ "$docker" = true ] ; then
    echo "Starting Docker PostgreSQL container with user: $postgres_user, password: $postgres_password, and port: $postgres_port"
    docker run --name postgres-indepoveritas -d -p "${postgres_port}:5432" -e POSTGRES_USER="${postgres_user}" -e POSTGRES_PASSWORD="${postgres_password}" postgres:alpine
    
    echo "Waiting for PostgreSQL to start..."
    # Wait for PostgreSQL to start
    while ! pg_isready -h localhost -p "${postgres_port}" -U "${postgres_user}" > /dev/null 2>&1; do
        echo "PostgreSQL is not ready yet. Waiting..."
        sleep 1
    done
    echo "PostgreSQL is ready!"
fi

echo "Running migrations"
npm run migrate

if [ "$run" = true ] ; then
    echo "Running npm run dev"
    npm run dev
fi
