#!/usr/bin/env bash

# Configuration constants
SECRET_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "OAUTH_CLIENT_ID" "OAUTH_CLIENT_SECRET" "OAUTH_REDIRECT_URI" "NEXTAUTH_URL" "NEXT_PUBLIC_NEXTAUTH_URL" "AUTH_PROVIDER_URL" "NODE_ENV")
SECRET_IDS=("codex-database-url" "codex-nextauth-secret" "codex-oauth-client-id" "codex-oauth-client-secret" "codex-oauth-redirect-uri" "codex-nextauth-url" "codex-next-public-nextauth-url" "codex-auth-provider-url" "codex-node-env")

#####################################
# MAIN EXECUTION FUNCTION
#####################################

main() {
  set -euo pipefail
  
  # Get project root and file paths
  local project_root=$(get_project_root)
  local env_file="$project_root/.env.firebase"

  # Hardcoded Firebase config
  local project_id="f3-nation-auth"
  local backend_id="f3-nation-auth-provider"

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
  
  log_success "All done! Your App Hosting backend can now build & run with these secrets."
}

#####################################
# UTILITY FUNCTIONS (used by main)
#####################################

# Get the project root directory
get_project_root() {
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "$(dirname "$script_dir")"
}

# Print colored output
log_info() {
  echo "ℹ️  $1"
}

log_success() {
  echo "✅ $1"
}

log_warning() {
  echo "⚠️  $1"
}

log_error() {
  echo "❌ $1"
}

log_step() {
  echo "🔧 $1"
}

#####################################
# ENVIRONMENT VALIDATION FUNCTIONS (used by main)
#####################################

# Validate .env.firebase file exists
validate_env_file() {
  local env_file="$1"
  
  if [[ ! -f "$env_file" ]]; then
    log_error ".env.firebase file not found at $env_file"
    log_error "Please create this file with your environment variables."
    log_error "Required variables: DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_CLIENT_SECRET_*, etc."
    return 1
  fi
  
  log_success "Found .env.firebase file: $env_file"
}

# Load environment variables from .env.firebase
load_environment_variables() {
  local env_file="$1"
  
  log_step "Loading environment variables from .env.firebase..."
  
  # Read and process each line to trim whitespace and avoid sourcing issues
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    
    # Extract key=value, handling quotes and trimming whitespace
    if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      
      # Trim whitespace from key
      key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      
      # Remove surrounding quotes and trim whitespace from value
      value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
      
      # Export the cleaned variable
      export "$key"="$value"
      
      log_info "Loaded and cleaned: $key"
    fi
  done < "$env_file"
}

# Validate required environment variables
validate_environment_variables() {
  log_step "Validating required environment variables..."
  
  for i in "${!SECRET_VARS[@]}"; do
    local envvar="${SECRET_VARS[$i]}"
    local value="${!envvar:-}"
    
    if [[ -z "$value" ]]; then
      log_error "$envvar is not set in .env.firebase"
      log_error "Please add $envvar=your_value to your .env.firebase file"
      return 1
    fi
    
    # Check if variable contains placeholder values
    if [[ "$value" == *"YOUR_"* ]] || [[ "$value" == *"your-"* ]]; then
      log_warning "$envvar appears to contain placeholder values."
      log_error "Please update it with your actual value in .env.firebase"
      return 1
    fi
    
    # Check for problematic whitespace or newlines
    if [[ "$value" =~ ^[[:space:]] ]] || [[ "$value" =~ [[:space:]]$ ]]; then
      log_warning "$envvar has leading or trailing whitespace - this will be automatically trimmed"
    fi
    
    if [[ "$value" =~ $'\n' ]] || [[ "$value" =~ $'\r' ]]; then
      log_warning "$envvar contains newlines or carriage returns - these will be automatically removed"
    fi
    
    # Show cleaned value length for debugging
    local cleaned_value=$(echo "$value" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    log_success "Found: $envvar (${#cleaned_value} chars after cleaning)"
  done
}

#####################################
# SECRET MANAGEMENT FUNCTIONS (used by main)
#####################################

# Create temporary files for secrets
create_temp_secret_files() {
  local temp_dir="$1"
  
  log_step "Creating temporary secret files..."
  
  for i in "${!SECRET_VARS[@]}"; do
    local envvar="${SECRET_VARS[$i]}"
    local secret_id="${SECRET_IDS[$i]}"
    local temp_file="$temp_dir/$secret_id.txt"
    
    # Get the environment variable value and clean it
    local value="${!envvar}"
    
    # Trim leading/trailing whitespace and remove any newlines
    value=$(echo "$value" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Write the cleaned value to temporary file using printf to avoid adding newlines
    printf '%s' "$value" > "$temp_file"
    
    # Validate the file doesn't contain unwanted characters
    if [[ $(wc -l < "$temp_file") -gt 0 ]]; then
      log_warning "Secret '$secret_id' may contain newlines - this could cause issues"
    fi
    
    log_info "Created temporary file: $temp_file (length: ${#value} chars)"
  done
}

# Create or update secrets in Google Cloud Secret Manager
create_or_update_secrets() {
  local project_id="$1"
  local temp_dir="$2"
  
  log_step "Creating or updating secrets in Google Cloud Secret Manager..."
  
  for i in "${!SECRET_VARS[@]}"; do
    local secret_id="${SECRET_IDS[$i]}"
    local temp_file="$temp_dir/$secret_id.txt"
    
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
  done
}

# Grant IAM permissions to Firebase service account
grant_iam_permissions() {
  local project_id="$1"
  
  log_step "Granting IAM permissions to Firebase service account..."
  
  # Get the project number to construct the service account
  local project_number=$(gcloud projects describe "$project_id" --format='value(projectNumber)')
  local service_account="service-$project_number@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"
  
  for i in "${!SECRET_VARS[@]}"; do
    local secret_id="${SECRET_IDS[$i]}"
    log_info "Granting roles/secretmanager.secretAccessor on '$secret_id' to Firebase service account…"
    gcloud secrets add-iam-policy-binding "$secret_id" \
      --member="serviceAccount:$service_account" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$project_id" \
      --quiet
  done
}

# Grant Firebase App Hosting access to secrets
grant_firebase_access() {
  local backend_id="$1"
  
  log_step "Granting Firebase App Hosting access to secrets..."
  
  for i in "${!SECRET_VARS[@]}"; do
    local secret_id="${SECRET_IDS[$i]}"
    log_info "Granting Firebase App Hosting access to '$secret_id' on backend '$backend_id'…"
    firebase apphosting:secrets:grantaccess "$secret_id" \
      --backend "$backend_id" \
      --project "$project_id" \
      --non-interactive
  done
}

#####################################
# CLEANUP FUNCTIONS (used by main)
#####################################

# Clean up temporary files
cleanup_temp_files() {
  local temp_dir="$1"
  
  log_step "Cleaning up temporary files..."
  rm -rf "$temp_dir"
}

#####################################
# SCRIPT EXECUTION
#####################################

# Run main function
main
