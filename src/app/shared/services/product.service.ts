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
import { buildProductCopy } from '../utils/product-copy.util';

import { Storage, ref, getDownloadURL, uploadBytes } from '@angular/fire/storage';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly COLLECTION_NAME = 'productos';
  private readonly badgeValues: Exclude<Product['badge'], null>[] = ['Nuevo', 'Oferta', 'Limitada'];
  private readonly bucket = environment.firebase.storageBucket;
  private readonly directUploadBase = 'https://firebasestorage.googleapis.com';
  private readonly uploadBase = environment.useStorageUploadProxy
    ? '/firebase-storage'
    : this.directUploadBase;

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private auth: Auth
  ) {}

  // ===========================================
  // COLECCIONES Y DOCUMENTOS
  // ===========================================
  private colRef() {
    return collection(this.firestore, this.COLLECTION_NAME);
  }

  private docRef(id: string) {
    return doc(this.firestore, `${this.COLLECTION_NAME}/${id}`);
  }

  // ===========================================
  // GETTERS DE PRODUCTOS
  // ===========================================
  getAllProducts(): Observable<Product[]> {
    return this.mapCollection(collectionData(this.colRef(), { idField: 'id' }));
  }

  getProductById(id: string): Observable<Product> {
    return this.mapDocument(docData(this.docRef(id), { idField: 'id' }));
  }

  getProductsByCategory(categoria: string): Observable<Product[]> {
    const qy = query(
      this.colRef(),
      where('categoria', '==', categoria),
      orderBy('nombre', 'asc')
    );
    return this.mapCollection(collectionData(qy, { idField: 'id' }));
  }

  getProductsByCollection(coleccion: string): Observable<Product[]> {
    const qy = query(
      this.colRef(),
      where('coleccion', '==', coleccion),
      orderBy('nombre', 'asc')
    );
    return this.mapCollection(collectionData(qy, { idField: 'id' }));
  }

  getFeaturedProducts(): Observable<Product[]> {
    return this.getAllProducts().pipe(
      map((products) =>
        products.filter((p) => !!p.badge && this.badgeValues.includes(p.badge as any))
      )
    );
  }

  getProductsInStock(): Observable<Product[]> {
    const qy = query(
      this.colRef(),
      where('stock', '>', 0),
      orderBy('stock', 'desc')
    );
    return this.mapCollection(collectionData(qy, { idField: 'id' }));
  }

  // ===========================================
  // CRUD BÁSICO
  // ===========================================
  async createProduct(product: Omit<Product, 'id'>) {
    return await addDoc(this.colRef(), this.prepareWritePayload(product));
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    return await updateDoc(this.docRef(id), this.prepareWritePayload(product));
  }

  async deleteProduct(id: string): Promise<void> {
    return await deleteDoc(this.docRef(id));
  }

  // ===========================================
  // STOCK
  // ===========================================
  async updateStock(id: string, newStock: number): Promise<void> {
    return await updateDoc(this.docRef(id), { stock: newStock });
  }

  async reduceStock(id: string, quantity: number): Promise<void> {
    await runTransaction(this.firestore, async (trx: any) => {
      const snap = await trx.get(this.docRef(id));
      if (!snap.exists()) throw new Error('Producto no existe');

      const data = snap.data() as Product;
      const current = Number(data.stock ?? 0);

      if (current < quantity) throw new Error('Stock insuficiente');

      trx.update(this.docRef(id), { stock: increment(-quantity) });
    });
  }

  // ===========================================
  // SUBIR IMÁGENES A STORAGE (SIN CORS RARO)
  // ===========================================
  async subirImagen(file: File, coleccion?: string): Promise<string> {
    const carpeta = this.obtenerCarpetaColeccion(coleccion);
    const archivo = this.generarNombreArchivo(file.name, carpeta);
    const ruta = `imagenes/${carpeta}/${archivo}`;
    const storageRef = ref(this.storage, ruta);

    // En desarrollo usamos siempre el proxy HTTP para evitar CORS en uploadBytes
    if (environment.useStorageUploadProxy) {
      const metadata = await this.uploadViaHttp(ruta, file);
      return this.validateAndBuildUrl(metadata);
    }

    try {
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      if (environment.useStorageUploadProxy && this.isCorsOrBucketError(error)) {
        const metadata = await this.uploadViaHttp(ruta, file);
        return this.validateAndBuildUrl(metadata);
      }

      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error al subir imagen: ${message}`);
    }
  }

  // ===========================================
  // DESCARGA URL (si ya conoces la ruta interna)
  // ===========================================
  async obtenerUrlDescarga(ruta: string): Promise<string> {
    const storageRef = ref(this.storage, ruta);
    return await getDownloadURL(storageRef);
  }

  private isCorsOrBucketError(error: unknown): boolean {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code ?? '';
    return /cors|failed to fetch|network/i.test(message) || code === 'storage/bucket-not-found';
  }

  private async uploadViaHttp(
    ruta: string,
    file: File
  ): Promise<{ name?: string; downloadTokens?: string }> {
    const uploadUrl =
      `${this.uploadBase}/v0/b/${this.bucket}/o` +
      `?uploadType=media&name=${encodeURIComponent(ruta)}`;

    const headers: Record<string, string> = {
      'Content-Type': file.type || 'application/octet-stream',
    };

    const token = await this.getAuthToken();
    headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: file
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Error al subir imagen (${response.status}): ${text || response.statusText}`);
    }

    return await response.json() as { name?: string; downloadTokens?: string };
  }

  private validateAndBuildUrl(metadata: { name?: string; downloadTokens?: string }): string {
    if (!metadata.name || !metadata.downloadTokens) {
      throw new Error('Firebase Storage no devolvió un token de descarga.');
    }
    return this.buildPublicUrl(metadata.name, metadata.downloadTokens);
  }

  private buildPublicUrl(name: string, token: string): string {
    return `${this.directUploadBase}/v0/b/${this.bucket}/o/${encodeURIComponent(name)}?alt=media&token=${token}`;
  }

  private async getAuthToken(): Promise<string> {
    const currentUser = await this.resolveCurrentUser();
    if (!currentUser) {
      throw new Error('Debes iniciar sesión nuevamente.');
    }
    return await currentUser.getIdToken();
  }

  private resolveCurrentUser(): Promise<any | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user: any | null) => {
          unsubscribe();
          resolve(user);
        },
        (error: unknown) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  }

  // ===========================================
  // HELPERS
  // ===========================================
  private mapCollection(source: Observable<any[]>): Observable<Product[]> {
    return source.pipe(map((items) => items.map((item) => this.normalizeProduct(item))));
  }

  private mapDocument(source: Observable<any>): Observable<Product> {
    return source.pipe(map((item) => this.normalizeProduct(item)));
  }

  private normalizeProduct(raw: any): Product {
    if (!raw) return raw as Product;

    const colores = this.sanitizeStringArray(
      Array.isArray(raw.colores)
        ? raw.colores
        : typeof raw.coloresTexto === 'string'
          ? raw.coloresTexto.split(',')
          : raw.color
            ? [raw.color]
            : []
    );

    const imagenes = this.sanitizeStringArray(
      Array.isArray(raw.imagenes) ? raw.imagenes : raw.imagen ? [raw.imagen] : []
    );

    const rawBadge = raw.badge ?? raw.Etiqueta ?? raw.etiqueta ?? null;
    const dimensiones = this.sanitizeDimensions(raw.dimensiones);

    const badge =
      rawBadge && this.badgeValues.includes(rawBadge as any)
        ? (rawBadge as Product['badge'])
        : null;

    const baseProduct: Product = {
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
      caracteristicas: typeof raw.caracteristicas === 'string' ? raw.caracteristicas : '',
      dimensiones,
      badge,
      Etiqueta: badge,
    };

    const copy = buildProductCopy(baseProduct);

    return {
      ...baseProduct,
      ...copy,
    };
  }

  private prepareWritePayload(product: Partial<Product>) {
    const colores = this.sanitizeStringArray(product.colores ?? []);
    const imagenes = this.sanitizeStringArray(product.imagenes ?? []);
    const dimensiones = this.sanitizeDimensions(product.dimensiones);

    const rawBadge = product.badge ?? null;
    const badge =
      rawBadge && this.badgeValues.includes(rawBadge as any)
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

    const copy = buildProductCopy({
      ...product,
      colores,
      id: product.id,
    });

    payload['sku'] = copy.sku;
    payload['descripcionCorta'] = copy.descripcionCorta;
    payload['copyPremium'] = copy.copyPremium;
    payload['seoTitle'] = copy.seoTitle;
    payload['seoDescription'] = copy.seoDescription;
    payload['seoKeywords'] = copy.seoKeywords;

    if (dimensiones) {
      payload['dimensiones'] = dimensiones;
    } else {
      delete payload['dimensiones'];
    }

    if ('id' in payload) delete payload['id'];

    return this.cleanUndefined(payload);
  }

  private sanitizeDimensions(value: any): Product['dimensiones'] | undefined {
    if (!value || typeof value !== 'object') return undefined;

    const normalize = (v: any) =>
      typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : '';

    const cleaned = {
      alto: normalize(value.alto),
      ancho: normalize(value.ancho),
      profundidad: normalize(value.profundidad),
      capacidad: normalize(value.capacidad),
    };

    const hasData = Object.values(cleaned).some((v) => v.length > 0);
    return hasData ? cleaned : undefined;
  }

  private sanitizeStringArray(values: any[]): string[] {
    return values
      .map((v) => (typeof v === 'string' ? v : v != null ? String(v) : ''))
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  private cleanUndefined(obj: Record<string, any>) {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === undefined) delete obj[key];
    });
    return obj;
  }

  private obtenerCarpetaColeccion(coleccion?: string | null): string {
    const slugColeccion = this.slugify(
      (coleccion ?? '')
        .replace(/^kalad[-_\s]+/i, '')
        .replace(/coleccion/i, '')
    );
    return slugColeccion || 'otros';
  }

  private generarNombreArchivo(originalName: string, slugColeccion: string): string {
    const extension = this.extraerExtension(originalName);
    const base = originalName.replace(new RegExp(`\\.${extension}$`, 'i'), '');
    const baseSlug = this.slugify(base);
    const prefijo = slugColeccion || 'pieza';
    const unico = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nombreBase = baseSlug
      ? `${prefijo}-${baseSlug}`
      : `${prefijo}-pieza`;
    return `${nombreBase}-${unico}.${extension}`;
  }

  private extraerExtension(nombre: string): string {
    const coincidencia = nombre.match(/\.([a-zA-Z0-9]+)$/);
    return coincidencia ? coincidencia[1].toLowerCase() : 'jpg';
  }

  private slugify(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
