import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProductService } from '../../../shared/services/product.service';
import { Product } from '../../../shared/models/product.model';
import { Subscription } from 'rxjs';

// 👇 IMPORTACIONES
import { AuthService } from '../../../shared/services/auth.service';
import { Router } from '@angular/router';

type AdminProductForm = {
  nombre: string;
  precio: number | null;
  descripcion: string;
  caracteristicas: string;
  categoria: string;
  coleccion: string;
  badge: Product['badge'];
  stock: number | null;
  coloresTexto: string;
  imagen: string;
  imagenes: string[];
  dimensiones: {
    alto: string;
    ancho: string;
    profundidad: string;
    capacidad: string;
  };
};

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css'],
})
export class ProductosComponent implements OnInit, OnDestroy {
  producto: AdminProductForm = this.obtenerEstadoInicial();

  // Imagen principal
  imagenSeleccionada: File | null = null;
  previewUrl: string | null = null;

  // Imágenes secundarias
  imagenesSeleccionadas: File[] = [];
  previewImagenes: string[] = [];

  // Listado
  productos: Product[] = [];
  productosFiltrados: Product[] = [];
  private productosSub?: Subscription;

  // Filtros
  filtroNombre = '';
  filtroCategoria = '';
  filtroColeccion = '';
  filtroBadge: Product['badge'] | '' = '';

  // Edición
  modoEdicion = false;
  idProductoEdicion: string | null = null;

  // Catálogos
  readonly categorias = ['Mochilas', 'Bolsas', 'Morrales', 'Zapatos'];
  readonly colecciones = [
    { id: 'kalad-origen', label: 'Kalad Origen' },
    { id: 'kalad-essencia', label: 'Kalad Essencia' }
  ];
  readonly badges: Product['badge'][] = ['Nuevo', 'Oferta', 'Limitada', null];
  private imagenCache = new Map<string, string>();
  private imagenResolviendo = new Set<string>();
  guardando = false;
  mensajeSistema: { tipo: 'error' | 'exito'; texto: string } | null = null;
  toastActivo: { tipo: 'error' | 'exito'; texto: string } | null = null;
  private toastTimeout?: ReturnType<typeof setTimeout>;

  get textoBotonAccion(): string {
    return this.modoEdicion ? 'Actualizar producto' : 'Guardar producto nuevo';
  }

  get textoBotonProcesando(): string {
    return this.modoEdicion ? 'Actualizando...' : 'Guardando...';
  }

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================
  ngOnInit() {
    this.cargarProductos();
  }

  ngOnDestroy() {
    this.productosSub?.unsubscribe();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  // ==========================================================
  // CARGAR LISTA
  // ==========================================================
  cargarProductos() {
    this.productosSub?.unsubscribe();
    this.productosSub = this.productService.getAllProducts().subscribe((data) => {
      this.productos = data ?? [];
      this.aplicarFiltros();
    });
  }

  obtenerEstadoInicial(): AdminProductForm {
    return {
      nombre: '',
      precio: null,
      descripcion: '',
      caracteristicas: '',
      categoria: '',
      coleccion: 'kalad-origen',
      badge: null,
      stock: null,
      coloresTexto: '',
      imagen: '',
      imagenes: [],
      dimensiones: {
        alto: '',
        ancho: '',
        profundidad: '',
        capacidad: '',
      },
    };
  }

  // ==========================================================
  // IMAGEN PRINCIPAL
  // ==========================================================
  seleccionarImagen(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = reader.result as string);
    reader.readAsDataURL(archivo);

    this.imagenSeleccionada = archivo;
  }

  limpiarImagen() {
    this.imagenSeleccionada = null;
    this.previewUrl = null;
    if (this.modoEdicion) this.producto.imagen = '';
  }

  faltaImagenPrincipal() {
    return !this.modoEdicion && !this.previewUrl;
  }

  // ==========================================================
  // MULTI IMAGEN
  // ==========================================================
  seleccionarMultiplesImagenes(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

    for (let file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImagenes.push(reader.result as string);
        this.imagenesSeleccionadas.push(file);
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  eliminarImagenSecundaria(index: number) {
    const guardadas = this.producto.imagenes ?? [];

    if (index < guardadas.length) {
      guardadas.splice(index, 1);
      this.producto.imagenes = [...guardadas];
    } else {
      this.imagenesSeleccionadas.splice(index - guardadas.length, 1);
    }

    this.previewImagenes.splice(index, 1);
  }

  // ==========================================================
  // GUARDAR / ACTUALIZAR
  // ==========================================================
  async guardarProducto(form: NgForm) {
    if (this.guardando) return;

      if (form.invalid || this.faltaImagenPrincipal()) {
        form.control.markAllAsTouched();
        this.mensajeSistema = {
          tipo: 'error',
          texto: 'Revisa que todos los campos obligatorios estén completos.'
        };
        this.mostrarToast('error', this.mensajeSistema.texto);
        return;
      }

    this.mensajeSistema = null;
    this.guardando = true;

    try {
      // Subir imagen principal
        if (this.imagenSeleccionada) {
          this.producto.imagen = await this.productService.subirImagen(
            this.imagenSeleccionada,
            this.producto.coleccion
          );
        }

      // Subir imágenes secundarias
      const nuevasUrls: string[] = [];
        for (let archivo of this.imagenesSeleccionadas) {
          nuevasUrls.push(
            await this.productService.subirImagen(archivo, this.producto.coleccion)
          );
        }

      const imagenesFinales = this.modoEdicion
        ? [...(this.producto.imagenes ?? []), ...nuevasUrls]
        : nuevasUrls;

      // Crear payload
        const colores = this.normalizarColores(this.producto.coloresTexto);
        const dimensiones = this.sanitizarDimensiones(this.producto.dimensiones);

        const payload: Omit<Product, 'id'> = {
          nombre: this.producto.nombre.trim(),
          precio: Number(this.producto.precio),
          descripcion: this.producto.descripcion.trim(),
          caracteristicas: this.producto.caracteristicas.trim(),
          categoria: this.producto.categoria,
          coleccion: this.producto.coleccion,
          imagen: this.producto.imagen,
          colores,
          color: colores[0] ?? '',
          stock: Number(this.producto.stock),
          badge: this.producto.badge,
          imagenes: imagenesFinales,
          dimensiones,
        };

      // Crear o actualizar
        if (this.modoEdicion && this.idProductoEdicion) {
          await this.productService.updateProduct(this.idProductoEdicion, payload);
          this.mensajeSistema = { tipo: 'exito', texto: 'Producto actualizado correctamente.' };
          this.mostrarToast('exito', this.mensajeSistema.texto);
        } else {
          await this.productService.createProduct(payload);
          this.mensajeSistema = { tipo: 'exito', texto: 'Producto creado correctamente.' };
          this.mostrarToast('exito', this.mensajeSistema.texto);
        }

      // Reset
      form.resetForm(this.obtenerEstadoInicial());
      this.previewUrl = null;
      this.previewImagenes = [];
      this.imagenesSeleccionadas = [];
      this.imagenSeleccionada = null;
      this.modoEdicion = false;

      this.cargarProductos();
      } catch (e) {
        console.error(e);
        const texto = e instanceof Error ? e.message : 'Error guardando el producto';
        this.mensajeSistema = { tipo: 'error', texto };
        this.mostrarToast('error', texto);
      } finally {
        this.guardando = false;
      }
  }

  // ==========================================================
  // EDITAR
  // ==========================================================
  editarProducto(producto: Product) {
    this.modoEdicion = true;
    this.idProductoEdicion = producto.id ?? null;

    const colores = this.normalizarColores(
      producto.colores?.join(', ') || producto.color || ''
    );

    this.producto = {
      nombre: producto.nombre,
      precio: producto.precio,
      descripcion: producto.descripcion,
      caracteristicas: producto.caracteristicas ?? '',
      categoria: producto.categoria,
      coleccion: producto.coleccion,
      badge: producto.badge,
      stock: producto.stock,
        coloresTexto: colores.join(', '),
      imagen: producto.imagen,
      imagenes: [...(producto.imagenes ?? [])],
      dimensiones: {
        alto: producto.dimensiones?.alto ?? '',
        ancho: producto.dimensiones?.ancho ?? '',
        profundidad: producto.dimensiones?.profundidad ?? '',
        capacidad: producto.dimensiones?.capacidad ?? '',
      },
    };

    this.imagenSeleccionada = null;
    this.previewUrl = producto.imagen
      ? this.esUrlPublica(producto.imagen)
        ? producto.imagen
        : null
      : null;
    this.previewImagenes = [...(producto.imagenes ?? [])];
    this.imagenesSeleccionadas = [];

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================
  // ELIMINAR
  // ==========================================================
  async eliminarProducto(id?: string) {
    if (!id) return;

    if (!confirm('¿Seguro que deseas eliminarlo?')) return;

    await this.productService.deleteProduct(id);
    this.cargarProductos();
  }

  // ==========================================================
  // FILTROS
  // ==========================================================
  aplicarFiltros() {
    const nombre = this.filtroNombre.toLowerCase();

    this.productosFiltrados = this.productos.filter((p) =>
      (!nombre || p.nombre.toLowerCase().includes(nombre)) &&
      (!this.filtroCategoria || p.categoria === this.filtroCategoria) &&
      (!this.filtroColeccion || p.coleccion === this.filtroColeccion) &&
      (!this.filtroBadge || p.badge === this.filtroBadge)
    );
  }

  resetFiltros() {
    this.filtroNombre = '';
    this.filtroCategoria = '';
    this.filtroColeccion = '';
    this.filtroBadge = '';
    this.aplicarFiltros();
  }

  obtenerImagenProducto(producto: Product): string | null {
    const candidata = producto.imagen || producto.imagenes?.[0] || null;
    if (!candidata) return null;

    if (this.esUrlPublica(candidata)) return candidata;

    if (this.imagenCache.has(candidata)) {
      return this.imagenCache.get(candidata)!;
    }

    if (!this.imagenResolviendo.has(candidata)) {
      this.imagenResolviendo.add(candidata);
      this.productService.obtenerUrlDescarga(candidata)
        .then((url) => {
          if (url) {
            this.imagenCache.set(candidata, url);
            producto.imagen = url;
            this.productos = this.productos.map((p) =>
              p.id === producto.id ? { ...p, imagen: url } : p
            );
            this.aplicarFiltros();
          }
        })
        .catch((err) => console.warn('No se pudo cargar la imagen', err))
        .finally(() => this.imagenResolviendo.delete(candidata));
    }

    return null;
  }

  private esUrlPublica(valor: string): boolean {
    return /^https?:\/\//i.test(valor) || valor.startsWith('data:');
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  private sanitizarDimensiones(
    dimensiones?: AdminProductForm['dimensiones']
  ): Product['dimensiones'] | undefined {
    if (!dimensiones) return undefined;

    const limpio = {
      alto: dimensiones.alto?.trim() ?? '',
      ancho: dimensiones.ancho?.trim() ?? '',
      profundidad: dimensiones.profundidad?.trim() ?? '',
      capacidad: dimensiones.capacidad?.trim() ?? '',
    };

    const tieneDatos = Object.values(limpio).some((valor) => valor.length > 0);
    return tieneDatos ? limpio : undefined;
  }

  private normalizarColores(valor: string | string[]): string[] {
    if (Array.isArray(valor)) {
      return valor.map((c) => c.trim()).filter((c) => c.length > 0);
    }
    return (valor || '')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  private mostrarToast(tipo: 'error' | 'exito', texto: string) {
    this.toastActivo = { tipo, texto };
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastActivo = null;
    }, 4000);
  }
}
