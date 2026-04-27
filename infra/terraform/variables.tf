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
