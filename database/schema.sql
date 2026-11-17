-- Comfort Stay PG & Hostel Management System
-- Normalized Relational MySQL 8.0+ Schema

CREATE DATABASE IF NOT EXISTS pg_hostel_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pg_hostel_management;

-- 1. Users (Owner, Managers, Tenants)
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('TENANT', 'MANAGER', 'OWNER') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms (10 Rooms: 101 to 110)
CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  floor INT NOT NULL,
  room_type VARCHAR(60) NOT NULL,
  total_beds INT NOT NULL DEFAULT 4 CHECK (total_beds > 0)
);

-- 3. Beds (40 Beds: 4 per room)
CREATE TABLE IF NOT EXISTS beds (
  bed_id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  bed_number VARCHAR(30) NOT NULL,
  status ENUM('VACANT', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'VACANT',
  UNIQUE KEY uq_room_bed (room_id, bed_number),
  CONSTRAINT fk_beds_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- 4. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT NOT NULL UNIQUE,
  joining_date DATE NOT NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL CHECK (monthly_rent >= 0),
  emergency_contact VARCHAR(30) NOT NULL,
  address VARCHAR(255) DEFAULT '',
  status ENUM('ACTIVE', 'CHECKED_OUT') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT fk_tenants_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 5. Stay History (tracks bed allocations & check-outs)
CREATE TABLE IF NOT EXISTS stay_history (
  stay_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  bed_id INT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NULL,
  CONSTRAINT fk_stay_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_stay_bed FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE RESTRICT
);

-- 6. Rent Payments
CREATE TABLE IF NOT EXISTS rent_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  electricity_share DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  other_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payment_month VARCHAR(7) NOT NULL,
  payment_date DATETIME NULL,
  payment_status ENUM('PAID', 'PENDING', 'FAILED') NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(50) DEFAULT 'UPI (Demo)',
  transaction_id VARCHAR(80) NOT NULL UNIQUE,
  CONSTRAINT fk_rent_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  INDEX idx_rent_month_status (payment_month, payment_status)
);

-- 7. Security Deposits
CREATE TABLE IF NOT EXISTS deposits (
  deposit_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  deposit_date DATE NOT NULL,
  refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (refund_amount >= 0),
  status ENUM('HELD', 'PARTIAL_REFUND', 'REFUNDED') NOT NULL DEFAULT 'HELD',
  CONSTRAINT fk_deposit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- 8. Room-wise Electricity Bills
CREATE TABLE IF NOT EXISTS electricity_bills (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  previous_reading INT NOT NULL CHECK (previous_reading >= 0),
  current_reading INT NOT NULL,
  units_consumed INT NOT NULL CHECK (units_consumed >= 0),
  rate_per_unit DECIMAL(10, 2) NOT NULL CHECK (rate_per_unit > 0),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  billing_month VARCHAR(7) NOT NULL,
  recorded_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_room_billing_month (room_id, billing_month),
  CONSTRAINT chk_elec_reading CHECK (current_reading >= previous_reading),
  CONSTRAINT fk_elec_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  CONSTRAINT fk_elec_user FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 9. Complaints
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_code VARCHAR(30) NOT NULL UNIQUE,
  tenant_id INT NOT NULL,
  room_id INT NULL,
  category ENUM('Electricity', 'Water', 'Wi-Fi', 'Cleaning', 'Furniture', 'Maintenance', 'Other') NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  complaint_date DATE NOT NULL,
  status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
  priority ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  resolution_remarks TEXT NULL,
  CONSTRAINT fk_complaint_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_complaint_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE SET NULL
);

-- 10. Identity Documents (private, never exposed publicly)
CREATE TABLE IF NOT EXISTS documents (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  document_type VARCHAR(60) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- 11. Weekly Food Menu
CREATE TABLE IF NOT EXISTS food_menu (
  menu_id INT AUTO_INCREMENT PRIMARY KEY,
  day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  meal_type ENUM('Breakfast', 'Lunch', 'Evening Snacks', 'Dinner') NOT NULL,
  food_items VARCHAR(500) NOT NULL,
  UNIQUE KEY uq_day_meal (day, meal_type)
);

-- 12. Operational Expenses
CREATE TABLE IF NOT EXISTS expenses (
  expense_id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  status ENUM('UNREAD', 'READ') NOT NULL DEFAULT 'UNREAD',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(60) NOT NULL,
  details TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
