terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  backend "remote" {
    # Configure your remote backend (Terraform Cloud or S3) here
    # For now, local state is default but typically we use S3 for teams
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# 1. KV Namespace (Agent Registry)
resource "cloudflare_workers_kv_namespace" "agent_registry" {
  account_id = var.account_id
  title      = "edgeneuro-agent-registry"
}

# 2. Worker Script (SynapseCore)
# Note: We usually deploy code via Wrangler, but we can manage the script resource here
# for strict IaC control. For this hybrid setup, we let Wrangler handle code
# and Terraform handle resources.

output "kv_namespace_id" {
  value = cloudflare_workers_kv_namespace.agent_registry.id
}
