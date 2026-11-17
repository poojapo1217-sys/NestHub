import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../app.ts';
import { initDatabase } from '../config/db.ts';
import { ensureSeeded } from '../services/seedService.ts';

async function runTests() {
  await initDatabase();
  await ensureSeeded(true);

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function req(path: string, options: RequestInit = {}, token?: string) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, data };
  }

  try {
    // 1. Owner Login
    const ownerLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'owner@comfortstay.in', password: 'Owner@123' }),
    });
    assert.equal(ownerLogin.status, 200, 'Owner login should succeed');
    const ownerToken = ownerLogin.data.token as string;

    // 2. Manager Login
    const mgrLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'manager@comfortstay.in', password: 'Manager@123' }),
    });
    assert.equal(mgrLogin.status, 200, 'Manager login should succeed');
    const mgrToken = mgrLogin.data.token as string;

    // 3. Tenant Login
    const tenantLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'tenant@comfortstay.in', password: 'Tenant@123' }),
    });
    assert.equal(tenantLogin.status, 200, 'Tenant login should succeed');
    const tenantToken = tenantLogin.data.token as string;

    // 4. Incorrect Password
    const badLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'owner@comfortstay.in', password: 'WrongPassword' }),
    });
    assert.equal(badLogin.status, 401, 'Invalid password must return 401');

    // 5. Unauthorized Page / API Access
    const unauthOwner = await req('/dashboard/owner', {}, tenantToken);
    assert.equal(unauthOwner.status, 403, 'Tenant accessing owner dashboard must return 403');
    const unauthNoToken = await req('/tenants');
    assert.equal(unauthNoToken.status, 401, 'Unauthenticated request must return 401');

    // 6 & 7. New Tenant Registration + Bed Allocation
    const vacantBefore = await req('/beds/vacant', {}, mgrToken);
    const vacantBeds = vacantBefore.data.vacant_beds as Array<{ bed_id: number; bed_number: string }>;
    assert.ok(vacantBeds.length > 0, 'Should have vacant beds available');
    const targetBed = vacantBeds[0];

    const newTenantRes = await req(
      '/tenants',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Resident',
          email: 'test.resident@comfortstay.in',
          phone: '9845099887',
          emergency_contact: '9811199887',
          bed_id: targetBed.bed_id,
          joining_date: '2026-11-17',
          monthly_rent: 8500,
          security_deposit: 15000,
          address: 'Bengaluru, Karnataka',
        }),
      },
      mgrToken
    );
    assert.equal(newTenantRes.status, 201, 'New tenant registration should succeed');
    const createdTenant = newTenantRes.data.tenant as { tenant_id: number };

    // 8. Duplicate Bed Allocation Prevention
    const dupBedRes = await req(
      '/tenants',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate Bed Tester',
          email: 'dup.bed@comfortstay.in',
          phone: '9845099888',
          emergency_contact: '9811199888',
          bed_id: targetBed.bed_id,
          joining_date: '2026-11-17',
          monthly_rent: 8500,
          security_deposit: 15000,
        }),
      },
      mgrToken
    );
    assert.equal(dupBedRes.status, 409, 'Assigning an occupied bed must return 409 Conflict');

    // 9. Rent Payment Recording (Demo Payment)
    const tenantRentList = await req('/rent', {}, tenantToken);
    const pendingInv = (tenantRentList.data.payments as Array<{ payment_id: number; payment_status: string }>).find(
      (p) => p.payment_status === 'PENDING'
    );
    assert.ok(pendingInv, 'Tenant should have a pending invoice');
    const payRes = await req(
      '/rent',
      {
        method: 'POST',
        body: JSON.stringify({ payment_id: pendingInv.payment_id, payment_method: 'UPI (Demo)' }),
      },
      tenantToken
    );
    assert.equal(payRes.status, 200, 'Tenant demo payment should succeed');

    // 10. Electricity Calculation (Room 1010 / 10 in Dec 2026: 1000 -> 1150 @ ₹8 = 150 units = ₹1200)
    const elecRes = await req(
      '/electricity',
      {
        method: 'POST',
        body: JSON.stringify({
          room_id: 10,
          billing_month: '2026-11',
          previous_reading: 1200,
          current_reading: 1350,
          rate_per_unit: 8,
        }),
      },
      mgrToken
    );
    assert.equal(elecRes.status, 201, 'Electricity reading should succeed');
    const elecBill = elecRes.data.bill as { units_consumed: number; total_amount: number };
    assert.equal(elecBill.units_consumed, 150);
    assert.equal(elecBill.total_amount, 1200);

    // 11. Invalid Meter Reading (current < previous)
    const badElec = await req(
      '/electricity',
      {
        method: 'POST',
        body: JSON.stringify({
          room_id: 10,
          billing_month: '2026-12',
          previous_reading: 1500,
          current_reading: 1400,
          rate_per_unit: 8,
        }),
      },
      mgrToken
    );
    assert.equal(badElec.status, 400, 'Current reading < previous reading must return 400');

    // 12 & 13. Complaint Registration + Status Update
    const cmpCreate = await req(
      '/complaints',
      {
        method: 'POST',
        body: JSON.stringify({
          category: 'Wi-Fi',
          title: 'Test Wi-Fi issue',
          description: 'Slow speed in evening.',
          room_number: '101',
          priority: 'HIGH',
        }),
      },
      tenantToken
    );
    assert.equal(cmpCreate.status, 201, 'Complaint creation should succeed');
    const cmpObj = cmpCreate.data.complaint as { complaint_id: number };

    const cmpUpdate = await req(
      `/complaints/${cmpObj.complaint_id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'RESOLVED', resolution_remarks: 'Router restarted.' }),
      },
      mgrToken
    );
    assert.equal(cmpUpdate.status, 200, 'Complaint status update should succeed');

    // 14 & 15. Tenant Checkout + Vacant Bed Update
    const checkoutRes = await req(
      `/tenants/${createdTenant.tenant_id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          action: 'CHECKOUT',
          check_out_date: '2026-11-18',
          refund_amount: 15000,
        }),
      },
      mgrToken
    );
    assert.equal(checkoutRes.status, 200, 'Tenant checkout should succeed');

    const vacantAfter = await req('/beds/vacant', {}, ownerToken);
    const freed = (vacantAfter.data.vacant_beds as Array<{ bed_id: number }>).some(
      (b) => b.bed_id === targetBed.bed_id
    );
    assert.ok(freed, 'Checked-out tenant bed must immediately become VACANT');

    // 16. Financial Dashboard Calculations
    const ownerDash = await req('/dashboard/owner?month=2026-11', {}, ownerToken);
    assert.equal(ownerDash.status, 200, 'Owner financial dashboard should succeed');
    const kpis = ownerDash.data.kpis as {
      monthlyRentCollected: number;
      totalIncome: number;
      totalExpenses: number;
      netIncome: number;
    };
    assert.equal(
      kpis.netIncome,
      Number((kpis.totalIncome - kpis.totalExpenses).toFixed(2)),
      'Net income must equal Total Income - Total Expenses'
    );

    console.log('ALL 16 INTEGRATION TESTS PASSED!');
  } finally {
    // Re-seed clean state after tests
    await ensureSeeded(true);
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
