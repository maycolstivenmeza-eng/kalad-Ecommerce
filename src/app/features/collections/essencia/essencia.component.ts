import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Product } from '../../../shared/models/product.model';
import { ProductService } from '../../../shared/services/product.service';

@Component({
  selector: 'app-essencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './essencia.component.html',
  styleUrl: './essencia.component.css'
})
export class EssenciaComponent implements OnInit, OnDestroy {
  productos: Product[] = [];
  private sub?: Subscription;

  open = [false, false, false];
  toggle(i: number) {
    this.open[i] = !this.open[i];
  }

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.sub = this.productService
      .getProductsByCollection('kalad-essencia')
      .subscribe((items) => {
        this.productos = items;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

}
