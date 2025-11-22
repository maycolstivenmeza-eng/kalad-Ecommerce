import { Injectable } from '@angular/core';
import { Firestore, addDoc, collection, serverTimestamp } from '@angular/fire/firestore';

export interface ContactPayload {
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
  motivo: ContactReason;
}

export type ContactReason = 'ventas' | 'soporte' | 'info' | 'hola' | 'contacto' | 'no-reply';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly collectionName = 'contacto';
  private readonly aliasMap: Record<ContactReason, string> = {
    ventas: 'ventas@kalad.com.co',
    soporte: 'soporte@kalad.com.co',
    info: 'info@kalad.com.co',
    hola: 'hola@kalad.com.co',
    contacto: 'contacto@kalad.com.co',
    'no-reply': 'no-reply@kalad.com.co'
  };

  constructor(private firestore: Firestore) {}

  async send(payload: ContactPayload): Promise<void> {
    const alias = this.aliasMap[payload.motivo] ?? this.aliasMap.contacto;
    await addDoc(collection(this.firestore, this.collectionName), {
      ...payload,
      aliasDestino: alias,
      createdAt: serverTimestamp()
    });
  }
}
