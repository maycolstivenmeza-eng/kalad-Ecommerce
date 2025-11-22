import { Component, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../services/cart.service';
import { Observable, firstValueFrom, map } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { Product } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  cartItems$: Observable<CartItem[]> = this.cartService.items$;
  cartCount$ = this.cartService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.qty, 0))
  );
  cartTotal$ = this.cartService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.qty * item.precio, 0))
  );
  favorites$ = this.favoritesService.favorites$;
  favoritesCount$ = this.favoritesService.favorites$.pipe(
    map((items) => items.length)
  );
  isLoggedIn$ = this.authService.isLoggedIn$;

  cartOpen = false;
  cartDrawerOpen = false;
  showSearch = false;
  searchTerm = '';
  searchLoading = false;
  searchResults: Product[] = [];
  allProducts: Product[] = [];
  favoritesOpen = false;
  authMenuOpen = false;

  constructor(
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private authService: AuthService,
    private router: Router,
    private productService: ProductService
  ) {}

  toggleCart(event: Event) {
    event.stopPropagation();
    this.cartOpen = !this.cartOpen;
    if (this.cartOpen) {
      this.favoritesOpen = false;
      this.cartDrawerOpen = false;
      this.authMenuOpen = false;
      this.showSearch = false;
    }
  }

  toggleFavorites(event: Event) {
    event.stopPropagation();
    this.favoritesOpen = !this.favoritesOpen;
    if (this.favoritesOpen) {
      this.cartOpen = false;
      this.cartDrawerOpen = false;
      this.authMenuOpen = false;
      this.showSearch = false;
    }
  }

  toggleAuthMenu(event: Event) {
    event.stopPropagation();
    this.authMenuOpen = !this.authMenuOpen;
    if (this.authMenuOpen) {
      this.cartOpen = false;
      this.cartDrawerOpen = false;
      this.favoritesOpen = false;
      this.showSearch = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-cart') && !target.closest('.header-fav') && !target.closest('.header-auth') && !target.closest('.search-layer') && !target.closest('.floating-cart')) {
      this.cartOpen = false;
      this.cartDrawerOpen = false;
      this.favoritesOpen = false;
      this.authMenuOpen = false;
      this.showSearch = false;
    }
  }

  goToCart() {
    this.cartOpen = false;
    this.cartDrawerOpen = false;
    this.router.navigate(['/cart']);
  }

  async goToCheckout() {
    this.cartOpen = false;
    this.cartDrawerOpen = false;
    const logged = await this.ensureLoggedIn();
    if (!logged) return;
    this.router.navigate(['/checkout']);
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.id, item.color);
  }

  async removeFavorite(id?: string) {
    const logged = await this.ensureLoggedIn();
    if (!logged) return;
    this.favoritesService.remove(id);
  }

  goToProduct(id?: string) {
    if (!id) return;
    this.favoritesOpen = false;
    this.router.navigate(['/products', id]);
  }

  toggleSearch(event: Event) {
    event.stopPropagation();
    this.showSearch = !this.showSearch;
    if (this.showSearch && !this.allProducts.length) {
      this.loadProductsForSearch();
    }
  }

  private loadProductsForSearch() {
    this.searchLoading = true;
    this.productService.getAllProducts().subscribe({
      next: (prods) => {
        this.allProducts = prods;
        this.searchLoading = false;
        this.filterSearch();
      },
      error: () => {
        this.searchLoading = false;
      }
    });
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.filterSearch();
  }

  private filterSearch() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.searchResults = this.allProducts.slice(0, 6);
      return;
    }

    this.searchResults = this.allProducts
      .filter((p) =>
        [p.nombre, p.descripcion, p.coleccion, p.categoria]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term))
      )
      .slice(0, 6);
  }

  goToSearchResult(productId: string) {
    if (!productId) return;
    this.showSearch = false;
    this.searchTerm = '';
    this.cartOpen = false;
    this.cartDrawerOpen = false;
    this.router.navigate(['/products', productId]);
  }

  toggleCartDrawer(event: Event) {
    event.stopPropagation();
    this.cartDrawerOpen = !this.cartDrawerOpen;
    if (this.cartDrawerOpen) {
      this.cartOpen = false;
      this.favoritesOpen = false;
      this.authMenuOpen = false;
      this.showSearch = false;
    }
  }

  calcTotal(items: CartItem[]): number {
    return items.reduce((acc, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.precio) || 0;
      return acc + qty * price;
    }, 0);
  }

  private async ensureLoggedIn(): Promise<boolean> {
    const already = await firstValueFrom(this.authService.isLoggedIn$);
    if (already) return true;
    try {
      await this.authService.loginWithGoogle();
      return true;
    } catch (e) {
      console.warn('Login cancelado o fallido', e);
      return false;
    }
  }

  async loginWithGoogle(event?: Event) {
    event?.stopPropagation();
    try {
      await this.authService.loginWithGoogle();
      this.authMenuOpen = false;
    } catch (e) {
      console.warn('Login cancelado o fallido', e);
    }
  }

  async logout(event?: Event) {
    event?.stopPropagation();
    await this.authService.logout();
    this.authMenuOpen = false;
  }
}

