import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, map, take } from 'rxjs';
import { CartService, CartItem } from '../../shared/services/cart.service';
import { Product } from '../../shared/models/product.model';
import { ProductService } from '../../shared/services/product.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems$: Observable<CartItem[]> = this.cartService.items$;
  totalItems$ = this.cartService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.qty, 0))
  );
  totalAmount$ = this.cartService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.qty * item.precio, 0))
  );
  recommendedProducts: Product[] = [];
  private sub?: Subscription;

  constructor(
    private cartService: CartService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.sub = this.cartItems$.subscribe((items) => this.loadRecommendations(items));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  decrease(item: CartItem) {
    this.cartService.updateQuantity(item.id, item.qty - 1, item.color);
  }

  increase(item: CartItem) {
    this.cartService.updateQuantity(item.id, item.qty + 1, item.color);
  }

  remove(item: CartItem) {
    this.cartService.removeItem(item.id, item.color);
  }

  clear() {
    this.cartService.clear();
  }

  private loadRecommendations(items: CartItem[]) {
    const coleccion = items[0]?.coleccion ?? null;
    if (coleccion) {
      this.productService
        .getProductsByCollection(coleccion)
        .pipe(take(1))
        .subscribe((productos) => {
          this.recommendedProducts = productos
            .filter((p) => !items.some((item) => item.id === p.id))
            .slice(0, 4);
        });
    } else {
      this.productService
        .getFeaturedProducts()
        .pipe(take(1))
        .subscribe((productos) => {
          this.recommendedProducts = productos.slice(0, 4);
        });
    }
  }

  addSuggested(product: Product, event: Event) {
    event.stopPropagation();
    this.cartService.addProduct(product, 1);
  }
}
