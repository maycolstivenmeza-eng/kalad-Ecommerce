import { Routes } from '@angular/router';
import { adminAuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home-page.component').then(m => m.HomePageComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent)
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/details-products/details-products.component').then(m => m.DetailsProductsComponent)
  },
  {
    path: 'collections',
    loadComponent: () => import('./features/collections/collections.component').then(m => m.CollectionsComponent)
  },
  {
    path: 'collections/origen',
    loadComponent: () => import('./features/collections/origen/origen.component').then(m => m.OrigenComponent)
  },
  {
    path: 'collections/essencia',
    loadComponent: () => import('./features/collections/essencia/essencia.component').then(m => m.EssenciaComponent)
  },
  {
    path: 'admin',
    redirectTo: 'admin/login',
    pathMatch: 'full'
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'admin/productos',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./features/admin/productos/productos.component')
        .then(m => m.ProductosComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'confirmation',
    loadComponent: () => import('./features/confirmation/confirmation.component').then(m => m.ConfirmationComponent)
  },
  {
    path: 'history',
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
