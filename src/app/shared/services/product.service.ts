import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  increment
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly COLLECTION_NAME = 'productos';
  private readonly badgeValues: Exclude<Product['badge'], null>[] = ['Nuevo', 'Oferta', 'Limitada'];

  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) {}

  /** Acceso centralizado a la colección */
  private colRef() {
    return collection(this.firestore, this.COLLECTION_NAME);
  }

  /** Ref a un documento específico */
  private docRef(id: string) {
    return doc(this.firestore, `${this.COLLECTION_NAME}/${id}`);
  }

  /**
   * Obtiene todos los productos
   */
  getAllProducts(): Observable<Product[]> {
    return this.mapCollection(collectionData(this.colRef(), { idField: 'id' }));
  }

  /**
   * Obtiene un producto por su ID
   */
  getProductById(id: string): Observable<Product> {
    return this.mapDocument(docData(this.docRef(id), { idField: 'id' }));
  }

  /**
   * Obtiene productos por categoría
   */
  getProductsByCategory(categoria: string): Observable<Product[]> {
    const qy = query(
      this.colRef(),
      where('categoria', '==', categoria),
      orderBy('nombre', 'asc')
    );
    return this.mapCollection(collectionData(qy, { idField: 'id' }));
  }

  /**
   * Obtiene productos por colección
   */
  getProductsByCollection(coleccion: string): Observable<Product[]> {
    const qy = query(
      this.colRef(),
      where('coleccion', '==', coleccion),
      orderBy('nombre', 'asc')
    );
    return this.mapCollection(collectionData(qy, { idField: 'id' }));
  }

  /**
   * Obtiene productos destacados (con badge)
   * Nota: usar 'in' evita resultados inconsistentes de '!= null'
   */
  getFeaturedProducts(): Observable<Product[]> {
    return this.getAllProducts().pipe(
      map((products) =>
        products.filter((p) => !!p.badge && this.badgeValues.includes(p.badge as Exclude<Product['badge'], null>))
      )
    );
  }

  /**
   * Obtiene productos con stock disponible
   */
  getProductsInStock(): Observable<Product[]> {
    const qy = query(
      this.colRef(),
      where('stock', '>', 0),
      orderBy('stock', 'desc')
    );
    return this.mapCollection(collectionData(qy, { idField: 'id' }));
  }

  /**
   * Búsqueda simple por nombre (cliente)
   * (Firestore no soporta contains; se deja así por ahora)
   */
  searchProducts(_searchTerm: string): Observable<Product[]> {
    return this.getAllProducts();
  }

  /**
   * Crea un nuevo producto
   */
  async createProduct(product: Omit<Product, 'id'>) {
    return await addDoc(this.colRef(), this.prepareWritePayload(product));
  }

  /**
   * Actualiza un producto existente
   */
  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    return await updateDoc(this.docRef(id), this.prepareWritePayload(product));
  }

  /**
   * Elimina un producto
   */
  async deleteProduct(id: string): Promise<void> {
    return await deleteDoc(this.docRef(id));
  }

  /**
   * Actualiza el stock de un producto (set absoluto)
   */
  async updateStock(id: string, newStock: number): Promise<void> {
    return await updateDoc(this.docRef(id), { stock: newStock });
  }

  /**
   * Reduce el stock de forma atómica (transacción)
   */
  async reduceStock(id: string, quantity: number): Promise<void> {
    await runTransaction(this.firestore, async (trx: { get: (arg0: any) => any; update: (arg0: any, arg1: { stock: any; }) => void; }) => {
      const snap = await trx.get(this.docRef(id));
      if (!snap.exists()) throw new Error('Producto no existe');

      const data = snap.data() as Product;
      const current = Number(data.stock ?? 0);

      if (current < quantity) throw new Error('Stock insuficiente');

      trx.update(this.docRef(id), { stock: increment(-quantity) });
    });
  }

  // -----------------------------------------------------------------------------------
  // SUBIR IMAGEN A FIREBASE STORAGE
  // -----------------------------------------------------------------------------------
  async subirImagen(file: File): Promise<string> {
    const safeName = file.name.replace(/\s+/g, '_');
    const ruta = `productos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
    const storageRef = ref(this.storage, ruta);

    // Puedes agregar metadata si quieres:
    // const metadata = { contentType: file.type };
    await uploadBytes(storageRef, file /*, metadata*/);

    return await getDownloadURL(storageRef);
  }

  // -----------------------------------------------------------------------------------
  // Helpers para normalizar datos
  // -----------------------------------------------------------------------------------
  private mapCollection(source: Observable<any[]>): Observable<Product[]> {
    return source.pipe(map((items) => items.map((item) => this.normalizeProduct(item))));
  }

  private mapDocument(source: Observable<any>): Observable<Product> {
    return source.pipe(map((item) => this.normalizeProduct(item)));
  }

  private normalizeProduct(raw: any): Product {
    if (!raw) {
      return raw as Product;
    }

    const colores = this.sanitizeStringArray(
      Array.isArray(raw.colores) ? raw.colores : raw.color ? [raw.color] : []
    );

    const imagenes = this.sanitizeStringArray(
      Array.isArray(raw.imagenes) ? raw.imagenes : raw.imagenes ? [raw.imagenes] : []
    );

    const rawBadge = raw.badge ?? raw.Etiqueta ?? raw.etiqueta ?? null;
    const badge =
      rawBadge && this.badgeValues.includes(rawBadge as Exclude<Product['badge'], null>)
        ? (rawBadge as Product['badge'])
        : null;

    return {
      ...raw,
      id: raw.id,
      nombre: raw.nombre ?? '',
      precio: Number(raw.precio ?? 0),
      imagen: raw.imagen ?? '',
      imagenes,
      descripcion: raw.descripcion ?? '',
      categoria: raw.categoria ?? '',
      coleccion: raw.coleccion ?? '',
      colores,
      color: raw.color ?? colores[0] ?? '',
      stock: Number(raw.stock ?? 0),
      badge,
      Etiqueta: badge,
    };
  }

  private prepareWritePayload(product: Partial<Product>) {
    const colores = this.sanitizeStringArray(Array.isArray(product.colores) ? product.colores : []);
    const imagenes = this.sanitizeStringArray(Array.isArray(product.imagenes) ? product.imagenes : []);
    const rawBadge = product.badge ?? null;
    const badge =
      rawBadge && this.badgeValues.includes(rawBadge as Exclude<Product['badge'], null>)
        ? rawBadge
        : null;
    const color = product.color ?? colores[0] ?? '';

    const payload: Record<string, any> = {
      ...product,
      colores,
      imagenes,
      badge,
      Etiqueta: badge,
      color: color || null,
    };

    if ('id' in payload) {
      delete payload['id'];
    }
    return this.cleanUndefined(payload);
  }

  private sanitizeStringArray(values: any[]): string[] {
    return values
      .map((value) => (typeof value === 'string' ? value : value != null ? String(value) : ''))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private cleanUndefined(obj: Record<string, any>) {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === undefined) delete obj[key];
    });
    return obj;
  }
}
