import { Router } from 'express';
import { forgotPassword, getMe, login, logout } from '../controllers/authController.ts';
import { listBeds, listVacantBeds, updateBedStatus } from '../controllers/bedController.ts';
import { createComplaint, listComplaints, updateComplaint } from '../controllers/complaintController.ts';
import {
  getManagerDashboard,
  getOwnerDashboard,
  getTenantDashboard,
  markNotificationsRead,
} from '../controllers/dashboardController.ts';
import { createOrRefundDeposit, listDeposits } from '../controllers/depositController.ts';
import {
  correctElectricityBill,
  createElectricityBill,
  getElectricityBillById,
  listElectricityBills,
} from '../controllers/electricityController.ts';
import { createExpense, listExpenses } from '../controllers/expenseController.ts';
import { listFoodMenu, updateFoodMenuById, upsertFoodMenu } from '../controllers/menuController.ts';
import { createOrProcessRentPayment, getRentPaymentById, listRentPayments } from '../controllers/rentController.ts';
import {
  createTenant,
  downloadTenantDocument,
  getTenantById,
  listTenants,
  updateTenant,
} from '../controllers/tenantController.ts';
import { authenticate, authorize } from '../middleware/auth.ts';
import { documentUpload } from '../middleware/upload.ts';

export const apiRouter = Router();

// Authentication
apiRouter.post('/auth/login', login);
apiRouter.post('/auth/logout', authenticate, logout);
apiRouter.get('/auth/me', authenticate, getMe);
apiRouter.post('/auth/forgot-password', forgotPassword);

// Notifications
apiRouter.post('/notifications/read-all', authenticate, markNotificationsRead);

// Dashboards
apiRouter.get('/dashboard/tenant', authenticate, authorize('TENANT'), getTenantDashboard);
apiRouter.get('/dashboard/manager', authenticate, authorize('MANAGER', 'OWNER'), getManagerDashboard);
apiRouter.get('/dashboard/owner', authenticate, authorize('OWNER'), getOwnerDashboard);

// Tenants
apiRouter.get('/tenants', authenticate, authorize('MANAGER', 'OWNER'), listTenants);
apiRouter.post(
  '/tenants',
  authenticate,
  authorize('MANAGER', 'OWNER'),
  documentUpload.single('document'),
  createTenant
);
apiRouter.get('/tenants/:id', authenticate, getTenantById);
apiRouter.put('/tenants/:id', authenticate, authorize('MANAGER', 'OWNER'), updateTenant);
apiRouter.get('/tenants/:id/documents/:docId', authenticate, downloadTenantDocument);

// Beds & Rooms
apiRouter.get('/beds', authenticate, authorize('MANAGER', 'OWNER'), listBeds);
apiRouter.get('/beds/vacant', authenticate, authorize('MANAGER', 'OWNER'), listVacantBeds);
apiRouter.put('/beds/:id/status', authenticate, authorize('MANAGER', 'OWNER'), updateBedStatus);

// Rent Payments
apiRouter.get('/rent', authenticate, listRentPayments);
apiRouter.post('/rent', authenticate, createOrProcessRentPayment);
apiRouter.get('/rent/:id', authenticate, getRentPaymentById);

// Electricity Bills
apiRouter.get('/electricity', authenticate, listElectricityBills);
apiRouter.post('/electricity', authenticate, authorize('MANAGER', 'OWNER'), createElectricityBill);
apiRouter.put('/electricity/:id', authenticate, authorize('MANAGER', 'OWNER'), correctElectricityBill);
apiRouter.get('/electricity/:id', authenticate, getElectricityBillById);

// Complaints
apiRouter.get('/complaints', authenticate, listComplaints);
apiRouter.post('/complaints', authenticate, createComplaint);
apiRouter.put('/complaints/:id', authenticate, authorize('MANAGER', 'OWNER'), updateComplaint);

// Security Deposits
apiRouter.get('/deposits', authenticate, listDeposits);
apiRouter.post('/deposits', authenticate, authorize('OWNER', 'MANAGER'), createOrRefundDeposit);

// Weekly Food Menu
apiRouter.get('/menu', authenticate, listFoodMenu);
apiRouter.post('/menu', authenticate, authorize('MANAGER', 'OWNER'), upsertFoodMenu);
apiRouter.put('/menu/:id', authenticate, authorize('MANAGER', 'OWNER'), updateFoodMenuById);

// Expenses
apiRouter.get('/expenses', authenticate, authorize('OWNER', 'MANAGER'), listExpenses);
apiRouter.post('/expenses', authenticate, authorize('OWNER', 'MANAGER'), createExpense);
