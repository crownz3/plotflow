import { Injectable, signal, computed, inject } from '@angular/core';
import { Expense } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private auth = inject(AuthService);

  private readonly initialExpenses: Expense[] = [
    {
      id: 'exp_01',
      tenantId: 'tenant_prime_properties',
      title: '99acres & MagicBricks Featured Listings (Monthly)',
      category: 'portal_listing_fee',
      amount: 45000,
      date: Date.now() - 86400000 * 12,
      loggedBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 12
    },
    {
      id: 'exp_02',
      tenantId: 'tenant_prime_properties',
      title: 'Site Visit Fuel & Car Rental Reimbursements',
      category: 'travel_fuel',
      amount: 18500,
      date: Date.now() - 86400000 * 5,
      loggedBy: 'user_agent_01',
      createdAt: Date.now() - 86400000 * 5
    },
    {
      id: 'exp_03',
      tenantId: 'tenant_prime_properties',
      title: 'ECR Penthouse Drone Video Shoot & Staging',
      category: 'marketing',
      amount: 25000,
      date: Date.now() - 86400000 * 7,
      loggedBy: 'user_admin_01',
      createdAt: Date.now() - 86400000 * 7
    }
  ];

  readonly allExpenses = signal<Expense[]>(this.initialExpenses);

  readonly tenantExpenses = computed(() => {
    const tId = this.auth.activeTenantId();
    return this.allExpenses().filter(e => e.tenantId === tId);
  });

  readonly totalExpenses = computed(() =>
    this.tenantExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const newExp: Expense = {
      ...data,
      id: `exp_${Date.now()}`,
      createdAt: Date.now()
    };
    this.allExpenses.update(list => [newExp, ...list]);
    return newExp;
  }
}

