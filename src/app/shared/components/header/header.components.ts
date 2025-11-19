import { Component, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../services/cart.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  cartItems$: Observable<CartItem[]> = this.cartService.items$;
  cartCount$ = this.cartService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.qty, 0))
  );
  cartTotal$ = this.cartService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.qty * item.precio, 0))
  );

  cartOpen = false;

  constructor(private cartService: CartService, private router: Router) {}

  toggleCart(event: Event) {
    event.stopPropagation();
    this.cartOpen = !this.cartOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-cart')) {
      this.cartOpen = false;
    }
  }

  goToCart() {
    this.cartOpen = false;
    this.router.navigate(['/cart']);
  }

  goToCheckout() {
    this.cartOpen = false;
    this.router.navigate(['/checkout']);
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.id, item.color);
  }
}

