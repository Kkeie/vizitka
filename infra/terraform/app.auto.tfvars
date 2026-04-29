# Non-secret infrastructure configuration read automatically by Terraform.

# VM sizing.
app_cores         = 2
app_memory_gb     = 4
app_core_fraction = 100

# VM placement and addressing.
app_vm_name     = "vizitka-coi"
app_zone        = "ru-central1-a"
app_platform_id = "standard-v3"
app_private_ip  = "10.128.0.15"
app_enable_nat  = true

# Existing public IP that should stay attached to the VM after recreation.
# It must be reserved/static in Yandex Cloud before Terraform can attach it.
app_public_ip_address             = "93.77.185.199"
app_reserve_public_ip             = false
app_public_ip_name                = "vizitka-public-ip"
app_public_ip_deletion_protection = true

# Keep false to continue using the imported existing security group.
# Set true to create and attach a Terraform-managed app security group.
manage_app_security_group = false
app_security_group_name   = "vizitka-app-sg"

# Used only when manage_app_security_group = true.
app_http_cidr_blocks   = ["0.0.0.0/0"]
app_https_cidr_blocks  = ["0.0.0.0/0"]
app_ssh_cidr_blocks    = []
app_egress_cidr_blocks = ["0.0.0.0/0"]
