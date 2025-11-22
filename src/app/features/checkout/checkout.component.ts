import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { WompiService } from "../../shared/services/wompi.service";
import { CartService, CartItem } from "../../shared/services/cart.service";
import { AuthService } from "../../shared/services/auth.service";
import { PedidosService } from "../../shared/services/pedidos.service";
import { UserDataService } from "../../shared/services/user-data.service";
import { ProductService } from "../../shared/services/product.service";
import { firstValueFrom, take } from "rxjs";
import { CouponService } from "../../shared/services/coupon.service";
import { environment } from "../../../environments/environment";
import { FormsModule } from "@angular/forms";
import { AnalyticsService } from "../../shared/services/analytics.service";
import { Product } from "../../shared/models/product.model";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./checkout.component.html",
  styleUrl: "./checkout.component.css"
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutForm!: FormGroup;
  isProcessing = false;
  cartItems: CartItem[] = [];
  couponCode = "";
  discount = 0;
  shipping = 0;
  suggestions: Product[] = [];
  private purchaseTracked = false;
  private abandonTracked = false;

  constructor(
    private fb: FormBuilder,
    private wompiService: WompiService,
    private cartService: CartService,
    private authService: AuthService,
    private pedidosService: PedidosService,
    private userDataService: UserDataService,
    private couponService: CouponService,
    private productService: ProductService,
    private router: Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.cartItems = this.cartService.items;
    this.computeShipping(this.getSubtotal());
    this.loadSuggestions();
  }

  ngOnDestroy(): void {
    if (!this.purchaseTracked && !this.abandonTracked && this.cartItems.length) {
      this.analytics.trackCartAbandoned(this.cartItems, this.getTotal(), "checkout_exit");
      this.abandonTracked = true;
    }
  }

  initializeForm(): void {
    this.checkoutForm = this.fb.group({
      fullName: ["", [Validators.required, Validators.minLength(3)]],
      email: ["", [Validators.required, Validators.email]],
      phone: ["", [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      documentType: ["CC", Validators.required],
      documentNumber: ["", [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      address: ["", Validators.required],
      city: ["", Validators.required],
      department: ["", Validators.required],
      postalCode: ["", Validators.pattern(/^[0-9]{6}$/)],
      notes: [""]
    });
  }

  get f() {
    return this.checkoutForm.controls;
  }

  getSubtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.precio * item.qty, 0);
  }

  getCommission(): number {
    const cfg = environment.wompi as any;
    const pct = Math.max(0, Number(cfg.feePercent ?? 0));
    const fixed = Math.max(0, Number(cfg.feeFixed ?? 0));
    const base = this.getTotal();
    return Math.round(base * pct + fixed);
  }

  getTotal(): number {
    return Math.max(0, this.getSubtotal() + this.shipping - this.discount);
  }

  getTotalInCents(): number {
    return this.getTotal() * 100;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  async applyCoupon(): Promise<void> {
    const code = this.couponCode.trim().toUpperCase();
    const subtotal = this.getSubtotal();
    if (!code) {
      this.discount = 0;
      return;
    }
    try {
      this.discount = await this.couponService.validate(code, subtotal);
    } catch (e) {
      this.discount = 0;
      alert((e as any)?.message || "Cupon invalido");
    }
  }

  computeShipping(subtotal: number): void {
    this.shipping = subtotal >= 200000 || subtotal === 0 ? 0 : 12000;
  }

  private loadSuggestions(): void {
    const baseCollection = this.cartItems[0]?.coleccion ?? null;
    const source$ = baseCollection
      ? this.productService.getProductsByCollection(baseCollection)
      : this.productService.getFeaturedProducts();

    source$.pipe(take(1)).subscribe((products) => {
      this.suggestions = products
        .filter((p) => !this.cartItems.some((item) => item.id === p.id))
        .slice(0, 4);
    });
  }

  addSuggested(product: Product) {
    this.cartService.addProduct(product, 1);
    this.cartItems = this.cartService.items;
    this.computeShipping(this.getSubtotal());
  }

  async processPayment(): Promise<void> {
    if (this.checkoutForm.invalid) {
      this.markFormGroupTouched(this.checkoutForm);
      alert("Por favor completa todos los campos requeridos correctamente.");
      return;
    }

    if (!this.cartItems.length) {
      alert("Tu carrito esta vacio.");
      return;
    }

    const logged = await this.ensureLoggedIn();
    if (!logged) return;

    this.isProcessing = true;

    try {
      const formValue = this.checkoutForm.value;

      // Validar stock antes de cobrar
      const sinStock = await this.validateStock();
      if (sinStock.length) {
        alert(
          `No hay stock suficiente para: ${sinStock
            .map((p) => p.nombre)
            .join(", ")}. Ajusta el carrito e intenta de nuevo.`
        );
        return;
      }

      // Guardar perfil y direccion
      await this.userDataService.saveAuthProfile();
      await this.userDataService.addAddress({
        label: formValue.address || "Envio",
        line1: formValue.address,
        city: formValue.city,
        region: formValue.department,
        postal: formValue.postalCode
      });

      const subtotal = this.getSubtotal();
      this.computeShipping(subtotal);
      await this.applyCoupon();
      const commission = this.getCommission();
      const totals = {
        subtotal,
        shipping: this.shipping,
        discount: this.discount,
        total: this.getTotal(),
        coupon: this.discount ? this.couponCode.trim().toUpperCase() : undefined
      };

      this.analytics.trackBeginCheckout(this.cartItems, totals, this.couponCode);

      // Crear pedido
      const pedidoId = await this.pedidosService.crearPedido(
        this.cartItems.map((i) => ({
          productId: i.id,
          nombre: i.nombre,
          qty: i.qty,
          precio: i.precio,
          color: i.color
        })),
        this.getTotal(),
        "creado",
        {
          subtotal,
          envio: this.shipping,
          descuento: this.discount,
          cupon: this.discount ? this.couponCode.trim().toUpperCase() : undefined,
          comision: commission,
          comisionPorcentaje: Number((environment.wompi as any).feePercent ?? 0),
          comisionFija: Number((environment.wompi as any).feeFixed ?? 0)
        }
      );

      const checkoutConfig = {
        amountInCents: this.getTotalInCents(),
        reference: pedidoId || `KALAD-${Date.now()}`,
        customerData: {
          email: formValue.email,
          fullName: formValue.fullName,
          phoneNumber: formValue.phone,
          phoneNumberPrefix: "+57",
          legalId: formValue.documentNumber,
          legalIdType: formValue.documentType
        },
        shippingAddress: {
          addressLine1: formValue.address,
          city: formValue.city,
          region: formValue.department,
          country: "CO",
          phoneNumber: formValue.phone
        },
        redirectUrl: window.location.origin + "/confirmation"
      };

      await this.wompiService.openCheckout(checkoutConfig, async (tx) => {
        const txId = tx?.id;
        let status = tx?.status?.toLowerCase?.() || "error";

        // Verificar contra API de Wompi para evitar pagos fantasma
        if (txId) {
          try {
            const verified = await this.wompiService.verifyTransaction(txId);
            const verifiedStatus = verified?.status?.toLowerCase?.();
            if (verifiedStatus) {
              status = verifiedStatus;
            }
          } catch (err) {
            console.error("No se pudo verificar la transaccion en Wompi", err);
          }
        }

        const estado =
          status === "approved"
            ? "pagado"
            : status === "declined"
              ? "cancelado"
              : "creado";

        await this.pedidosService.actualizarPedido(pedidoId, {
          estado,
          transaccionId: txId
        });

        // Si se aprueba, descontar stock y reportar compra
        if (status === "approved") {
          await Promise.all(
            this.cartItems.map((item) =>
              this.productService.reduceStock(item.id, item.qty).catch((err) => {
                console.error("No se pudo descontar stock", err);
              })
            )
          );
          this.analytics.trackPurchase(
            pedidoId,
            txId || null,
            this.cartItems,
            {
              subtotal: totals.subtotal,
              shipping: totals.shipping,
              discount: totals.discount,
              total: totals.total,
              coupon: totals.coupon
            }
          );
          this.purchaseTracked = true;
        } else if (!this.abandonTracked) {
          this.analytics.trackCartAbandoned(this.cartItems, totals.total, `checkout_${status}`);
          this.abandonTracked = true;
        }
      });

      this.cartService.clear();
      this.cartItems = [];
      this.router.navigate(["/confirmation"], { queryParams: { id: pedidoId } });
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Ocurrio un error al procesar el pago. Por favor intenta de nuevo.");
    } finally {
      this.isProcessing = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  continueShopping(): void {
    this.router.navigate(["/products"]);
  }

  private async ensureLoggedIn(): Promise<boolean> {
    const logged = await firstValueFrom(this.authService.isLoggedIn$);
    if (logged) return true;
    try {
      await this.authService.loginWithGoogle();
      return true;
    } catch {
      alert("Debes iniciar sesion con Google para completar la compra.");
      return false;
    }
  }

  private async validateStock(): Promise<{ id: string; nombre: string }[]> {
    const sinStock: { id: string; nombre: string }[] = [];
    for (const item of this.cartItems) {
      try {
        const product = await firstValueFrom(this.productService.getProductById(item.id));
        const disponible = Number(product.stock ?? 0);
        if (disponible < item.qty) {
          sinStock.push({ id: item.id, nombre: item.nombre });
        }
      } catch (e) {
        console.error("Error consultando stock", e);
        sinStock.push({ id: item.id, nombre: item.nombre });
      }
    }
    return sinStock;
  }
}
