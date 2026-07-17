import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

@Injectable({ providedIn: 'root' })
export class EmailServices {
  // CONFIGURACIÓN: Sustituye con tus valores reales de EmailJS
  private readonly serviceID = 'service_p1gef1a';
  private readonly publicKey = 'zwpiAkNTP3O-Pu5wt';
  private readonly templateID = 'template_ke6sxqa';

  async enviarCorreoPedido(pedido: any) {

    const folio = pedido.folio;
    const totalFormateado = Number(pedido.total).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });

    // 1. Generar la tabla de productos usando tu misma lógica
    const tablaProductos = this.generarTablaProductos(pedido.productos);

    // 2. Construir los HTML (usando los templates que proporcionaste)
    const htmlCliente = this.getHtmlCliente(pedido, folio, totalFormateado, tablaProductos);
    const htmlAdmin = this.getHtmlAdmin(pedido, folio, totalFormateado, tablaProductos);

    try {
      // Enviar al Administrador
      await emailjs.send(this.serviceID, this.templateID, {
        to_email: 'lauvillalobosc1@gmail.com',
        subject_dinamico: "🚨 Nuevo Pedido - " + folio,
        html_contenido: htmlAdmin
      }, this.publicKey);

      // Enviar al Cliente
      if (pedido.clienteEmail) {
        await emailjs.send(this.serviceID, this.templateID, {
          to_email: pedido.clienteEmail,
          subject_dinamico: "✅ Confirmación de tu pedido - " + folio,
          html_contenido: htmlCliente
        }, this.publicKey);
      }
      console.log("¡Correos enviados con éxito!");
    } catch (error) {
      console.error("Error al enviar con EmailJS:", error);
      throw error;
    }
  }

  // --- MÉTODOS AUXILIARES ---

  private generarTablaProductos(productos: any[]): string {
    let tabla = `
      <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">📦 Producto</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cant.</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
        </tr>`;

    productos.forEach(p => {
      const subtotal = p.precio * p.cantidad;
      tabla += `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${p.nombre}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${subtotal.toFixed(2)}</td>
        </tr>`;
    });
    return tabla + `</table>`;
  }

  private getHtmlCliente(pedido: any, folio: string, total: string, tabla: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #28a745; text-align: center;">✅ CONFIRMACIÓN DE COMPRA</h2>
        <p>Hola <strong>${pedido.clienteNombre}</strong>, hemos registrado tu pedido con éxito.</p>
        <div style="background-color: #f9f9f9; border-left: 5px solid #28a745; padding: 15px; margin: 20px 0;">
          <span style="font-size: 18px;">🎫 <strong>FOLIO:</strong> ${folio}</span>
        </div>
        <p>🛍️ <strong>TU CARRITO:</strong></p>
        ${tabla}
        <div style="text-align: right; margin-top: 20px;">
          <p style="font-size: 20px; color: #333;">💰 <strong>TOTAL A PAGAR:</strong> <span style="color: #28a745;">${total}</span></p>
          <p style="color: #d9534f;">💳 <strong>ESTADO DE PAGO:</strong> Falta pago</p>
        </div>
        <div style="margin-top: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
          <h3 style="color: #2563eb; margin-top: 0;">Datos de Pago (BBVA)</h3>
          <p style="margin: 5px 0;"><strong>Número de cuenta:</strong> 1575788351</p>
          <p style="margin: 5px 0;"><strong>CLABE Interbancaria:</strong> 012180015757883512</p>
          <p style="margin: 5px 0;"><strong>Número de tarjeta:</strong> 4152314453528153</p>
          <div style="margin-top: 15px; padding: 10px; background-color: #e0f2fe; border-radius: 5px; border: 1px solid #bae6fd; color: #0369a1;">
            Una vez realizada tu transferencia, envía el comprobante al: <strong><a href="https://wa.me/525575044042" target="_blank" class="fw-bold text-decoration-none">55 7504 4042</a></strong>
          </div>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong>* IMPORTANTE:</strong><br>
          Estamos preparando tus productos. Te notificaremos por este medio cuando tu pedido cambie a "Pagado" o "Entregado".<br><br>
          ¡Gracias por tu preferencia!
        </p>
      </div>`;
  }

  private getHtmlAdmin(pedido: any, folio: string, total: string, tabla: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #d9534f; padding: 20px;">
        <h2 style="color: #d9534f; text-align: center;">🚨 NUEVO PEDIDO RECIBIDO</h2>
        <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px;">
          <p style="margin: 5px 0;">📌 <strong>DATOS DEL PEDIDO</strong></p>
          <hr style="border: 0; border-top: 1px solid #feb2b2;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Cliente:</strong> ${pedido.clienteNombre} (${pedido.clienteEmail})</p>
          <p><strong>Total:</strong> ${total}</p>
          <p><strong>Estatus:</strong> Solicitado</p>
        </div>
        <p style="margin-top: 20px;">📦 <strong>DETALLE DE PRODUCTOS:</strong></p>
        ${tabla}
        <p style="text-align: center; margin-top: 25px; font-size: 13px; color: #555;">
          <i>Acceda al sistema administrativo para gestionar la entrega y validar el pago.</i>
        </p>
      </div>`;
  }
}