import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

export interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  qty: number;
  color?: string;
  sku?: string;
  coleccion?: string;
}

const STORAGE_KEY = 'kalad_cart';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>(this.loadItems());
  readonly items$ = this.itemsSubject.asObservable();

  get items(): CartItem[] {
    return this.itemsSubject.value;
  }

  get totalItems(): number {
    return this.items.reduce((acc, item) => acc + item.qty, 0);
  }

  get totalAmount(): number {
    return this.items.reduce((acc, item) => acc + item.qty * item.precio, 0);
  }

  addProduct(product: Product, qty = 1, color?: string): void {
    if (!product.id) return;

    const existing = this.items.find(
      (item) => item.id === product.id && item.color === (color || product.color)
    );

    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagen,
        qty,
        color: color || product.color,
        sku: product.sku,
        coleccion: product.coleccion,
      });
    }

    this.persist();
  }

  updateQuantity(id: string, qty: number, color?: string) {
    const item = this.items.find((i) => i.id === id && i.color === color);
    if (!item) return;
    item.qty = Math.max(1, qty);
    this.persist();
  }

  removeItem(id: string, color?: string) {
    this.itemsSubject.next(
      this.items.filter((item) => !(item.id === id && item.color === color))
    );
    this.save();
  }

  clear() {
    this.itemsSubject.next([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist() {
    this.itemsSubject.next([...this.items]);
    this.save();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }

  private loadItems(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  }
}
