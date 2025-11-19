export interface Product {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  imagenes?: string[];    // ← NUEVO: Otras imágenes
  descripcion: string;
  categoria: string;
  coleccion: string;
  colores?: string[];
  color?: string;
  stock: number;
  fechaCreacion?: string | Date;
  caracteristicas?: string;
  dimensiones?: {
    alto: string;
    ancho: string;
    profundidad: string;
    capacidad: string;
  };
  sku?: string;
  descripcionCorta?: string;
  copyPremium?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  badge?: 'Nuevo' | 'Oferta' | 'Limitada' | null;
  Etiqueta?: string | null;
}
