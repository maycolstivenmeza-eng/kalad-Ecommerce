import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';


import { Product } from '../../shared/models/product.model';
import { ProductService } from '../../shared/services/product.service';

interface HighlightInfo {
  icon: string;
  title: string;
  description: string;
}

interface AssuranceInfo {
  title: string;
  description: string;
}

interface ReviewInfo {
  name: string;
  location: string;
  date: string;
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-details-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule   // ⭐ YA SIN ERRORES
  ],
  templateUrl: './details-products.component.html',
  styleUrl: './details-products.component.css'
})

export class DetailsProductsComponent implements OnInit, OnDestroy {
toggleFavorite() {
throw new Error('Method not implemented.');
}
inc() {
throw new Error('Method not implemented.');
}
qty: any;
dec() {
throw new Error('Method not implemented.');
}
colorSwatch(_t37: string) {
throw new Error('Method not implemented.');
}
money(arg0: number) {
throw new Error('Method not implemented.');
}
pickThumb(_t22: any) {
throw new Error('Method not implemented.');
}
  product?: Product;
  selectedImage: string = '';

  selectedColor: string = '';
  quantity: number = 1;

  thumbnailImages: string[] = [];

  private sub?: Subscription;

  // Dimensiones por defecto si el producto no las tiene
  readonly defaultDimensions: Product['dimensiones'] = {
    alto: '18 cm',
    ancho: '22 cm',
    profundidad: '7 cm',
    capacidad: '4 L',
  };

  displayDimensions: Product['dimensiones'] = this.defaultDimensions;

  readonly stars = Array(5).fill(0);

  // =======================
  // INFO ADICIONAL / PROTOTIPO
  // =======================
  readonly highlightInfo: HighlightInfo[] = [
    {
      icon: '🌊',
      title: 'Hecha a mano',
      description: 'Cada pieza es trabajada por artesanas colombianas del Caribe.',
    },
    {
      icon: '🧵',
      title: 'Fibras naturales',
      description: 'Tejida con fibras vegetales curadas para mayor resistencia.',
    },
    {
      icon: '🎁',
      title: 'Edición limitada',
      description: 'Producciones pequeñas para asegurar exclusividad en cada entrega.',
    },
  ];

  readonly assuranceInfo: AssuranceInfo[] = [
    {
      title: 'Envío seguro',
      description: 'Empaque ecológico y seguimiento en tiempo real.',
    },
    {
      title: 'Pagos protegidos',
      description: 'Aceptamos todas las tarjetas y transferencias de forma segura.',
    },
    {
      title: 'Cambios sin costo',
      description: '10 días para cambios por diseño o talla.',
    },
  ];

  readonly careTips: string[] = [
    'Limpiar con paño húmedo y dejar secar a la sombra.',
    'Evitar contacto prolongado con agua salada o arena húmeda.',
    'Guardar en bolsa de tela para mantener su forma natural.',
  ];

  readonly reviews: ReviewInfo[] = [
    {
      name: 'Sophie Bennet',
      location: 'Cartagena, Colombia',
      date: '12 de enero 2025',
      rating: 5,
      comment:
        'La compré para mis vacaciones en Barú y es perfecta. Ligera, espaciosa y con un tejido precioso.',
    },
    {
      name: 'Mariana Ruiz',
      location: 'Medellín, Colombia',
      date: '03 de enero 2025',
      rating: 4,
      comment:
        'Los detalles bordados son hermosos y se nota la calidad. Siempre me preguntan dónde la compré.',
    },
    {
      name: 'Camila Ospina',
      location: 'Bogotá, Colombia',
      date: '28 de diciembre 2024',
      rating: 5,
      comment:
        'Llegó con una nota de la artesana. Eso la hizo aún más especial.',
    },
  ];
thumbs: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.loadProduct(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // =======================
  // CARGAR PRODUCTO
  // =======================
  loadProduct(id: string): void {
    this.productService.getProductById(id).subscribe((product) => {
      if (!product) {
        this.router.navigate(['/products']);
        return;
      }

      this.product = product;

      // Miniaturas reales
      const secundarias = product.imagenes ?? [];
      this.thumbnailImages = [product.imagen, ...secundarias];

      this.selectedImage = this.thumbnailImages[0];

      this.selectedColor = product.colores?.[0] ?? '';

      this.displayDimensions = product.dimensiones ?? this.defaultDimensions;
    });
  }

  // =======================
  // GALERIA
  // =======================
  selectImage(image: string): void {
    this.selectedImage = image;
  }

  // =======================
  // COLORES
  // =======================
  selectColor(color: string): void {
    this.selectedColor = color;
  }

  // =======================
  // CANTIDAD
  // =======================
  increment(): void {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // =======================
  // CARRITO / COMPRA
  // =======================
  addToCart(): void {
    if (!this.product) return;

    const cartKey = 'kalad_cart';
    const current = JSON.parse(localStorage.getItem(cartKey) || '[]');

    const item = {
      id: this.product.id,
      nombre: this.product.nombre,
      precio: this.product.precio,
      imagen: this.product.imagen,
      qty: this.quantity,
      color: this.selectedColor,
    };

    current.push(item);
    localStorage.setItem(cartKey, JSON.stringify(current));

    alert('Producto agregado al carrito');
  }

  buyNow(): void {
    this.addToCart();
    this.router.navigate(['/checkout']);
  }

  // =======================
  // FORMATO DE PRECIO
  // =======================
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  }
}
