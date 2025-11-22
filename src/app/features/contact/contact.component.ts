import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, ContactReason } from '../../shared/services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  nombre = '';
  correo = '';
  asunto = '';
  mensaje = '';
  motivo: ContactReason = 'contacto';
  sending = false;

  constructor(private contactService: ContactService) {}

  async enviar() {
    if (!this.nombre || !this.correo || !this.asunto || !this.mensaje) {
      alert('Por favor completa todos los campos.');
      return;
    }

    this.sending = true;
    try {
      await this.contactService.send({
        nombre: this.nombre,
        correo: this.correo,
        asunto: this.asunto,
        mensaje: this.mensaje,
        motivo: this.motivo
      });
      alert('Mensaje enviado correctamente. Te contactaremos pronto.');
      this.nombre = '';
      this.correo = '';
      this.asunto = '';
      this.mensaje = '';
      this.motivo = 'contacto';
    } catch (e) {
      console.error('No se pudo enviar el mensaje', e);
      alert('No se pudo enviar tu mensaje. Intenta de nuevo.');
    } finally {
      this.sending = false;
    }
  }
}
