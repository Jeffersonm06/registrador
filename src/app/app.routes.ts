import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'clients',
    loadComponent: () => import('./clients/clients.page').then( m => m.ClientsPage)
  },
  {
    path: 'products',
    loadComponent: () => import('./products/products.page').then( m => m.ProductsPage)
  },
  {
    path: 'services',
    loadComponent: () => import('./services/services.page').then( m => m.ServicesPage)
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./suppliers/suppliers.page').then( m => m.SuppliersPage)
  },
  {
    path: 'payments',
    loadComponent: () => import('./payments/payments.page').then( m => m.PaymentsPage)
  },
];
