#!/usr/bin/env bash

# Configuration for DATABASE_URL only
SECRET_VARS=("DATABASE_URL")
SECRET_IDS=("client-database-url")

#####################################
# MAIN EXECUTION FUNCTION
#####################################

main() {
  set -euo pipefail
  
  # Get project root and file paths
  local project_root=$(get_project_root)
  local env_file="$project_root/.env.firebase"

  # Hardcoded Firebase config
  local project_id="f3-the-codex"
  local backend_id="the-codex"

  log_info "Using project ID: $project_id"
  log_info "Using backend ID: $backend_id"
  
  # Set GCP project
  log_step "Setting GCP project to '$project_id'..."
  gcloud config set project "$project_id" --quiet >/dev/null
  
  # Validate and load environment
  validate_env_file "$env_file" || exit 1
  load_environment_variables "$env_file"
  validate_environment_variables || exit 1
  
  # Create temporary directory
  local temp_dir=$(mktemp -d)
  
  # Create secrets
  create_temp_secret_files "$temp_dir"
  create_or_update_secrets "$project_id" "$temp_dir"
  grant_iam_permissions "$project_id"
  grant_firebase_access "$backend_id"
  
  # Cleanup
  cleanup_temp_files "$temp_dir"
  
  log_success "DATABASE_URL secret is now available for your Firebase App Hosting backend!"
}

#####################################
# UTILITY FUNCTIONS
#####################################

get_project_root() {
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "$script_dir"  # Look in the same directory as the script
}


log_info() { echo "ℹ️  $1"; }
log_success() { echo "✅ $1"; }
log_warning() { echo "⚠️  $1"; }
log_error() { echo "❌ $1"; }
log_step() { echo "🔧 $1"; }

#####################################
# ENVIRONMENT VALIDATION FUNCTIONS
#####################################

validate_env_file() {
  local env_file="$1"
  
  if [[ ! -f "$env_file" ]]; then
    log_error ".env.firebase file not found at $env_file"
    log_error "Please create this file with: DATABASE_URL=your_database_url"
    return 1
  fi
  
  log_success "Found .env.firebase file: $env_file"
}

load_environment_variables() {
  local env_file="$1"
  
  log_step "Loading environment variables from .env.firebase..."
  
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    
    if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      
      key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
      
      export "$key"="$value"
      log_info "Loaded: $key"
    fi
  done < "$env_file"
}

validate_environment_variables() {
  log_step "Validating DATABASE_URL..."
  
  local value="${DATABASE_URL:-}"
  
  if [[ -z "$value" ]]; then
    log_error "DATABASE_URL is not set in .env.firebase"
    log_error "Please add DATABASE_URL=your_database_url to your .env.firebase file"
    return 1
  fi
  
  if [[ "$value" == *"YOUR_"* ]] || [[ "$value" == *"your-"* ]]; then
    log_error "DATABASE_URL appears to contain placeholder values."
    return 1
  fi
  
  local cleaned_value=$(echo "$value" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  log_success "Found: DATABASE_URL (${#cleaned_value} chars after cleaning)"
}

#####################################
# SECRET MANAGEMENT FUNCTIONS
#####################################

create_temp_secret_files() {
  local temp_dir="$1"
  local temp_file="$temp_dir/client-database-url.txt"
  
  log_step "Creating temporary secret file for DATABASE_URL..."
  
  local value=$(echo "$DATABASE_URL" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  printf '%s' "$value" > "$temp_file"
  
  log_info "Created temporary file: $temp_file (length: ${#value} chars)"
}

create_or_update_secrets() {
  local project_id="$1"
  local temp_dir="$2"
  local secret_id="client-database-url"
  local temp_file="$temp_dir/$secret_id.txt"
  
  log_step "Creating or updating DATABASE_URL secret in Google Cloud Secret Manager..."
  
  if gcloud secrets describe "$secret_id" --project="$project_id" --quiet &>/dev/null; then
    log_info "Secret '$secret_id' exists, adding new version…"
    gcloud secrets versions add "$secret_id" \
      --data-file="$temp_file" \
      --project="$project_id" \
      --quiet
  else
    log_info "Creating secret '$secret_id'…"
    gcloud secrets create "$secret_id" \
      --data-file="$temp_file" \
      --project="$project_id" \
      --quiet
  fi
}

grant_iam_permissions() {
  local project_id="$1"
  local secret_id="client-database-url"
  
  log_step "Granting IAM permissions to Firebase service account..."
  
  local project_number=$(gcloud projects describe "$project_id" --format='value(projectNumber)')
  local service_account="service-$project_number@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"
  
  log_info "Granting roles/secretmanager.secretAccessor on '$secret_id' to Firebase service account…"
  gcloud secrets add-iam-policy-binding "$secret_id" \
    --member="serviceAccount:$service_account" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$project_id" \
    --quiet
}

grant_firebase_access() {
  local backend_id="$1"
  local secret_id="client-database-url"
  
  log_step "Granting Firebase App Hosting access to DATABASE_URL secret..."
  
  log_info "Granting Firebase App Hosting access to '$secret_id' on backend '$backend_id'…"
  firebase apphosting:secrets:grantaccess "$secret_id" \
    --backend "$backend_id" \
    --project "$project_id" \
    --non-interactive
}

cleanup_temp_files() {
  local temp_dir="$1"
  log_step "Cleaning up temporary files..."
  rm -rf "$temp_dir"
}

# Run main function
main
