import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {

  // ======== Datos desde Firebase ========
  products: Product[] = [];
  productosFiltrados: Product[] = [];

  // ======== Ordenamiento ========
  orden: 'az' | 'za' | 'priceAsc' | 'priceDesc' | 'new' = 'az';

  // ======== Filtros ========
  filtroCategoria: string = '';
  filtroTalla: string = '';
  filtroColor: string = '';

  // ======== Valores del sidebar ========
  tallas: string[] = ['S', 'M', 'L', 'XL'];
  
  colores = [
    { id: 'beige', label: 'Beige', hex: '#d8c8a8' },
    { id: 'cafe', label: 'Café', hex: '#6a4e3a' },
    { id: 'negro', label: 'Negro', hex: '#000' },
    { id: 'arena', label: 'Arena', hex: '#e8e0c8' }
  ];

  categorias = ['Mochilas', 'Bolsas', 'Morrales', 'Zapatos'];

  loading = true;
  error: string | null = null;
  private placeholderImage = 'assets/images/Producto_1.jpg';

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  // =======================
  //      CARGAR DATA
  // =======================
  loadProducts(): void {
    this.loading = true;
    this.error = null;

    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.productosFiltrados = [...products];
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.error = 'Error al cargar los productos.';
        this.loading = false;
      }
    });
  }

  // =======================
  //      ORDENAR
  // =======================
  onOrderChange(order: any) {
    this.orden = order;
    this.aplicarFiltros();
  }

  private ordenarLista(lista: Product[]) {
    switch (this.orden) {
      case 'az':
        return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
      case 'za':
        return lista.sort((a, b) => b.nombre.localeCompare(a.nombre));
      case 'priceAsc':
        return lista.sort((a, b) => a.precio - b.precio);
      case 'priceDesc':
        return lista.sort((a, b) => b.precio - a.precio);
      case 'new':
        return lista.sort((a, b) => {
          const dateA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
          const dateB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
          return dateB - dateA;
        });
      default:
        return lista;
    }
  }

  // =======================
  //      APLICAR FILTROS
  // =======================
  aplicarFiltros() {
    let lista = [...this.products];

    // FILTRO CATEGORÍA
    if (this.filtroCategoria) {
      lista = lista.filter((p) => p.categoria === this.filtroCategoria);
    }

    // FILTRO COLOR (si el producto trae colores)
    if (this.filtroColor) {
      lista = lista.filter((p) => p.colores?.includes(this.filtroColor));
    }

    // FILTRO TALLA (si existiera más adelante)
    if (this.filtroTalla) {
      // por ahora no se usa porque tus mochilas no manejan tallas
    }

    // ORDENAMIENTO
    lista = this.ordenarLista(lista);

    this.productosFiltrados = lista;
  }

  // =======================
  //    SETTERS DE FILTROS
  // =======================
  setFiltroCategoria(categoria: string) {
    this.filtroCategoria = categoria;
    this.aplicarFiltros();
  }

  setFiltroTalla(talla: string) {
    this.filtroTalla = talla;
    this.aplicarFiltros();
  }

  setFiltroColor(color: string) {
    this.filtroColor = color;
    this.aplicarFiltros();
  }

  // =======================
  //  Ver detalles del producto
  // =======================
  viewProductDetails(productId: string): void {
    this.router.navigate(['/products', productId]);
  }

  // =======================
  //  Carrito (prueba)
  // =======================
  addToCart(product: Product) {
    alert(`${product.nombre} agregado al carrito`);
  }

  resolveImage(product: Product): string {
    return product.imagen && product.imagen.trim().length > 0
      ? product.imagen
      : this.placeholderImage;
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (target && !target.src.includes(this.placeholderImage)) {
      target.src = this.placeholderImage;
    }
  }

  // Formatear precio
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }
}
