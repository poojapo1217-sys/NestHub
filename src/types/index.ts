export type UserRole = 'TENANT' | 'MANAGER' | 'OWNER';

export interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  tenant_id?: number | null;
  tenant_code?: string | null;
  unread_notifications?: number;
  tenant_profile?: TenantProfile | null;
}

export interface TenantProfile {
  tenant_id: number;
  tenant_code: string;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  joining_date: string;
  monthly_rent: number;
  emergency_contact: string;
  address: string;
  status: 'ACTIVE' | 'CHECKED_OUT';
  bed_id?: number | null;
  bed_number?: string | null;
  room_id?: number | null;
  room_number?: string | null;
  floor?: number | null;
  room_type?: string | null;
  deposit_amount?: number | null;
  deposit_status?: string | null;
  refund_amount?: number | null;
}

export interface BedItem {
  bed_id: number;
  room_id: number;
  bed_number: string;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
  room_number: string;
  floor: number;
  room_type: string;
  tenant_id?: number | null;
  tenant_code?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
  monthly_rent?: number | null;
  joining_date?: string | null;
}

export interface RoomWithBeds {
  room_id: number;
  room_number: string;
  floor: number;
  room_type: string;
  total_beds: number;
  beds: BedItem[];
}

export interface RentPayment {
  payment_id: number;
  tenant_id: number;
  tenant_code?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_email?: string;
  room_number?: string | null;
  bed_number?: string | null;
  amount: number;
  electricity_share: number;
  other_charges: number;
  total_amount: number;
  payment_month: string;
  payment_date: string | null;
  payment_status: 'PAID' | 'PENDING' | 'FAILED';
  payment_method: string;
  transaction_id: string;
}

export interface ElectricityBill {
  bill_id: number;
  room_id: number;
  room_number: string;
  floor?: number;
  room_type?: string;
  previous_reading: number;
  current_reading: number;
  units_consumed: number;
  rate_per_unit: number;
  total_amount: number;
  billing_month: string;
  recorded_by?: number | null;
  recorded_by_name?: string | null;
  active_occupants?: number;
  created_at: string;
}

export interface Complaint {
  complaint_id: number;
  complaint_code: string;
  tenant_id: number;
  tenant_code?: string;
  tenant_name?: string;
  tenant_phone?: string;
  room_id: number | null;
  room_number?: string | null;
  category: 'Electricity' | 'Water' | 'Wi-Fi' | 'Cleaning' | 'Furniture' | 'Maintenance' | 'Other';
  title: string;
  description: string;
  complaint_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  resolution_remarks: string | null;
}

export interface FoodMenuItem {
  menu_id: number;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  meal_type: 'Breakfast' | 'Lunch' | 'Evening Snacks' | 'Dinner';
  food_items: string;
}

export interface DepositRecord {
  deposit_id: number;
  tenant_id: number;
  tenant_code?: string;
  tenant_name?: string;
  tenant_status?: string;
  room_number?: string | null;
  bed_number?: string | null;
  amount: number;
  deposit_date: string;
  refund_amount: number;
  status: 'HELD' | 'PARTIAL_REFUND' | 'REFUNDED';
}

export interface ExpenseRecord {
  expense_id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
}

export interface NotificationItem {
  notification_id: number;
  message: string;
  status: 'UNREAD' | 'READ';
  created_at: string;
}
