-- Comfort Stay PG & Hostel Management System
-- Realistic Development Seed Data (MySQL 8.0+)
-- Demo Passwords (Development Only):
--   Owner:   Owner@123
--   Manager: Manager@123
--   Tenant:  Tenant@123

USE pg_hostel_management;

-- Clear existing seed data safely in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE expenses;
TRUNCATE TABLE food_menu;
TRUNCATE TABLE documents;
TRUNCATE TABLE complaints;
TRUNCATE TABLE electricity_bills;
TRUNCATE TABLE deposits;
TRUNCATE TABLE rent_payments;
TRUNCATE TABLE stay_history;
TRUNCATE TABLE tenants;
TRUNCATE TABLE beds;
TRUNCATE TABLE rooms;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users (1 Owner, 2 Managers, 15 Tenants)
INSERT INTO users (user_id, name, email, phone, password_hash, role, created_at) VALUES
(1, 'Vikramaditya Rao', 'owner@comfortstay.in', '9845010001', '$2b$10$wZmRl8tPqpWSOQaffhE0ReqzWxFXLaL6LBTnBci/ehj9yEa38Ogse', 'OWNER', '2026-01-01 09:00:00'),
(2, 'Suresh Nair', 'manager@comfortstay.in', '9845010002', '$2b$10$5Vcam41FlvGCFEA/i7NuIetYAszBaz9gimOgwlta42.I/9nU.xabu', 'MANAGER', '2026-01-05 09:00:00'),
(3, 'Kavitha Deshmukh', 'warden@comfortstay.in', '9845010003', '$2b$10$5Vcam41FlvGCFEA/i7NuIetYAszBaz9gimOgwlta42.I/9nU.xabu', 'MANAGER', '2026-01-10 09:00:00'),
(4, 'Aarav Sharma', 'tenant@comfortstay.in', '9845020001', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-06-01 10:00:00'),
(5, 'Rohan Verma', 'rohan.verma@comfortstay.in', '9845020002', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-06-03 10:00:00'),
(6, 'Karthik Reddy', 'karthik.reddy@comfortstay.in', '9845020003', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-06-15 10:00:00'),
(7, 'Siddharth Menon', 'siddharth.menon@comfortstay.in', '9845020004', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-07-01 10:00:00'),
(8, 'Pranav Kulkarni', 'pranav.kulkarni@comfortstay.in', '9845020005', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-07-04 10:00:00'),
(9, 'Aditya Joshi', 'aditya.joshi@comfortstay.in', '9845020006', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-07-12 10:00:00'),
(10, 'Nikhil Bansal', 'nikhil.bansal@comfortstay.in', '9845020007', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-08-01 10:00:00'),
(11, 'Varun Krishnan', 'varun.krishnan@comfortstay.in', '9845020008', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-08-05 10:00:00'),
(12, 'Harshvardhan Patel', 'harsh.patel@comfortstay.in', '9845020009', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-08-18 10:00:00'),
(13, 'Devansh Gupta', 'devansh.gupta@comfortstay.in', '9845020010', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-09-01 10:00:00'),
(14, 'Yashwant Gowda', 'yashwant.gowda@comfortstay.in', '9845020011', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-09-05 10:00:00'),
(15, 'Abhishek Mishra', 'abhishek.mishra@comfortstay.in', '9845020012', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-09-14 10:00:00'),
(16, 'Manish Tiwari', 'manish.tiwari@comfortstay.in', '9845020013', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-10-01 10:00:00'),
(17, 'Rishabh Chatterjee', 'rishabh.chatterjee@comfortstay.in', '9845020014', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-10-04 10:00:00'),
(18, 'Tarun Malhotra', 'tarun.malhotra@comfortstay.in', '9845020015', '$2b$10$KNoQimzSuVARTLyaDLq4ZeJLVObCRhVroX4wb7.P53SfUfmEQKXMG', 'TENANT', '2026-10-10 10:00:00');

-- 2. Rooms (10 Rooms: 101 to 110)
INSERT INTO rooms (room_id, room_number, floor, room_type, total_beds) VALUES
(1, '101', 1, '4-Sharing Standard', 4),
(2, '102', 1, '4-Sharing Standard', 4),
(3, '103', 1, '4-Sharing Standard', 4),
(4, '104', 1, '4-Sharing AC', 4),
(5, '105', 1, '4-Sharing AC', 4),
(6, '106', 2, '4-Sharing Standard', 4),
(7, '107', 2, '4-Sharing Standard', 4),
(8, '108', 2, '4-Sharing AC', 4),
(9, '109', 2, '4-Sharing AC', 4),
(10, '110', 2, '4-Sharing Deluxe AC', 4);

-- 3. Beds (40 Beds: 4 per room)
INSERT INTO beds (bed_id, room_id, bed_number, status) VALUES
(1, 1, 'B-101-A', 'OCCUPIED'), (2, 1, 'B-101-B', 'OCCUPIED'), (3, 1, 'B-101-C', 'OCCUPIED'), (4, 1, 'B-101-D', 'VACANT'),
(5, 2, 'B-102-A', 'OCCUPIED'), (6, 2, 'B-102-B', 'OCCUPIED'), (7, 2, 'B-102-C', 'VACANT'), (8, 2, 'B-102-D', 'MAINTENANCE'),
(9, 3, 'B-103-A', 'OCCUPIED'), (10, 3, 'B-103-B', 'OCCUPIED'), (11, 3, 'B-103-C', 'VACANT'), (12, 3, 'B-103-D', 'VACANT'),
(13, 4, 'B-104-A', 'OCCUPIED'), (14, 4, 'B-104-B', 'OCCUPIED'), (15, 4, 'B-104-C', 'VACANT'), (16, 4, 'B-104-D', 'VACANT'),
(17, 5, 'B-105-A', 'OCCUPIED'), (18, 5, 'B-105-B', 'VACANT'), (19, 5, 'B-105-C', 'VACANT'), (20, 5, 'B-105-D', 'MAINTENANCE'),
(21, 6, 'B-106-A', 'OCCUPIED'), (22, 6, 'B-106-B', 'OCCUPIED'), (23, 6, 'B-106-C', 'VACANT'), (24, 6, 'B-106-D', 'VACANT'),
(25, 7, 'B-107-A', 'OCCUPIED'), (26, 7, 'B-107-B', 'VACANT'), (27, 7, 'B-107-C', 'VACANT'), (28, 7, 'B-107-D', 'VACANT'),
(29, 8, 'B-108-A', 'OCCUPIED'), (30, 8, 'B-108-B', 'VACANT'), (31, 8, 'B-108-C', 'VACANT'), (32, 8, 'B-108-D', 'VACANT'),
(33, 9, 'B-109-A', 'OCCUPIED'), (34, 9, 'B-109-B', 'VACANT'), (35, 9, 'B-109-C', 'VACANT'), (36, 9, 'B-109-D', 'VACANT'),
(37, 10, 'B-110-A', 'VACANT'), (38, 10, 'B-110-B', 'VACANT'), (39, 10, 'B-110-C', 'VACANT'), (40, 10, 'B-110-D', 'VACANT');

-- 4. Tenants (15 active tenants)
INSERT INTO tenants (tenant_id, tenant_code, user_id, joining_date, monthly_rent, emergency_contact, address, status) VALUES
(1, 'CS-T001', 4, '2026-06-01', 8500.00, '9811100001', 'Jaipur, Rajasthan', 'ACTIVE'),
(2, 'CS-T002', 5, '2026-06-03', 8500.00, '9811100002', 'Lucknow, Uttar Pradesh', 'ACTIVE'),
(3, 'CS-T003', 6, '2026-06-15', 8500.00, '9811100003', 'Hyderabad, Telangana', 'ACTIVE'),
(4, 'CS-T004', 7, '2026-07-01', 8500.00, '9811100004', 'Kochi, Kerala', 'ACTIVE'),
(5, 'CS-T005', 8, '2026-07-04', 8500.00, '9811100005', 'Pune, Maharashtra', 'ACTIVE'),
(6, 'CS-T006', 9, '2026-07-12', 8500.00, '9811100006', 'Nagpur, Maharashtra', 'ACTIVE'),
(7, 'CS-T007', 10, '2026-08-01', 8500.00, '9811100007', 'Chandigarh, Punjab', 'ACTIVE'),
(8, 'CS-T008', 11, '2026-08-05', 9500.00, '9811100008', 'Chennai, Tamil Nadu', 'ACTIVE'),
(9, 'CS-T009', 12, '2026-08-18', 9500.00, '9811100009', 'Ahmedabad, Gujarat', 'ACTIVE'),
(10, 'CS-T010', 13, '2026-09-01', 9500.00, '9811100010', 'Indore, Madhya Pradesh', 'ACTIVE'),
(11, 'CS-T011', 14, '2026-09-05', 8500.00, '9811100011', 'Mysuru, Karnataka', 'ACTIVE'),
(12, 'CS-T012', 15, '2026-09-14', 8500.00, '9811100012', 'Patna, Bihar', 'ACTIVE'),
(13, 'CS-T013', 16, '2026-10-01', 8500.00, '9811100013', 'Bhopal, Madhya Pradesh', 'ACTIVE'),
(14, 'CS-T014', 17, '2026-10-04', 9500.00, '9811100014', 'Kolkata, West Bengal', 'ACTIVE'),
(15, 'CS-T015', 18, '2026-10-10', 9500.00, '9811100015', 'Gurugram, Haryana', 'ACTIVE');

-- 5. Stay History
INSERT INTO stay_history (stay_id, tenant_id, bed_id, check_in, check_out) VALUES
(1, 1, 1, '2026-06-01', NULL),
(2, 2, 2, '2026-06-03', NULL),
(3, 3, 3, '2026-06-15', NULL),
(4, 4, 5, '2026-07-01', NULL),
(5, 5, 6, '2026-07-04', NULL),
(6, 6, 9, '2026-07-12', NULL),
(7, 7, 10, '2026-08-01', NULL),
(8, 8, 13, '2026-08-05', NULL),
(9, 9, 14, '2026-08-18', NULL),
(10, 10, 17, '2026-09-01', NULL),
(11, 11, 21, '2026-09-05', NULL),
(12, 12, 22, '2026-09-14', NULL),
(13, 13, 25, '2026-10-01', NULL),
(14, 14, 29, '2026-10-04', NULL),
(15, 15, 33, '2026-10-10', NULL);

-- 6. Rent Payments (August, September, October, November 2026)
INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id) VALUES
(1, 8500.00, 400.00, 0.00, '2026-10', '2026-10-05 11:20:00', 'PAID', 'UPI (Demo)', 'TXN-202610-001'),
(2, 8500.00, 400.00, 0.00, '2026-10', '2026-10-04 14:10:00', 'PAID', 'UPI (Demo)', 'TXN-202610-002'),
(3, 8500.00, 400.00, 0.00, '2026-10', '2026-10-06 09:45:00', 'PAID', 'Bank Transfer', 'TXN-202610-003'),
(4, 8500.00, 520.00, 0.00, '2026-10', '2026-10-05 18:15:00', 'PAID', 'UPI (Demo)', 'TXN-202610-004'),
(5, 8500.00, 520.00, 0.00, '2026-10', '2026-10-07 10:30:00', 'PAID', 'Card (Demo)', 'TXN-202610-005'),
(6, 8500.00, 480.00, 0.00, '2026-10', '2026-10-05 16:00:00', 'PAID', 'UPI (Demo)', 'TXN-202610-006'),
(7, 8500.00, 480.00, 0.00, '2026-10', '2026-10-08 12:12:00', 'PAID', 'UPI (Demo)', 'TXN-202610-007'),
(8, 9500.00, 640.00, 0.00, '2026-10', '2026-10-04 15:25:00', 'PAID', 'Bank Transfer', 'TXN-202610-008'),
(9, 9500.00, 640.00, 0.00, '2026-10', '2026-10-06 20:05:00', 'PAID', 'UPI (Demo)', 'TXN-202610-009'),
(10, 9500.00, 880.00, 0.00, '2026-10', '2026-10-07 11:40:00', 'PAID', 'UPI (Demo)', 'TXN-202610-010'),
(11, 8500.00, 440.00, 0.00, '2026-10', '2026-10-05 13:50:00', 'PAID', 'UPI (Demo)', 'TXN-202610-011'),
(12, 8500.00, 440.00, 0.00, '2026-10', '2026-10-09 19:20:00', 'PAID', 'Cash', 'TXN-202610-012'),
(13, 8500.00, 720.00, 0.00, '2026-10', '2026-10-05 09:10:00', 'PAID', 'UPI (Demo)', 'TXN-202610-013'),
(14, 9500.00, 960.00, 0.00, '2026-10', '2026-10-06 16:40:00', 'PAID', 'Card (Demo)', 'TXN-202610-014'),
(15, 9500.00, 800.00, 0.00, '2026-10', '2026-10-10 10:15:00', 'PAID', 'UPI (Demo)', 'TXN-202610-015'),
-- November 2026 (mix of PAID and PENDING so dashboards show live pending & collected metrics)
(1, 8500.00, 400.00, 0.00, '2026-11', NULL, 'PENDING', 'Pending', 'INV-202611-001'),
(2, 8500.00, 400.00, 0.00, '2026-11', '2026-11-03 10:15:00', 'PAID', 'UPI (Demo)', 'TXN-202611-002'),
(3, 8500.00, 400.00, 0.00, '2026-11', '2026-11-04 12:30:00', 'PAID', 'UPI (Demo)', 'TXN-202611-003'),
(4, 8500.00, 560.00, 0.00, '2026-11', '2026-11-02 09:50:00', 'PAID', 'Bank Transfer', 'TXN-202611-004'),
(5, 8500.00, 560.00, 0.00, '2026-11', NULL, 'PENDING', 'Pending', 'INV-202611-005'),
(6, 8500.00, 500.00, 0.00, '2026-11', '2026-11-05 17:10:00', 'PAID', 'UPI (Demo)', 'TXN-202611-006'),
(7, 8500.00, 500.00, 0.00, '2026-11', '2026-11-06 14:45:00', 'PAID', 'Card (Demo)', 'TXN-202611-007'),
(8, 9500.00, 720.00, 0.00, '2026-11', '2026-11-03 11:00:00', 'PAID', 'UPI (Demo)', 'TXN-202611-008'),
(9, 9500.00, 720.00, 0.00, '2026-11', NULL, 'PENDING', 'Pending', 'INV-202611-009'),
(10, 9500.00, 960.00, 0.00, '2026-11', '2026-11-05 15:20:00', 'PAID', 'UPI (Demo)', 'TXN-202611-010'),
(11, 8500.00, 460.00, 0.00, '2026-11', '2026-11-04 19:00:00', 'PAID', 'UPI (Demo)', 'TXN-202611-011'),
(12, 8500.00, 460.00, 0.00, '2026-11', NULL, 'PENDING', 'Pending', 'INV-202611-012'),
(13, 8500.00, 760.00, 0.00, '2026-11', '2026-11-05 08:30:00', 'PAID', 'Bank Transfer', 'TXN-202611-013'),
(14, 9500.00, 1040.00, 0.00, '2026-11', '2026-11-06 13:15:00', 'PAID', 'UPI (Demo)', 'TXN-202611-014'),
(15, 9500.00, 880.00, 0.00, '2026-11', NULL, 'PENDING', 'Pending', 'INV-202611-015');

-- 7. Security Deposits
INSERT INTO deposits (tenant_id, amount, deposit_date, refund_amount, status) VALUES
(1, 15000.00, '2026-06-01', 0.00, 'HELD'),
(2, 15000.00, '2026-06-03', 0.00, 'HELD'),
(3, 15000.00, '2026-06-15', 0.00, 'HELD'),
(4, 15000.00, '2026-07-01', 0.00, 'HELD'),
(5, 15000.00, '2026-07-04', 0.00, 'HELD'),
(6, 15000.00, '2026-07-12', 0.00, 'HELD'),
(7, 15000.00, '2026-08-01', 0.00, 'HELD'),
(8, 18000.00, '2026-08-05', 0.00, 'HELD'),
(9, 18000.00, '2026-08-18', 0.00, 'HELD'),
(10, 18000.00, '2026-09-01', 0.00, 'HELD'),
(11, 15000.00, '2026-09-05', 0.00, 'HELD'),
(12, 15000.00, '2026-09-14', 0.00, 'HELD'),
(13, 15000.00, '2026-10-01', 0.00, 'HELD'),
(14, 18000.00, '2026-10-04', 0.00, 'HELD'),
(15, 18000.00, '2026-10-10', 0.00, 'HELD');

-- 8. Room-wise Electricity Bills (Oct & Nov 2026)
INSERT INTO electricity_bills (room_id, previous_reading, current_reading, units_consumed, rate_per_unit, total_amount, billing_month, recorded_by) VALUES
(1, 1050, 1200, 150, 8.00, 1200.00, '2026-10', 2),
(2, 920, 1050, 130, 8.00, 1040.00, '2026-10', 2),
(3, 810, 930, 120, 8.00, 960.00, '2026-10', 2),
(4, 1400, 1560, 160, 8.00, 1280.00, '2026-10', 2),
(5, 1100, 1210, 110, 8.00, 880.00, '2026-10', 2),
(6, 760, 870, 110, 8.00, 880.00, '2026-10', 3),
(7, 640, 730, 90, 8.00, 720.00, '2026-10', 3),
(8, 1320, 1440, 120, 8.00, 960.00, '2026-10', 3),
(9, 1250, 1350, 100, 8.00, 800.00, '2026-10', 3),
(1, 1200, 1350, 150, 8.00, 1200.00, '2026-11', 2),
(2, 1050, 1190, 140, 8.00, 1120.00, '2026-11', 2),
(3, 930, 1055, 125, 8.00, 1000.00, '2026-11', 2),
(4, 1560, 1740, 180, 8.00, 1440.00, '2026-11', 2),
(5, 1210, 1330, 120, 8.00, 960.00, '2026-11', 2),
(6, 870, 985, 115, 8.00, 920.00, '2026-11', 3),
(7, 730, 825, 95, 8.00, 760.00, '2026-11', 3),
(8, 1440, 1570, 130, 8.00, 1040.00, '2026-11', 3),
(9, 1350, 1460, 110, 8.00, 880.00, '2026-11', 3);

-- 9. Complaints
INSERT INTO complaints (complaint_code, tenant_id, room_id, category, title, description, complaint_date, status, priority, resolution_remarks) VALUES
('CMP-2026-001', 1, 1, 'Wi-Fi', 'Intermittent Wi-Fi drops in Room 101', 'Router signal drops every evening between 8 PM and 10 PM near Bed A.', '2026-11-10', 'IN_PROGRESS', 'HIGH', 'Technician scheduled to replace dual-band access point on Floor 1.'),
('CMP-2026-002', 4, 2, 'Water', 'Low hot water pressure in morning hours', 'Solar geyser outlet flow is slow in bathroom attached to Room 102.', '2026-11-12', 'PENDING', 'MEDIUM', NULL),
('CMP-2026-003', 8, 4, 'Electricity', 'AC stabilizer making humming sound', 'Stabilizer unit mounted near Bed B vibrates when compressor turns on.', '2026-11-04', 'RESOLVED', 'MEDIUM', 'Replaced stabilizer relay and tightened wall bracket.'),
('CMP-2026-004', 10, 5, 'Furniture', 'Study chair caster wheel broken', 'One wheel on the ergonomic study chair for Bed B-105-A came loose.', '2026-11-14', 'PENDING', 'LOW', NULL),
('CMP-2026-005', 2, 1, 'Cleaning', 'Balcony drain cleaning required', 'Dry leaves blocking rainwater outlet on Room 101 balcony.', '2026-11-08', 'RESOLVED', 'LOW', 'Housekeeping cleared drain and sanitized balcony floor.');

-- 10. Weekly Food Menu (Monday - Sunday, 4 meals/day)
INSERT INTO food_menu (day, meal_type, food_items) VALUES
('Monday', 'Breakfast', 'Idli, Medu Vada, Sambar, Coconut Chutney, Filter Coffee / Tea'),
('Monday', 'Lunch', 'Steamed Rice, Phulka, Dal Tadka, Aloo Gobi, Curd, Pickle'),
('Monday', 'Evening Snacks', 'Masala Poha, Ginger Tea'),
('Monday', 'Dinner', 'Chapati, Paneer Butter Masala, Jeera Rice, Green Salad'),
('Tuesday', 'Breakfast', 'Aloo Paratha, Curd, Mango Pickle, Masala Chai'),
('Tuesday', 'Lunch', 'Steamed Rice, Chapati, Rajma Masala, Bhindi Fry, Buttermilk'),
('Tuesday', 'Evening Snacks', 'Onion Pakoda, Mint Chutney, Tea / Coffee'),
('Tuesday', 'Dinner', 'Phulka, Mix Veg Kurma, Veg Pulao, Gulab Jamun'),
('Wednesday', 'Breakfast', 'Masala Dosa, Sambar, Tomato Chutney, Coffee / Tea'),
('Wednesday', 'Lunch', 'Steamed Rice, Roti, Chana Masala, Cabbage Poriyal, Curd'),
('Wednesday', 'Evening Snacks', 'Veg Sandwich, Tomato Ketchup, Masala Chai'),
('Wednesday', 'Dinner', 'Chapati, Egg Curry / Kadai Paneer, Steamed Rice, Rasam'),
('Thursday', 'Breakfast', 'Upma, Pongal, Vada, Chutney, Filter Coffee / Tea'),
('Thursday', 'Lunch', 'Steamed Rice, Phulka, Sambar, Dum Aloo, Papad, Curd'),
('Thursday', 'Evening Snacks', 'Samosa (2 pcs), Tamarind Chutney, Tea'),
('Thursday', 'Dinner', 'Chapati, Dal Makhani, Peas Pulao, Boondi Raita'),
('Friday', 'Breakfast', 'Poori Bhaji, Boiled Eggs / Banana, Masala Chai'),
('Friday', 'Lunch', 'Steamed Rice, Roti, Kadhi Pakora, Jeera Aloo, Fryums'),
('Friday', 'Evening Snacks', 'Sweet Corn Chaat, Lemon Tea / Coffee'),
('Friday', 'Dinner', 'Veg Dum Biryani, Mirchi Ka Salan, Onion Raita, Ice Cream'),
('Saturday', 'Breakfast', 'Chole Bhature, Pickle, Lassi / Tea'),
('Saturday', 'Lunch', 'Steamed Rice, Chapati, Dal Fry, Baingan Bharta, Curd'),
('Saturday', 'Evening Snacks', 'Bread Bajji, Coconut Chutney, Ginger Tea'),
('Saturday', 'Dinner', 'Phulka, Matar Paneer, Steamed Rice, Tomato Soup'),
('Sunday', 'Breakfast', 'Set Dosa, Vegetable Kurma, Fresh Watermelon, Filter Coffee'),
('Sunday', 'Lunch', 'Special Veg Pulao, Chicken Curry / Shahi Paneer, Raita, Payasam'),
('Sunday', 'Evening Snacks', 'Bhel Puri, Masala Chai'),
('Sunday', 'Dinner', 'Light Khichdi, Kadhi, Aloo Chokha, Papad');

-- 11. Operational Expenses
INSERT INTO expenses (category, description, amount, expense_date) VALUES
('Electricity Utility', 'BESCOM Commercial Power Bill - October 2026', 14200.00, '2026-10-12'),
('Groceries & Kitchen', 'Monthly Bulk Grains, Dairy & Produce Supply', 38500.00, '2026-11-02'),
('Staff Salaries', 'Cook, Housekeeping & Security Staff Wages', 32000.00, '2026-11-05'),
('Internet & Wi-Fi', 'ACT Fibernet Dual 500Mbps Lease Line', 4800.00, '2026-11-06'),
('Water & Tanker', 'Municipal Water & RO Filter Servicing', 5600.00, '2026-11-08'),
('Maintenance', 'Plumbing & Electrical Preventive Servicing', 4200.00, '2026-11-11');

-- 12. Notifications
INSERT INTO notifications (user_id, message, status) VALUES
(4, 'Your November 2026 rent & electricity invoice (₹ 8,900) is ready for payment.', 'UNREAD'),
(4, 'Complaint CMP-2026-001 status updated to In Progress by Manager Suresh Nair.', 'UNREAD'),
(5, 'Thank you! Payment TXN-202611-002 for ₹ 8,900 has been confirmed.', 'READ'),
(2, 'New complaint CMP-2026-004 logged by Pranav Kulkarni in Room 105.', 'UNREAD'),
(1, 'November monthly collection reached ₹ 95,660 across 10 paid tenants.', 'UNREAD');

-- 13. Audit Logs
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES
(2, 'RECORD_ELECTRICITY_BILL', 'electricity_bills', '10', 'Recorded Nov 2026 meter reading for Room 101 (1200 -> 1350, 150 units)'),
(2, 'UPDATE_COMPLAINT_STATUS', 'complaints', '1', 'Changed CMP-2026-001 from PENDING to IN_PROGRESS'),
(1, 'SYSTEM_SEED', 'system', 'comfort_stay', 'Initialized Comfort Stay PG database with 10 rooms and 40 beds');
