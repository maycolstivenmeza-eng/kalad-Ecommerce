import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/models/product.model';
import { CartService } from '../../shared/services/cart.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { AuthService } from '../../shared/services/auth.service';
import { firstValueFrom } from 'rxjs';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit {
  featuredProducts: Product[] = [];
  loading: boolean = true;
  private placeholderImage = 'assets/images/Producto_1.jpg';
  imageLoaded: Record<string, boolean> = {};

  constructor(
    private productService: ProductService,
    private router: Router,
    private cartService: CartService,
    public favorites: FavoritesService,
    private authService: AuthService,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Kalad | Mochilas artesanales');
    this.meta.updateTag({
      name: 'description',
      content: 'Explora las mochilas artesanales de Kalad. Colecciones Origen y Essencia, hechas a mano en Colombia.'
    });
    this.loadFeaturedProducts();
  }

  loadFeaturedProducts(): void {
    this.loading = true;
    this.productService.getFeaturedProducts().subscribe({
      next: (productos) => {
        this.aplicarFallbackDestacados(productos);
      },
      error: (err) => {
        console.error('Error al cargar productos destacados:', err);
        this.cargarTodosComoBackup();
      }
    });
  }

  private aplicarFallbackDestacados(destacados: Product[]): void {
    const iniciales = destacados.slice(0, 8);
    if (iniciales.length === 8) {
      this.featuredProducts = iniciales;
      this.loading = false;
      return;
    }

    this.productService.getAllProducts().subscribe({
      next: (todos) => {
        const extras = todos.filter(
          (prod) => !iniciales.some((item) => item.id === prod.id)
        );
        this.featuredProducts = [...iniciales, ...extras].slice(0, 8);
        this.loading = false;
      },
      error: () => {
        this.featuredProducts = iniciales;
        this.loading = false;
      },
    });
  }

  private cargarTodosComoBackup(): void {
    this.productService.getAllProducts().subscribe({
      next: (productos) => {
        this.featuredProducts = productos.slice(0, 8);
        this.loading = false;
      },
      error: () => {
        this.featuredProducts = [];
        this.loading = false;
      },
    });
  }

  viewProductDetails(productId: string): void {
    this.router.navigate(['/products', productId]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  onImageLoad(productId: string) {
    this.imageLoaded[productId] = true;
  }

  onImageError(productId: string, event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (target && !target.src.includes(this.placeholderImage)) {
      target.src = this.placeholderImage;
    }
    this.imageLoaded[productId] = true;
  }

  trackById(_index: number, product: Product) {
    return product.id;
  }

  resolveImage(product: Product): string {
    return product.imagen && product.imagen.trim().length > 0
      ? product.imagen
      : this.placeholderImage;
  }

  addToCart(product: Product, event?: Event) {
    event?.stopPropagation();
    this.cartService.addProduct(product, 1);
  }

  toggleFavorite(product: Product, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.ensureLoggedInAndToggle(product);
  }

  private async ensureLoggedInAndToggle(product: Product) {
    const logged = await firstValueFrom(this.authService.isLoggedIn$);
    try {
      if (!logged) {
        await this.authService.loginWithGoogle();
      }
      const now = await firstValueFrom(this.authService.isLoggedIn$);
      if (now) this.favorites.toggle(product);
    } catch (e) {
      console.warn('No se pudo iniciar sesión para favoritos', e);
    }
  }
}
