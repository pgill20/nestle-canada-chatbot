#!/bin/bash

# Azure Deployment Script for Nestlé Chatbot
# Run this script to deploy your chatbot to Azure App Service

set -e  # Exit on any error

# Configuration variables
RESOURCE_GROUP="nestle-chatbot-rg"
APP_SERVICE_PLAN="nestle-chatbot-plan"
WEB_APP_NAME="nestle-chatbot-app"
LOCATION="East US"
PYTHON_VERSION="3.9"
SKU="B1"  # Basic plan

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Azure CLI is installed
check_azure_cli() {
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first:"
        print_error "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI is installed"
}

# Function to check if user is logged in to Azure
check_azure_login() {
    if ! az account show &> /dev/null; then
        print_warning "You are not logged in to Azure. Logging in..."
        az login
    fi
    
    ACCOUNT_NAME=$(az account show --query name -o tsv)
    print_success "Logged in to Azure account: $ACCOUNT_NAME"
}

# Function to create resource group
create_resource_group() {
    print_status "Creating resource group: $RESOURCE_GROUP"
    
    if az group show --name $RESOURCE_GROUP &> /dev/null; then
        print_warning "Resource group $RESOURCE_GROUP already exists"
    else
        az group create --name $RESOURCE_GROUP --location "$LOCATION"
        print_success "Resource group created: $RESOURCE_GROUP"
    fi
}

# Function to create app service plan
create_app_service_plan() {
    print_status "Creating App Service plan: $APP_SERVICE_PLAN"
    
    if az appservice plan show --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP &> /dev/null; then
        print_warning "App Service plan $APP_SERVICE_PLAN already exists"
    else
        az appservice plan create \
            --name $APP_SERVICE_PLAN \
            --resource-group $RESOURCE_GROUP \
            --sku $SKU \
            --is-linux
        print_success "App Service plan created: $APP_SERVICE_PLAN"
    fi
}

# Function to create web app
create_web_app() {
    print_status "Creating Web App: $WEB_APP_NAME"
    
    if az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        print_warning "Web App $WEB_APP_NAME already exists"
    else
        az webapp create \
            --resource-group $RESOURCE_GROUP \
            --plan $APP_SERVICE_PLAN \
            --name $WEB_APP_NAME \
            --runtime "PYTHON|$PYTHON_VERSION"
        print_success "Web App created: $WEB_APP_NAME"
    fi
}

# Function to configure web app settings
configure_web_app() {
    print_status "Configuring Web App settings..."
    
    # Set startup file
    az webapp config set \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME \
        --startup-file "startup.sh"
    
    # Set Python version
    az webapp config set \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME \
        --linux-fx-version "PYTHON|$PYTHON_VERSION"
    
    print_success "Web App configured"
}

# Function to set application settings
set_app_settings() {
    print_status "Setting application settings..."
    
    # Prompt for OpenAI API key if not set as environment variable
    if [ -z "$OPENAI_API_KEY" ]; then
        print_warning "OPENAI_API_KEY environment variable not set"
        read -p "Enter your OpenAI API key: " OPENAI_API_KEY
    fi
    
    # Generate a random secret key
    SECRET_KEY=$(openssl rand -base64 32)
    
    # Set application settings
    az webapp config appsettings set \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME \
        --settings \
            OPENAI_API_KEY="$OPENAI_API_KEY" \
            FLASK_ENV="production" \
            FLASK_DEBUG="False" \
            SECRET_KEY="$SECRET_KEY" \
            PORT="8000"
    
    print_success "Application settings configured"
}

# Function to enable logging
enable_logging() {
    print_status "Enabling application logging..."
    
    az webapp log config \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME \
        --application-logging true \
        --level information \
        --detailed-error-messages true \
        --failed-request-tracing true
    
    print_success "Logging enabled"
}

# Function to deploy code
deploy_code() {
    print_status "Deploying code to Azure..."
    
    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        print_error "Not in a git repository. Please initialize git and commit your code first."
        exit 1
    fi
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes. Please commit them first."
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Configure deployment source
    az webapp deployment source config-local-git \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME
    
    # Get deployment URL
    DEPLOYMENT_URL=$(az webapp deployment list-publishing-credentials \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME \
        --query scmUri -o tsv)
    
    # Add Azure remote if it doesn't exist
    if ! git remote get-url azure &> /dev/null; then
        git remote add azure $DEPLOYMENT_URL
        print_success "Added Azure remote"
    fi
    
    # Deploy to Azure
    print_status "Pushing code to Azure..."
    git push azure main
    
    print_success "Code deployed successfully"
}

# Function to get app URL
get_app_url() {
    APP_URL=$(az webapp show \
        --resource-group $RESOURCE_GROUP \
        --name $WEB_APP_NAME \
        --query defaultHostName -o tsv)
    
    print_success "Your chatbot is deployed at: https://$APP_URL"
}

# Function to show deployment summary
show_summary() {
    echo ""
    echo "=================================================="
    print_success "DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "=================================================="
    echo ""
    echo "Resource Group: $RESOURCE_GROUP"
    echo "App Service Plan: $APP_SERVICE_PLAN"
    echo "Web App Name: $WEB_APP_NAME"
    echo "Location: $LOCATION"
    echo ""
    get_app_url
    echo ""
    echo "To view logs:"
    echo "az webapp log tail --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME"
    echo ""
    echo "To open in browser:"
    echo "az webapp browse --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME"
    echo ""
}

# Main deployment process
main() {
    echo "=================================================="
    echo "Nestlé Chatbot - Azure Deployment Script"
    echo "=================================================="
    echo ""
    
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_azure_cli
    check_azure_login
    
    # Create Azure resources
    create_resource_group
    create_app_service_plan
    create_web_app
    configure_web_app
    set_app_settings
    enable_logging
    
    # Deploy code
    deploy_code
    
    # Show summary
    show_summary
}

# Run main function
main "$@"