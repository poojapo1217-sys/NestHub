import bcrypt from 'bcryptjs';
import { db, withTransaction } from '../config/db.ts';

export async function ensureSeeded(force = false): Promise<boolean> {
  const existing = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (!force && existing && Number(existing.count) > 0) {
    return false;
  }

  const ownerHash = await bcrypt.hash('Owner@123', 10);
  const managerHash = await bcrypt.hash('Manager@123', 10);
  const tenantHash = await bcrypt.hash('Tenant@123', 10);

  await withTransaction(async (tx) => {
    if (force) {
      await tx.execute('DELETE FROM audit_logs');
      await tx.execute('DELETE FROM notifications');
      await tx.execute('DELETE FROM expenses');
      await tx.execute('DELETE FROM food_menu');
      await tx.execute('DELETE FROM documents');
      await tx.execute('DELETE FROM complaints');
      await tx.execute('DELETE FROM electricity_bills');
      await tx.execute('DELETE FROM deposits');
      await tx.execute('DELETE FROM rent_payments');
      await tx.execute('DELETE FROM stay_history');
      await tx.execute('DELETE FROM tenants');
      await tx.execute('DELETE FROM beds');
      await tx.execute('DELETE FROM rooms');
      await tx.execute('DELETE FROM users');
    }

    const users: Array<[number, string, string, string, string, string, string]> = [
      [1, 'Vikramaditya Rao', 'owner@comfortstay.in', '9845010001', ownerHash, 'OWNER', '2026-01-01 09:00:00'],
      [2, 'Suresh Nair', 'manager@comfortstay.in', '9845010002', managerHash, 'MANAGER', '2026-01-05 09:00:00'],
      [3, 'Kavitha Deshmukh', 'warden@comfortstay.in', '9845010003', managerHash, 'MANAGER', '2026-01-10 09:00:00'],
      [4, 'Aarav Sharma', 'tenant@comfortstay.in', '9845020001', tenantHash, 'TENANT', '2026-06-01 10:00:00'],
      [5, 'Rohan Verma', 'rohan.verma@comfortstay.in', '9845020002', tenantHash, 'TENANT', '2026-06-03 10:00:00'],
      [6, 'Karthik Reddy', 'karthik.reddy@comfortstay.in', '9845020003', tenantHash, 'TENANT', '2026-06-15 10:00:00'],
      [7, 'Siddharth Menon', 'siddharth.menon@comfortstay.in', '9845020004', tenantHash, 'TENANT', '2026-07-01 10:00:00'],
      [8, 'Pranav Kulkarni', 'pranav.kulkarni@comfortstay.in', '9845020005', tenantHash, 'TENANT', '2026-07-04 10:00:00'],
      [9, 'Aditya Joshi', 'aditya.joshi@comfortstay.in', '9845020006', tenantHash, 'TENANT', '2026-07-12 10:00:00'],
      [10, 'Nikhil Bansal', 'nikhil.bansal@comfortstay.in', '9845020007', tenantHash, 'TENANT', '2026-08-01 10:00:00'],
      [11, 'Varun Krishnan', 'varun.krishnan@comfortstay.in', '9845020008', tenantHash, 'TENANT', '2026-08-05 10:00:00'],
      [12, 'Harshvardhan Patel', 'harsh.patel@comfortstay.in', '9845020009', tenantHash, 'TENANT', '2026-08-18 10:00:00'],
      [13, 'Devansh Gupta', 'devansh.gupta@comfortstay.in', '9845020010', tenantHash, 'TENANT', '2026-09-01 10:00:00'],
      [14, 'Yashwant Gowda', 'yashwant.gowda@comfortstay.in', '9845020011', tenantHash, 'TENANT', '2026-09-05 10:00:00'],
      [15, 'Abhishek Mishra', 'abhishek.mishra@comfortstay.in', '9845020012', tenantHash, 'TENANT', '2026-09-14 10:00:00'],
      [16, 'Manish Tiwari', 'manish.tiwari@comfortstay.in', '9845020013', tenantHash, 'TENANT', '2026-10-01 10:00:00'],
      [17, 'Rishabh Chatterjee', 'rishabh.chatterjee@comfortstay.in', '9845020014', tenantHash, 'TENANT', '2026-10-04 10:00:00'],
      [18, 'Tarun Malhotra', 'tarun.malhotra@comfortstay.in', '9845020015', tenantHash, 'TENANT', '2026-10-10 10:00:00'],
    ];

    for (const u of users) {
      await tx.execute(
        'INSERT INTO users (user_id, name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        u
      );
    }

    const rooms: Array<[number, string, number, string, number]> = [
      [1, '101', 1, '4-Sharing Standard', 4],
      [2, '102', 1, '4-Sharing Standard', 4],
      [3, '103', 1, '4-Sharing Standard', 4],
      [4, '104', 1, '4-Sharing AC', 4],
      [5, '105', 1, '4-Sharing AC', 4],
      [6, '106', 2, '4-Sharing Standard', 4],
      [7, '107', 2, '4-Sharing Standard', 4],
      [8, '108', 2, '4-Sharing AC', 4],
      [9, '109', 2, '4-Sharing AC', 4],
      [10, '110', 2, '4-Sharing Deluxe AC', 4],
    ];

    for (const r of rooms) {
      await tx.execute(
        'INSERT INTO rooms (room_id, room_number, floor, room_type, total_beds) VALUES (?, ?, ?, ?, ?)',
        r
      );
    }

    const occupiedBedMap: Record<number, number> = {
      1: 1, 2: 2, 3: 3, 5: 4, 6: 5, 9: 6, 10: 7, 13: 8, 14: 9, 17: 10,
      21: 11, 22: 12, 25: 13, 29: 14, 33: 15,
    };
    const maintenanceBeds = new Set([8, 20]);
    const letters = ['A', 'B', 'C', 'D'];
    let bedCounter = 1;

    for (const room of rooms) {
      const roomId = room[0];
      const roomNum = room[1];
      for (const letter of letters) {
        const status = occupiedBedMap[bedCounter]
          ? 'OCCUPIED'
          : maintenanceBeds.has(bedCounter)
            ? 'MAINTENANCE'
            : 'VACANT';
        await tx.execute(
          'INSERT INTO beds (bed_id, room_id, bed_number, status) VALUES (?, ?, ?, ?)',
          [bedCounter, roomId, `B-${roomNum}-${letter}`, status]
        );
        bedCounter += 1;
      }
    }

    const tenants: Array<[number, string, number, string, number, string, string]> = [
      [1, 'CS-T001', 4, '2026-06-01', 8500, '9811100001', 'Jaipur, Rajasthan'],
      [2, 'CS-T002', 5, '2026-06-03', 8500, '9811100002', 'Lucknow, Uttar Pradesh'],
      [3, 'CS-T003', 6, '2026-06-15', 8500, '9811100003', 'Hyderabad, Telangana'],
      [4, 'CS-T004', 7, '2026-07-01', 8500, '9811100004', 'Kochi, Kerala'],
      [5, 'CS-T005', 8, '2026-07-04', 8500, '9811100005', 'Pune, Maharashtra'],
      [6, 'CS-T006', 9, '2026-07-12', 8500, '9811100006', 'Nagpur, Maharashtra'],
      [7, 'CS-T007', 10, '2026-08-01', 8500, '9811100007', 'Chandigarh, Punjab'],
      [8, 'CS-T008', 11, '2026-08-05', 9500, '9811100008', 'Chennai, Tamil Nadu'],
      [9, 'CS-T009', 12, '2026-08-18', 9500, '9811100009', 'Ahmedabad, Gujarat'],
      [10, 'CS-T010', 13, '2026-09-01', 9500, '9811100010', 'Indore, Madhya Pradesh'],
      [11, 'CS-T011', 14, '2026-09-05', 8500, '9811100011', 'Mysuru, Karnataka'],
      [12, 'CS-T012', 15, '2026-09-14', 8500, '9811100012', 'Patna, Bihar'],
      [13, 'CS-T013', 16, '2026-10-01', 8500, '9811100013', 'Bhopal, Madhya Pradesh'],
      [14, 'CS-T014', 17, '2026-10-04', 9500, '9811100014', 'Kolkata, West Bengal'],
      [15, 'CS-T015', 18, '2026-10-10', 9500, '9811100015', 'Gurugram, Haryana'],
    ];

    for (const t of tenants) {
      await tx.execute(
        `INSERT INTO tenants (tenant_id, tenant_code, user_id, joining_date, monthly_rent, emergency_contact, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        t
      );
    }

    const stays: Array<[number, number, string]> = [
      [1, 1, '2026-06-01'],
      [2, 2, '2026-06-03'],
      [3, 3, '2026-06-15'],
      [4, 5, '2026-07-01'],
      [5, 6, '2026-07-04'],
      [6, 9, '2026-07-12'],
      [7, 10, '2026-08-01'],
      [8, 13, '2026-08-05'],
      [9, 14, '2026-08-18'],
      [10, 17, '2026-09-01'],
      [11, 21, '2026-09-05'],
      [12, 22, '2026-09-14'],
      [13, 25, '2026-10-01'],
      [14, 29, '2026-10-04'],
      [15, 33, '2026-10-10'],
    ];

    for (const s of stays) {
      await tx.execute(
        'INSERT INTO stay_history (tenant_id, bed_id, check_in, check_out) VALUES (?, ?, ?, NULL)',
        s
      );
    }

    // Security Deposits
    for (const t of tenants) {
      const depAmount = t[4] >= 9500 ? 18000 : 15000;
      await tx.execute(
        `INSERT INTO deposits (tenant_id, amount, deposit_date, refund_amount, status)
         VALUES (?, ?, ?, 0, 'HELD')`,
        [t[0], depAmount, t[3]]
      );
    }

    // Room-wise Electricity Bills (Sep, Oct, Nov 2026)
    const elecRows: Array<[number, number, number, number, number, number, string, number]> = [
      // Sep 2026
      [1, 910, 1050, 140, 8, 1120, '2026-09', 2],
      [2, 800, 920, 120, 8, 960, '2026-09', 2],
      [3, 700, 810, 110, 8, 880, '2026-09', 2],
      [4, 1250, 1400, 150, 8, 1200, '2026-09', 2],
      [5, 990, 1100, 110, 8, 880, '2026-09', 2],
      [6, 660, 760, 100, 8, 800, '2026-09', 3],
      [7, 560, 640, 80, 8, 640, '2026-09', 3],
      [8, 1200, 1320, 120, 8, 960, '2026-09', 3],
      [9, 1150, 1250, 100, 8, 800, '2026-09', 3],
      // Oct 2026
      [1, 1050, 1200, 150, 8, 1200, '2026-10', 2],
      [2, 920, 1050, 130, 8, 1040, '2026-10', 2],
      [3, 810, 930, 120, 8, 960, '2026-10', 2],
      [4, 1400, 1560, 160, 8, 1280, '2026-10', 2],
      [5, 1100, 1210, 110, 8, 880, '2026-10', 2],
      [6, 760, 870, 110, 8, 880, '2026-10', 3],
      [7, 640, 730, 90, 8, 720, '2026-10', 3],
      [8, 1320, 1440, 120, 8, 960, '2026-10', 3],
      [9, 1250, 1350, 100, 8, 800, '2026-10', 3],
      // Nov 2026
      [1, 1200, 1350, 150, 8, 1200, '2026-11', 2],
      [2, 1050, 1190, 140, 8, 1120, '2026-11', 2],
      [3, 930, 1055, 125, 8, 1000, '2026-11', 2],
      [4, 1560, 1740, 180, 8, 1440, '2026-11', 2],
      [5, 1210, 1330, 120, 8, 960, '2026-11', 2],
      [6, 870, 985, 115, 8, 920, '2026-11', 3],
      [7, 730, 825, 95, 8, 760, '2026-11', 3],
      [8, 1440, 1570, 130, 8, 1040, '2026-11', 3],
      [9, 1350, 1460, 110, 8, 880, '2026-11', 3],
    ];

    for (const e of elecRows) {
      await tx.execute(
        `INSERT INTO electricity_bills
         (room_id, previous_reading, current_reading, units_consumed, rate_per_unit, total_amount, billing_month, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        e
      );
    }

    // Rent Payments across Aug, Sep, Oct, Nov 2026
    const augTenants = tenants.slice(0, 9);
    for (const t of augTenants) {
      await tx.execute(
        `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
         VALUES (?, ?, 450, 0, '2026-08', '2026-08-06 11:30:00', 'PAID', 'UPI (Demo)', ?)`,
        [t[0], t[4], `TXN-202608-${String(t[0]).padStart(3, '0')}`]
      );
    }

    const sepTenants = tenants.slice(0, 12);
    for (const t of sepTenants) {
      await tx.execute(
        `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
         VALUES (?, ?, 480, 0, '2026-09', '2026-09-05 14:20:00', 'PAID', 'UPI (Demo)', ?)`,
        [t[0], t[4], `TXN-202609-${String(t[0]).padStart(3, '0')}`]
      );
    }

    const octShares: Record<number, number> = {
      1: 400, 2: 400, 3: 400, 4: 520, 5: 520, 6: 480, 7: 480, 8: 640, 9: 640,
      10: 880, 11: 440, 12: 440, 13: 720, 14: 960, 15: 800,
    };
    for (const t of tenants) {
      await tx.execute(
        `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
         VALUES (?, ?, ?, 0, '2026-10', '2026-10-05 12:00:00', 'PAID', ?, ?)`,
        [
          t[0],
          t[4],
          octShares[t[0]] || 450,
          t[0] % 3 === 0 ? 'Bank Transfer' : 'UPI (Demo)',
          `TXN-202610-${String(t[0]).padStart(3, '0')}`,
        ]
      );
    }

    const novPendingSet = new Set([1, 5, 9, 12, 15]);
    const novShares: Record<number, number> = {
      1: 400, 2: 400, 3: 400, 4: 560, 5: 560, 6: 500, 7: 500, 8: 720, 9: 720,
      10: 960, 11: 460, 12: 460, 13: 760, 14: 1040, 15: 880,
    };
    for (const t of tenants) {
      const isPending = novPendingSet.has(t[0]);
      await tx.execute(
        `INSERT INTO rent_payments (tenant_id, amount, electricity_share, other_charges, payment_month, payment_date, payment_status, payment_method, transaction_id)
         VALUES (?, ?, ?, 0, '2026-11', ?, ?, ?, ?)`,
        [
          t[0],
          t[4],
          novShares[t[0]] || 500,
          isPending ? null : '2026-11-04 11:15:00',
          isPending ? 'PENDING' : 'PAID',
          isPending ? 'Pending' : (t[0] % 2 === 0 ? 'UPI (Demo)' : 'Card (Demo)'),
          isPending
            ? `INV-202611-${String(t[0]).padStart(3, '0')}`
            : `TXN-202611-${String(t[0]).padStart(3, '0')}`,
        ]
      );
    }

    // Complaints
    const complaints: Array<[string, number, number, string, string, string, string, string, string, string | null]> = [
      ['CMP-2026-001', 1, 1, 'Wi-Fi', 'Intermittent Wi-Fi drops in Room 101', 'Router signal drops every evening between 8 PM and 10 PM near Bed A.', '2026-11-10', 'IN_PROGRESS', 'HIGH', 'Technician scheduled to replace dual-band access point on Floor 1.'],
      ['CMP-2026-002', 4, 2, 'Water', 'Low hot water pressure in morning hours', 'Solar geyser outlet flow is slow in bathroom attached to Room 102.', '2026-11-12', 'PENDING', 'MEDIUM', null],
      ['CMP-2026-003', 8, 4, 'Electricity', 'AC stabilizer making humming sound', 'Stabilizer unit mounted near Bed B vibrates when compressor turns on.', '2026-11-04', 'RESOLVED', 'MEDIUM', 'Replaced stabilizer relay and tightened wall bracket.'],
      ['CMP-2026-004', 10, 5, 'Furniture', 'Study chair caster wheel broken', 'One wheel on the ergonomic study chair for Bed B-105-A came loose.', '2026-11-14', 'PENDING', 'LOW', null],
      ['CMP-2026-005', 2, 1, 'Cleaning', 'Balcony drain cleaning required', 'Dry leaves blocking rainwater outlet on Room 101 balcony.', '2026-11-08', 'RESOLVED', 'LOW', 'Housekeeping cleared drain and sanitized balcony floor.'],
    ];

    for (const c of complaints) {
      await tx.execute(
        `INSERT INTO complaints (complaint_code, tenant_id, room_id, category, title, description, complaint_date, status, priority, resolution_remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }

    // Weekly Food Menu (7 days * 4 meals)
    const menuRows: Array<[string, string, string]> = [
      ['Monday', 'Breakfast', 'Idli, Medu Vada, Sambar, Coconut Chutney, Filter Coffee / Tea'],
      ['Monday', 'Lunch', 'Steamed Rice, Phulka, Dal Tadka, Aloo Gobi, Curd, Pickle'],
      ['Monday', 'Evening Snacks', 'Masala Poha, Ginger Tea'],
      ['Monday', 'Dinner', 'Chapati, Paneer Butter Masala, Jeera Rice, Green Salad'],
      ['Tuesday', 'Breakfast', 'Aloo Paratha, Curd, Mango Pickle, Masala Chai'],
      ['Tuesday', 'Lunch', 'Steamed Rice, Chapati, Rajma Masala, Bhindi Fry, Buttermilk'],
      ['Tuesday', 'Evening Snacks', 'Onion Pakoda, Mint Chutney, Tea / Coffee'],
      ['Tuesday', 'Dinner', 'Phulka, Mix Veg Kurma, Veg Pulao, Gulab Jamun'],
      ['Wednesday', 'Breakfast', 'Masala Dosa, Sambar, Tomato Chutney, Coffee / Tea'],
      ['Wednesday', 'Lunch', 'Steamed Rice, Roti, Chana Masala, Cabbage Poriyal, Curd'],
      ['Wednesday', 'Evening Snacks', 'Veg Sandwich, Tomato Ketchup, Masala Chai'],
      ['Wednesday', 'Dinner', 'Chapati, Egg Curry / Kadai Paneer, Steamed Rice, Rasam'],
      ['Thursday', 'Breakfast', 'Upma, Pongal, Vada, Chutney, Filter Coffee / Tea'],
      ['Thursday', 'Lunch', 'Steamed Rice, Phulka, Sambar, Dum Aloo, Papad, Curd'],
      ['Thursday', 'Evening Snacks', 'Samosa (2 pcs), Tamarind Chutney, Tea'],
      ['Thursday', 'Dinner', 'Chapati, Dal Makhani, Peas Pulao, Boondi Raita'],
      ['Friday', 'Breakfast', 'Poori Bhaji, Boiled Eggs / Banana, Masala Chai'],
      ['Friday', 'Lunch', 'Steamed Rice, Roti, Kadhi Pakora, Jeera Aloo, Fryums'],
      ['Friday', 'Evening Snacks', 'Sweet Corn Chaat, Lemon Tea / Coffee'],
      ['Friday', 'Dinner', 'Veg Dum Biryani, Mirchi Ka Salan, Onion Raita, Ice Cream'],
      ['Saturday', 'Breakfast', 'Chole Bhature, Pickle, Lassi / Tea'],
      ['Saturday', 'Lunch', 'Steamed Rice, Chapati, Dal Fry, Baingan Bharta, Curd'],
      ['Saturday', 'Evening Snacks', 'Bread Bajji, Coconut Chutney, Ginger Tea'],
      ['Saturday', 'Dinner', 'Phulka, Matar Paneer, Steamed Rice, Tomato Soup'],
      ['Sunday', 'Breakfast', 'Set Dosa, Vegetable Kurma, Fresh Watermelon, Filter Coffee'],
      ['Sunday', 'Lunch', 'Special Veg Pulao, Chicken Curry / Shahi Paneer, Raita, Payasam'],
      ['Sunday', 'Evening Snacks', 'Bhel Puri, Masala Chai'],
      ['Sunday', 'Dinner', 'Light Khichdi, Kadhi, Aloo Chokha, Papad'],
    ];

    for (const m of menuRows) {
      await tx.execute('INSERT INTO food_menu (day, meal_type, food_items) VALUES (?, ?, ?)', m);
    }

    // Expenses across Sep, Oct, Nov 2026
    const expenseRows: Array<[string, string, number, string]> = [
      ['Electricity Utility', 'BESCOM Commercial Power Bill - September 2026', 12400, '2026-09-12'],
      ['Groceries & Kitchen', 'September Bulk Grains & Produce Supply', 31000, '2026-09-05'],
      ['Staff Salaries', 'Cook, Housekeeping & Security Staff Wages - Sep', 30000, '2026-09-08'],
      ['Electricity Utility', 'BESCOM Commercial Power Bill - October 2026', 14200, '2026-10-12'],
      ['Groceries & Kitchen', 'October Bulk Grains & Produce Supply', 36200, '2026-10-04'],
      ['Staff Salaries', 'Cook, Housekeeping & Security Staff Wages - Oct', 32000, '2026-10-06'],
      ['Internet & Wi-Fi', 'ACT Fibernet Dual 500Mbps Lease Line - Oct', 4800, '2026-10-08'],
      ['Groceries & Kitchen', 'Monthly Bulk Grains, Dairy & Produce Supply', 38500, '2026-11-02'],
      ['Staff Salaries', 'Cook, Housekeeping & Security Staff Wages', 32000, '2026-11-05'],
      ['Internet & Wi-Fi', 'ACT Fibernet Dual 500Mbps Lease Line', 4800, '2026-11-06'],
      ['Water & Tanker', 'Municipal Water & RO Filter Servicing', 5600, '2026-11-08'],
      ['Maintenance', 'Plumbing & Electrical Preventive Servicing', 4200, '2026-11-11'],
    ];

    for (const exp of expenseRows) {
      await tx.execute(
        'INSERT INTO expenses (category, description, amount, expense_date) VALUES (?, ?, ?, ?)',
        exp
      );
    }

    // Notifications
    const notifRows: Array<[number, string, string]> = [
      [4, 'Your November 2026 rent & electricity invoice (₹ 8,900) is ready for payment.', 'UNREAD'],
      [4, 'Complaint CMP-2026-001 status updated to In Progress by Manager Suresh Nair.', 'UNREAD'],
      [5, 'Thank you! Payment TXN-202611-002 for ₹ 8,900 has been confirmed.', 'READ'],
      [2, 'New complaint CMP-2026-004 logged by Devansh Gupta in Room 105.', 'UNREAD'],
      [1, 'November 2026 monthly collection has reached ₹ 95,660 across 10 paid tenants.', 'UNREAD'],
    ];

    for (const n of notifRows) {
      await tx.execute(
        'INSERT INTO notifications (user_id, message, status) VALUES (?, ?, ?)',
        n
      );
    }

    // Audit logs
    await tx.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [2, 'RECORD_ELECTRICITY_BILL', 'electricity_bills', '19', 'Recorded Nov 2026 meter reading for Room 101 (1200 -> 1350, 150 units)']
    );
    await tx.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [2, 'UPDATE_COMPLAINT_STATUS', 'complaints', '1', 'Changed CMP-2026-001 from PENDING to IN_PROGRESS']
    );
    await tx.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [1, 'SYSTEM_SEED', 'system', 'comfort_stay', 'Initialized Comfort Stay PG database with 10 rooms and 40 beds']
    );
  });

  return true;
}
