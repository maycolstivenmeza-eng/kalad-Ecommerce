import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProductService } from '../../../shared/services/product.service';
import { Product } from '../../../shared/models/product.model';

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
  imagenes: string[]; // Galería secundaria
};

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css'],
})
export class ProductosComponent {
  producto: AdminProductForm = this.obtenerEstadoInicial();

  // Imagen principal
  imagenSeleccionada: File | null = null;
  previewUrl: string | null = null;

  // Imágenes secundarias
  imagenesSeleccionadas: File[] = [];
  previewImagenes: string[] = []; // SIEMPRE contiene guardadas + nuevas

  // Listado
  productos: Product[] = [];
  productosFiltrados: Product[] = [];

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

  constructor(private productService: ProductService) {}

  async ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.productService.getAllProducts().subscribe((data) => {
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

    if (!archivo) {
      this.imagenSeleccionada = null;
      this.previewUrl = null;
      return;
    }

    if (archivo.size > 1 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 1MB.');
      input.value = '';
      return;
    }

    const formatos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!formatos.includes(archivo.type)) {
      alert('Solo se acepta JPG, PNG o WEBP.');
      input.value = '';
      return;
    }

    const lector = new FileReader();
    lector.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 600 || img.height < 600) {
          alert(`Imagen muy pequeña (${img.width}x${img.height}). Mínimo 600x600px.`);
          input.value = '';
          return;
        }

        this.comprimirImagen(archivo).then((comp) => {
          this.imagenSeleccionada = comp;
          this.generarPreview(comp);
        });
      };
      img.src = e.target.result;
    };

    lector.readAsDataURL(archivo);
  }

  generarPreview(archivo: File) {
    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = reader.result as string);
    reader.readAsDataURL(archivo);
  }

  // ==========================================================
  // IMÁGENES SECUNDARIAS
  // ==========================================================
  seleccionarMultiplesImagenes(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivos = input.files;
    if (!archivos) return;

    if (archivos.length + this.previewImagenes.length > 4) {
      alert('Máximo 4 imágenes adicionales.');
      return;
    }

    Array.from(archivos).forEach((archivo) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImagenes.push(reader.result as string);
        this.imagenesSeleccionadas.push(archivo);
      };
      reader.readAsDataURL(archivo);
    });

    input.value = '';
  }

  eliminarImagenSecundaria(index: number) {
    const guardadas = this.producto.imagenes ?? [];

    if (index < guardadas.length) {
      guardadas.splice(index, 1);
      this.producto.imagenes = [...guardadas];
    } else {
      const idxNueva = index - guardadas.length;
      this.imagenesSeleccionadas.splice(idxNueva, 1);
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

    if (this.faltaImagenPrincipal()) {
      alert('Selecciona una imagen principal antes de guardar.');
      return;
    }

    try {
      // Subir imagen principal
      if (this.imagenSeleccionada) {
        this.producto.imagen = await this.productService.subirImagen(this.imagenSeleccionada);
      }

      // Subir nuevas imágenes secundarias
      const nuevasUrls: string[] = [];
      for (const archivo of this.imagenesSeleccionadas) {
        const url = await this.productService.subirImagen(archivo);
        nuevasUrls.push(url);
      }

      // Mezclar (guardadas + nuevas)
      const imagenesFinales = this.modoEdicion
        ? [...(this.producto.imagenes ?? []), ...nuevasUrls]
        : nuevasUrls;

      // Normalizar colores
      const colores = (this.producto.coloresTexto || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const payload: Omit<Product, 'id'> = {
        nombre: this.producto.nombre.trim(),
        precio: Number(this.producto.precio) || 0,
        descripcion: this.producto.descripcion.trim(),
        categoria: this.producto.categoria,
        coleccion: this.producto.coleccion,
        imagen: this.producto.imagen,
        colores,
        color: colores[0] ?? '',
        stock: Number(this.producto.stock) || 0,
        badge: this.producto.badge ?? null,
        imagenes: imagenesFinales,
      };

      if (this.modoEdicion && this.idProductoEdicion) {
        await this.productService.updateProduct(this.idProductoEdicion, payload);
        alert('Producto actualizado correctamente.');
      } else {
        await this.productService.createProduct(payload);
        alert('Producto agregado correctamente.');
      }

      // Reset UI
      this.cargarProductos();
      form.resetForm(this.obtenerEstadoInicial());

      this.modoEdicion = false;
      this.idProductoEdicion = null;

      this.previewUrl = null;
      this.previewImagenes = [];
      this.imagenesSeleccionadas = [];

    } catch (e) {
      console.error(e);
      alert('Error guardando el producto.');
    }
  }

  faltaImagenPrincipal(): boolean {
    return !this.modoEdicion && !this.tieneImagenPrincipal();
  }

  private tieneImagenPrincipal(): boolean {
    return !!this.imagenSeleccionada || !!(this.producto.imagen && this.producto.imagen.trim());
  }

  // ==========================================================
  // EDITAR
  // ==========================================================
  editarProducto(producto: Product) {
    this.modoEdicion = true;
    this.idProductoEdicion = producto.id ?? null;

    const colores = producto.colores?.length ? producto.colores : [producto.color];

    this.producto = {
      nombre: producto.nombre ?? '',
      precio: producto.precio ?? null,
      descripcion: producto.descripcion ?? '',
      categoria: producto.categoria ?? '',
      coleccion: producto.coleccion ?? 'kalad-origen',
      badge: producto.badge ?? null,
      stock: producto.stock ?? null,
      coloresTexto: colores.join(', '),
      imagen: producto.imagen ?? '',
      imagenes: [...(producto.imagenes ?? [])],
    };

    this.previewUrl = producto.imagen ?? null;
    this.previewImagenes = [...(producto.imagenes ?? [])];
    this.imagenesSeleccionadas = [];

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================
  // ELIMINAR
  // ==========================================================
  async eliminarProducto(id?: string) {
    if (!id) return alert('No se pudo identificar el producto');
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;

    try {
      await this.productService.deleteProduct(id);
      alert('Producto eliminado.');
      this.cargarProductos();
    } catch (e) {
      alert('Error eliminando producto');
    }
  }

  // ==========================================================
  // FILTROS
  // ==========================================================
  aplicarFiltros() {
    const nombre = this.filtroNombre.toLowerCase();

    this.productosFiltrados = this.productos.filter((p) => {
      return (
        (!nombre || p.nombre.toLowerCase().includes(nombre)) &&
        (!this.filtroCategoria || p.categoria === this.filtroCategoria) &&
        (!this.filtroColeccion || p.coleccion === this.filtroColeccion) &&
        (!this.filtroBadge || p.badge === this.filtroBadge)
      );
    });
  }

  resetFiltros() {
    this.filtroNombre = '';
    this.filtroCategoria = '';
    this.filtroColeccion = '';
    this.filtroBadge = '';
    this.aplicarFiltros();
  }

  // ==========================================================
  // COMPRESIÓN
  // ==========================================================
  async comprimirImagen(
    archivo: File,
    calidad: number = 0.8,
    maxWidth: number = 1080,
    maxHeight: number = 1080
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject('Error al comprimir');
              resolve(new File([blob], archivo.name, { type: 'image/webp' }));
            },
            'image/webp',
            calidad
          );
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(archivo);
    });
  }

  limpiarImagen() {
    this.imagenSeleccionada = null;
    this.previewUrl = null;

    if (this.modoEdicion) {
      this.producto.imagen = '';
    }
  }
}
