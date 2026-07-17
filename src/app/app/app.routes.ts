import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'productos', pathMatch: 'full' },
    { path: 'registrarse', loadComponent: () => import('../componentes/registrarse/registrarse').then(m => m.RegistrarseComponent) },
    { path: 'login', loadComponent: () => import('../componentes/login/login').then(m => m.LoginComponent) },
    { path: 'favoritos', loadComponent: () => import('../componentes/favoritos/favoritos').then(m => m.FavoritosComponent) },
    
    // CORRECCIÓN AQUÍ: 'productos' en lugar de 'produtos'
    { path: 'productos', loadComponent: () => import('../componentes/productos/productos').then(m => m.ProductosComponent) },
    { path: 'productos/:categoria', loadComponent: () => import('../componentes/productos/productos').then(m => m.ProductosComponent) },
    
    { path: 'lista-compras', loadComponent: () => import('../componentes/lista-compras/lista-compras').then(m => m.ListaComprasComponente) },
    { path: '**', redirectTo: 'productos' }
];