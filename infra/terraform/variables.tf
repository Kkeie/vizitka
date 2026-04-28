variable "cloud_id" {
  description = "Yandex Cloud ID."
  type        = string
}

variable "folder_id" {
  description = "Yandex Cloud folder ID."
  type        = string
}

variable "zone" {
  description = "Default Yandex Cloud availability zone."
  type        = string
  default     = "ru-central1-d"
}

variable "service_account_key_file" {
  description = "Path to the Yandex Cloud service account authorized key JSON file."
  type        = string
  default     = null
  sensitive   = true
}

variable "app_vm_name" {
  description = "COI VM name."
  type        = string
  default     = "vizitka-coi"
}

variable "app_zone" {
  description = "COI VM availability zone."
  type        = string
  default     = "ru-central1-a"
}

variable "app_platform_id" {
  description = "COI VM platform ID."
  type        = string
  default     = "standard-v3"
}

variable "app_cores" {
  description = "COI VM CPU cores."
  type        = number
  default     = 2

  validation {
    condition     = var.app_cores > 0
    error_message = "app_cores must be greater than 0."
  }
}

variable "app_memory_gb" {
  description = "COI VM memory in GB."
  type        = number
  default     = 2

  validation {
    condition     = var.app_memory_gb > 0
    error_message = "app_memory_gb must be greater than 0."
  }
}

variable "app_core_fraction" {
  description = "COI VM guaranteed CPU fraction."
  type        = number
  default     = 100

  validation {
    condition     = contains([5, 20, 50, 100], var.app_core_fraction)
    error_message = "app_core_fraction must be one of: 5, 20, 50, 100."
  }
}

variable "app_private_ip" {
  description = "COI VM private IPv4 address."
  type        = string
  default     = "10.128.0.15"
}

variable "app_enable_nat" {
  description = "Enable public NAT IPv4 address for the COI VM."
  type        = bool
  default     = true
}

variable "manage_app_security_group" {
  description = "Create and attach a Terraform-managed security group for the COI VM."
  type        = bool
  default     = false
}

variable "app_security_group_name" {
  description = "Name for the Terraform-managed app security group."
  type        = string
  default     = "vizitka-app-sg"
}

variable "app_http_cidr_blocks" {
  description = "CIDR blocks allowed to access HTTP on the app VM."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_https_cidr_blocks" {
  description = "CIDR blocks allowed to access HTTPS on the app VM."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_ssh_cidr_blocks" {
  description = "CIDR blocks allowed to access SSH on the app VM. Empty list disables Terraform-managed SSH ingress."
  type        = list(string)
  default     = []
}

variable "app_egress_cidr_blocks" {
  description = "CIDR blocks allowed for outbound traffic from the app VM."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
