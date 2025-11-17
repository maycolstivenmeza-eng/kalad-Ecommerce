import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/models/product.model';

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeaturedProducts();
  }

  loadFeaturedProducts(): void {
    this.loading = true;
    this.productService.getFeaturedProducts().subscribe({
      next: (productos) => {
        // Limitar a los primeros 4 productos destacados
        this.featuredProducts = productos.slice(0, 4);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar productos destacados:', err);
        // Si hay error, cargar todos los productos como fallback
        this.productService.getAllProducts().subscribe({
          next: (productos) => {
            this.featuredProducts = productos.slice(0, 4);
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      }
    });
  }

  viewProductDetails(productId: string): void {
    this.router.navigate(['/products', productId]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
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

  resolveImage(product: Product): string {
    return product.imagen && product.imagen.trim().length > 0
      ? product.imagen
      : this.placeholderImage;
  }
}
