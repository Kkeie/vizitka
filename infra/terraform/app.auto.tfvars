# Non-secret infrastructure configuration read automatically by Terraform.

# VM sizing.
app_cores         = 2
app_memory_gb     = 2
app_core_fraction = 100

# VM placement and addressing.
app_vm_name     = "vizitka-coi"
app_zone        = "ru-central1-a"
app_platform_id = "standard-v3"
app_private_ip  = "10.128.0.15"
app_enable_nat  = true

# Keep false to continue using the imported existing security group.
# Set true to create and attach a Terraform-managed app security group.
manage_app_security_group = false
app_security_group_name   = "vizitka-app-sg"

# Used only when manage_app_security_group = true.
app_http_cidr_blocks   = ["0.0.0.0/0"]
app_https_cidr_blocks  = ["0.0.0.0/0"]
app_ssh_cidr_blocks    = []
app_egress_cidr_blocks = ["0.0.0.0/0"]
