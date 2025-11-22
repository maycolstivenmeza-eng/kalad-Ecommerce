import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';


import { Product } from '../../shared/models/product.model';
import { ProductService } from '../../shared/services/product.service';
import { CartService } from '../../shared/services/cart.service';
import { Title, Meta } from '@angular/platform-browser';
import { AnalyticsService } from '../../shared/services/analytics.service';

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

interface ThumbnailVariant {
  src: string;
  focus?: string;
  zoom?: number;
  virtual?: boolean;
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
  product?: Product;
  private viewTrackedId?: string;
  selectedImage: string = '';
  selectedImageStyles: { objectPosition: string; transform: string } = {
    objectPosition: 'center',
    transform: 'scale(1)',
  };

  selectedColor: string = '';
  quantity: number = 1;
  colorOptions: string[] = [];
  colorChips: { label: string; css: string }[] = [];

  thumbnailImages: ThumbnailVariant[] = [];

  private sub?: Subscription;
  selectedVariant?: ThumbnailVariant;

  // Dimensiones por defecto si el producto no las tiene
  readonly defaultDimensions: Product['dimensiones'] = {
    alto: '18 cm',
    ancho: '22 cm',
    profundidad: '7 cm',
    capacidad: '4 L',
  };

  displayDimensions: Product['dimensiones'] = this.defaultDimensions;
  readonly fallbackFeatureSuffix =
    'está elaborada con materiales artesanales locales de alta calidad. Cada pieza es trabajada a mano por artesanas colombianas, brindando un diseño elegante, fresco y duradero ideal para tus actividades diarias.';
  featureDescription = '';

  private readonly colorStopWords = new Set<string>([
    'kalad',
    'origen',
    'raiz',
    'raices',
    'coleccion',
    'colecciones',
    'coleccion',
    'coleccion',
    'coleccion-kalad',
    'coleccion-origen',
    'essencia',
    'esencia',
    'coleccionessencia',
    'linea',
    'edicion',
    'ediciones',
    'tono',
    'tonos',
    'tonalidad',
    'tonalidades',
    'color',
    'colores',
    'mezcla',
    'mix',
  ]);

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
    private productService: ProductService,
    private cartService: CartService,
    private title: Title,
    private meta: Meta,
    private analytics: AnalyticsService
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
      if (product.id && this.viewTrackedId !== product.id) {
        this.analytics.trackViewItem(product);
        this.viewTrackedId = product.id;
      }
      // SEO meta
      if (product.seoTitle) {
        this.title.setTitle(product.seoTitle);
      } else {
        this.title.setTitle(`${product.nombre} | Kalad`);
      }
      this.meta.updateTag({
        name: 'description',
        content: product.descripcionCorta || product.copyPremium || product.descripcion || 'Mochila artesanal Kalad'
      });

      this.thumbnailImages = this.buildThumbnailList(product);
      this.applySelectedVariant(this.thumbnailImages[0]);

      this.colorOptions = this.resolveColors(product);
      this.selectedColor = this.colorOptions[0] ?? '';
      this.colorChips = this.colorOptions.map((label) => ({
        label,
        css: this.resolveColorCss(label),
      }));

      this.quantity = product.stock > 0 ? 1 : 0;
      this.displayDimensions = product.dimensiones ?? this.defaultDimensions;
      this.featureDescription =
        product.copyPremium?.trim() ||
        product.caracteristicas?.trim() ||
        this.buildDefaultFeatureText(product.nombre);
    });
  }

  private buildDefaultFeatureText(nombre: string): string {
    const nombreLimpio = nombre?.trim();
    const prefijo = nombreLimpio ? `La ${nombreLimpio}` : 'La pieza';
    return `${prefijo} ${this.fallbackFeatureSuffix}`;
  }

  private buildThumbnailList(product: Product): ThumbnailVariant[] {
    const imagenes = [product.imagen, ...(product.imagenes ?? [])].filter(
      (src): src is string => typeof src === 'string' && src.length > 0
    );

    if (imagenes.length <= 1) {
      return this.generateVirtualThumbnails(imagenes[0]);
    }

    return imagenes.slice(0, 3).map((src) => ({
      src,
      focus: 'center',
      zoom: 1,
    }));
  }

  private generateVirtualThumbnails(src?: string): ThumbnailVariant[] {
    if (!src) return [];

    const presets: ThumbnailVariant[] = [
      { src, focus: 'center', zoom: 1, virtual: false },
      { src, focus: 'center top', zoom: 1.1, virtual: true },
      { src, focus: 'center bottom', zoom: 1.1, virtual: true },
      { src, focus: 'left center', zoom: 1.05, virtual: true },
      { src, focus: 'right center', zoom: 1.05, virtual: true },
    ];

    return presets.slice(0, 3);
  }

  private applySelectedVariant(variant?: ThumbnailVariant): void {
    if (!variant) return;
    this.selectedVariant = variant;
    this.selectedImage = variant.src;
    this.selectedImageStyles = {
      objectPosition: variant.focus ?? 'center',
      transform: `scale(${variant.zoom ?? 1})`,
    };
  }

  private resolveColors(product: Product): string[] {
    if (product.colores?.length) return product.colores;
    if (product.color) {
      return this.sanitizeColorString(product.color);
    }
    return [];
  }

  private sanitizeColorString(valor: string | undefined | null): string[] {
    if (!valor) return [];
    return valor
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  private resolveColorCss(colorLabel: string): string {
    const raw = colorLabel?.trim() ?? '';
    if (!raw) return this.defaultColorHex;

    if (this.isHexColor(raw) || this.isRgbColor(raw)) {
      return raw;
    }

    const slug = this.slugify(raw);
    const dictionary = this.colorDictionary;
    const synonyms = this.colorSynonyms;

    const direct = this.matchDictionary(slug, dictionary, synonyms);
    if (direct) return direct;

    const tokens = this.tokenizeSlug(slug);
    for (const token of tokens) {
      const match = this.matchDictionary(token, dictionary, synonyms);
      if (match) return match;
    }

    if (this.isNamedCssColor(raw)) {
      return raw;
    }

    return this.fallbackColorFromLabel(raw);
  }

  private matchDictionary(
    token: string,
    dict: Record<string, string>,
    synonyms: Record<string, string>
  ): string | undefined {
    if (!token || this.isColorStopWord(token)) return undefined;

    if (dict[token]) return dict[token];

    const normalized = this.normalizeGender(token);
    if (normalized && dict[normalized]) return dict[normalized];

    const stripped = this.stripPlural(token);
    if (stripped && dict[stripped]) return dict[stripped];

    const normalizedStripped =
      stripped && stripped !== normalized ? this.normalizeGender(stripped) : undefined;
    if (normalizedStripped && dict[normalizedStripped]) {
      return dict[normalizedStripped];
    }

    const synonymKey = synonyms[token] ?? synonyms[normalized ?? ''] ?? synonyms[stripped ?? ''];
    if (synonymKey && dict[synonymKey]) {
      return dict[synonymKey];
    }

    return undefined;
  }

  private normalizeGender(token: string): string | undefined {
    if (token.endsWith('as')) return token.slice(0, -2) + 'os';
    if (token.endsWith('a')) return token.slice(0, -1) + 'o';
    if (token.endsWith('es') && token.length > 2) return token.slice(0, -1);
    return undefined;
  }

  private stripPlural(token: string): string | undefined {
    if (token.endsWith('es')) return token.slice(0, -2);
    if (token.endsWith('s')) return token.slice(0, -1);
    return undefined;
  }

  private get colorDictionary(): Record<string, string> {
    return {
      negro: '#000000',
      gris: '#777777',
      'gris-oscuro': '#4a4a4a',
      'gris-claro': '#cfcfcf',
      blanco: '#ffffff',
      beige: '#d6c6a8',
      arena: '#d4b48c',
      camel: '#c4955d',
      cafe: '#5b3a29',
      marron: '#7a4b2a',
      marronoscuro: '#4f2a14',
      chocolate: '#4f2a14',
      terracota: '#b1563c',
      cobre: '#b87333',
      naranja: '#e8873a',
      salmon: '#f1906d',
      'salmon-vital': '#f06c3e',
      rojo: '#c0392b',
      vinotinto: '#7b1f29',
      magenta: '#c2185b',
      rosa: '#f4a7ba',
      fucsia: '#d63384',
      morado: '#6a1b9a',
      lila: '#b39ddb',
      turquesa: '#2cb1a1',
      aqua: '#4dc3c1',
      celeste: '#9ec9ff',
      'azul-celeste': '#9ec9ff',
      'azul-cielo': '#a6c8ff',
      cielo: '#a6c8ff',
      'azul-pastel': '#c7dbf7',
      azul: '#2a69ac',
      'azul-oscuro': '#1e3a5f',
      'azul-claro': '#7fb3d5',
      'azul-marino': '#0f3057',
      'azul-esencia': '#9ec9ff',
      verde: '#3a8b5e',
      'verde-oliva': '#6b8e23',
      'verde-claro': '#9bc53d',
      mostaza: '#d4a017',
      amarillo: '#f2c300',
      dorado: '#c79a3f',
      plateado: '#c0c0c0',
    };
  }

  private get colorSynonyms(): Record<string, string> {
    return {
      oscuro: 'negro',
      oscura: 'negro',
      'muy-oscuro': 'negro',
      clara: 'blanco',
      claro: 'blanco',
      brilloso: 'dorado',
      brillosa: 'dorado',
      dorada: 'dorado',
      dorados: 'dorado',
      metalico: 'plateado',
      metalica: 'plateado',
      metalicos: 'plateado',
      metalicas: 'plateado',
      'oro-viejo': 'dorado',
      'oro-rosa': 'rosa',
      arenaoscura: 'arena',
      arenaoscuro: 'arena',
      crema: 'beige',
      hueso: 'blanco',
      perla: 'blanco',
      lomo: 'marron',
      chocolateoscuro: 'chocolate',
      terracotaclara: 'terracota',
      terracotaoscura: 'terracota',
      salmonado: 'salmon',
      salmonada: 'salmon',
      salmones: 'salmon',
    };
  }

  private tokenizeSlug(slug: string): string[] {
    return slug
      .split(/-+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !this.isColorStopWord(t));
  }

  private slugify(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private isColorStopWord(token: string): boolean {
    return this.colorStopWords.has(token);
  }
  private isHexColor(value: string): boolean {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
  }

  private isRgbColor(value: string): boolean {
    return /^rgba?\(/i.test(value.trim());
  }

  private isNamedCssColor(value: string): boolean {
    const s = new Option().style;
    s.color = '';
    s.color = value;
    return s.color !== '';
  }

  private get defaultColorHex(): string {
    return '#c2764e';
  }

  private fallbackColorFromLabel(label: string): string {
    if (!label) return this.defaultColorHex;
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 55 + (Math.abs(hash) % 20); // 55-74
    const lightness = 45 + (Math.abs(hash >> 3) % 10); // 45-54
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  // =======================
  // GALERIA
  // =======================
  selectImage(variant: ThumbnailVariant): void {
    this.applySelectedVariant(variant);
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

    const productForAnalytics: Product = {
      ...this.product,
      color: this.selectedColor || this.product.color
    };

    this.cartService.addProduct(this.product, this.quantity, this.selectedColor);
    this.analytics.trackAddToCart(productForAnalytics, this.quantity, 'Detalle de producto');
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
      maximumFractionDigits: 0
    }).format(price);
  }
}

