import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Product } from '../../../shared/models/product.model';
import { ProductService } from '../../../shared/services/product.service';

@Component({
  selector: 'app-origen',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './origen.component.html',
  styleUrl: './origen.component.css'
})
export class OrigenComponent implements OnInit, OnDestroy {
  productos: Product[] = [];
  filtros = { ordenar: false, talla: false, color: false };
  private sub?: Subscription;
  private placeholderImage = 'assets/images/Producto_1.jpg';

  constructor(private productService: ProductService) {}

  async ngOnInit() {
    this.sub = this.productService
      .getProductsByCollection('kalad-origen')
      .subscribe((items) => {
        this.productos = [...items];
      });
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleFiltro(tipo: string) {
    if (tipo === 'ordenar') {
      this.filtros.ordenar = !this.filtros.ordenar;
    } else if (tipo === 'talla') {
      this.filtros.talla = !this.filtros.talla;
    } else if (tipo === 'color') {
      this.filtros.color = !this.filtros.color;
    }
  }

  ordenar(metodo: string) {
    if (metodo === 'A-Z') {
      this.productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (metodo === 'Z-A') {
      this.productos.sort((a, b) => b.nombre.localeCompare(a.nombre));
    } else if (metodo === 'Mayor precio') {
      this.productos.sort((a, b) => b.precio - a.precio);
    } else if (metodo === 'Menor precio') {
      this.productos.sort((a, b) => a.precio - b.precio);
    }
  }
  open = [false, false, false];

  toggle(i: number) {
    this.open[i] = !this.open[i];
  }


}
