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
  categoria: string;
  coleccion: string;
  badge: Product['badge'];
  stock: number | null;
  coloresTexto: string;
  imagen: string;
  imagenes: string[];
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
      categoria: '',
      coleccion: 'kalad-origen',
      badge: null,
      stock: null,
      coloresTexto: '',
      imagen: '',
      imagenes: [],
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
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    try {
      // Subir imagen principal
      if (this.imagenSeleccionada) {
        this.producto.imagen = await this.productService.subirImagen(this.imagenSeleccionada);
      }

      // Subir imágenes secundarias
      const nuevasUrls: string[] = [];
      for (let archivo of this.imagenesSeleccionadas) {
        nuevasUrls.push(await this.productService.subirImagen(archivo));
      }

      const imagenesFinales = this.modoEdicion
        ? [...(this.producto.imagenes ?? []), ...nuevasUrls]
        : nuevasUrls;

      // Crear payload
      const colores = (this.producto.coloresTexto || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const payload: Omit<Product, 'id'> = {
        nombre: this.producto.nombre.trim(),
        precio: Number(this.producto.precio),
        descripcion: this.producto.descripcion.trim(),
        categoria: this.producto.categoria,
        coleccion: this.producto.coleccion,
        imagen: this.producto.imagen,
        colores,
        color: colores[0] ?? '',
        stock: Number(this.producto.stock),
        badge: this.producto.badge,
        imagenes: imagenesFinales,
      };

      // Crear o actualizar
      if (this.modoEdicion && this.idProductoEdicion) {
        await this.productService.updateProduct(this.idProductoEdicion, payload);
        alert('Producto actualizado');
      } else {
        await this.productService.createProduct(payload);
        alert('Producto agregado');
      }

      // Reset
      form.resetForm(this.obtenerEstadoInicial());
      this.previewUrl = null;
      this.previewImagenes = [];
      this.imagenesSeleccionadas = [];
      this.modoEdicion = false;

      this.cargarProductos();

    } catch (e) {
      console.error(e);
      alert('Error guardando el producto');
    }
  }

  // ==========================================================
  // EDITAR
  // ==========================================================
  editarProducto(producto: Product) {
    this.modoEdicion = true;
    this.idProductoEdicion = producto.id ?? null;

    const colores = producto.colores?.length ? producto.colores : [producto.color];

    this.producto = {
      nombre: producto.nombre,
      precio: producto.precio,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      coleccion: producto.coleccion,
      badge: producto.badge,
      stock: producto.stock,
      coloresTexto: colores.join(', '),
      imagen: producto.imagen,
      imagenes: [...(producto.imagenes ?? [])],
    };

    this.previewUrl = producto.imagen;
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
    return producto.imagen || producto.imagenes?.[0] || null;
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
