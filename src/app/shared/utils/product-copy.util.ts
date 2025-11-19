import { Product } from '../models/product.model';

type PartialProduct = Partial<Product> & { nombre?: string; coleccion?: string };

const coleccionMap: Record<string, { label: string; prefix: string }> = {
  'kalad-origen': { label: 'Kalad Origen', prefix: 'OR' },
  'kalad-essencia': { label: 'Kalad Essencia', prefix: 'ES' },
};

const defaultColeccion = { label: 'Kalad', prefix: 'KA' };

export interface GeneratedProductCopy {
  sku: string;
  descripcionCorta: string;
  copyPremium: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
}

export function buildProductCopy(product: PartialProduct): GeneratedProductCopy {
  const nombre = (product.nombre ?? 'Mochila Kalad').trim();
  const coleccionInfo = coleccionMap[product.coleccion ?? ''] ?? defaultColeccion;
  const colores = sanitizeColors(product.colores ?? []);
  const colorTexto = colores.length ? colores.join(', ') : 'tonos naturales';

  const sku = generarSku(nombre, coleccionInfo.prefix, product.id);
  const descripcionCorta = `Mochila ${coleccionInfo.label} en ${colorTexto}, tejida a mano con acabados premium.`;
  const copyPremium =
    `${nombre} es parte de ${coleccionInfo.label}. Cada pieza se teje artesanalmente, ` +
    `mezclando ${colorTexto} para lograr un diseño exclusivo con interior resistente y detalles pensados para el uso diario.`;

  const seoTitle = `${nombre} | ${coleccionInfo.label} Kalad`;
  const seoDescription =
    `${nombre} - Mochila artesanal en ${colorTexto}. Hecha en Colombia con fibras naturales, ideal para un look sofisticado.`;
  const seoKeywords = construirKeywords(nombre, coleccionInfo.label, colores);

  return {
    sku,
    descripcionCorta,
    copyPremium,
    seoTitle,
    seoDescription,
    seoKeywords,
  };
}

function generarSku(nombre: string, prefix: string, id?: string): string {
  const slug = slugify(nombre).replace(/-/g, '').toUpperCase();
  const base = slug.slice(0, 4).padEnd(4, 'X');
  const idSegment = (id ?? nombre)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString(36)
    .toUpperCase()
    .slice(-3);
  return `${prefix}-${base}-${idSegment}`;
}

function slugify(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeColors(colores: string[]): string[] {
  return colores
    .map((c) => c?.trim())
    .filter((c): c is string => Boolean(c?.length));
}

function construirKeywords(nombre: string, coleccion: string, colores: string[]): string[] {
  const base = [
    'mochilas artesanales',
    'hechas en Colombia',
    'kalad',
    coleccion.toLowerCase(),
    nombre.toLowerCase(),
  ];

  const colorKeywords = colores.map((c) => `mochila color ${c.toLowerCase()}`);

  return Array.from(new Set([...base, ...colorKeywords]));
}
