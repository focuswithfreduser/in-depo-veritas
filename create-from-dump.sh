#!/bin/bash

# Function to print usage
print_usage() {
    echo "Usage: $0 [--overwrite] <new_database_name> <path_to_dump_file>"
    echo "  --overwrite: If specified, drop the existing database before creating a new one"
}

# Initialize variables
OVERWRITE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --overwrite)
            OVERWRITE=true
            shift
            ;;
        *)
            if [ -z "$NEW_DB_NAME" ]; then
                NEW_DB_NAME=$1
            elif [ -z "$DUMP_FILE_PATH" ]; then
                DUMP_FILE_PATH=$1
            else
                echo "Error: Too many arguments"
                print_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$NEW_DB_NAME" ] || [ -z "$DUMP_FILE_PATH" ]; then
    echo "Error: Missing required arguments"
    print_usage
    exit 1
fi

# Check if the dump file exists
if [ ! -f "$DUMP_FILE_PATH" ]; then
    echo "Error: Dump file does not exist at $DUMP_FILE_PATH"
    exit 1
fi

# Drop the existing database if --overwrite is specified
if [ "$OVERWRITE" = true ]; then
    echo "Dropping existing database: $NEW_DB_NAME (if it exists)"
    dropdb "$NEW_DB_NAME"
fi

# Create the new database
echo "Creating new database: $NEW_DB_NAME"
createdb "$NEW_DB_NAME"

if [ $? -ne 0 ]; then
    echo "Error: Failed to create database $NEW_DB_NAME"
    exit 1
fi

# Determine if the file is a text dump or not
if grep -q "COPY" "$DUMP_FILE_PATH"; then
    echo "Detected text format dump. Using psql to restore."
    psql -d "$NEW_DB_NAME" -f "$DUMP_FILE_PATH"
else
    echo "Attempting to restore with pg_restore."
    pg_restore -d "$NEW_DB_NAME" "$DUMP_FILE_PATH"
fi

if [ $? -ne 0 ]; then
    echo "Error: Failed to restore dump into $NEW_DB_NAME"
    exit 1
else
    echo "Restore completed successfully"
fi