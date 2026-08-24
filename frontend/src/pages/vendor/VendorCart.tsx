import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import cartService from '../../services/cartService';
import type { Cart, CartItem, CheckoutResult } from '../../types';

// ─── Checkout Success Modal ────────────────────────────────────────────────────
interface SuccessModalProps {
    result: CheckoutResult;
    onClose: () => void;
}

function CheckoutSuccessModal({ result, onClose }: SuccessModalProps) {
    const navigate = useNavigate();
    return (
        <div style={overlay}>
            <div style={successModal}>
                <div style={successIcon}>🎉</div>
                <h2 style={successTitle}>Order Placed!</h2>
                <p style={successSub}>{result.message}</p>
                <div style={successCard}>
                    <div style={successRow}><span style={successLabel}>Order #</span><span style={successValue}>{result.order_number}</span></div>
                    <div style={successRow}><span style={successLabel}>Supplier</span><span style={successValue}>{result.supplier_company}</span></div>
                    <div style={successRow}><span style={successLabel}>Items</span><span style={successValue}>{result.item_count}</span></div>
                    <div style={successRow}><span style={successLabel}>Total</span><span style={{ ...successValue, color: '#22c55e', fontWeight: 800, fontSize: 18 }}>₹{Number(result.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button style={cancelBtn} onClick={onClose}>Continue Shopping</button>
                    <button style={primaryBtnGreen} onClick={() => navigate('/vendor/orders')}>View Orders</button>
                </div>
            </div>
        </div>
    );
}

// ─── Cart Group (one per supplier) ────────────────────────────────────────────
interface CartGroupProps {
    cart: Cart;
    onQuantityChange: (itemId: string, qty: number) => Promise<void>;
    onRemoveItem: (itemId: string) => Promise<void>;
    onCheckout: (cartId: string) => void;
    loading: boolean;
}

function CartGroup({ cart, onQuantityChange, onRemoveItem, onCheckout, loading }: CartGroupProps) {
    const [localQtys, setLocalQtys] = useState<Record<string, number>>({});

    useEffect(() => {
        const initial: Record<string, number> = {};
        cart.items.forEach(i => { initial[i.id] = i.quantity; });
        setLocalQtys(initial);
    }, [cart.items]);

    const handleQtyBlur = async (itemId: string) => {
        const newQty = localQtys[itemId] ?? 1;
        const current = cart.items.find(i => i.id === itemId);
        if (current && newQty !== current.quantity && newQty >= 1) {
            await onQuantityChange(itemId, newQty);
        }
    };

    const hasPriceChanges = cart.has_price_changes;

    return (
        <div style={cartCard}>
            {/* Supplier header */}
            <div style={cartCardHeader}>
                <div style={supplierBadge}>🏭</div>
                <div>
                    <div style={supplierName}>{cart.supplier?.company_name ?? 'Unknown Supplier'}</div>
                    <div style={supplierMeta}>{cart.item_count} item{cart.item_count !== 1 ? 's' : ''} in this cart</div>
                </div>
                {hasPriceChanges && (
                    <div style={priceChangedBadge}>⚠️ Price changed</div>
                )}
            </div>

            {/* Items */}
            <div style={itemsSection}>
                {cart.items.map(item => (
                    <CartItemRow
                        key={item.id}
                        item={item}
                        localQty={localQtys[item.id] ?? item.quantity}
                        onQtyChange={(qty) => setLocalQtys(prev => ({ ...prev, [item.id]: qty }))}
                        onQtyBlur={() => handleQtyBlur(item.id)}
                        onRemove={() => onRemoveItem(item.id)}
                    />
                ))}
            </div>

            {/* Footer */}
            <div style={cartFooter}>
                <div style={subtotalSection}>
                    <span style={subtotalLabel}>Subtotal</span>
                    <span style={subtotalAmount}>
                        ₹{Number(cart.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <button
                    style={{ ...checkoutBtn, opacity: loading ? 0.6 : 1 }}
                    onClick={() => onCheckout(cart.id)}
                    disabled={loading}
                >
                    {loading ? 'Placing Order...' : 'Checkout →'}
                </button>
            </div>
        </div>
    );
}

// ─── Cart Item Row ─────────────────────────────────────────────────────────────
interface CartItemRowProps {
    item: CartItem;
    localQty: number;
    onQtyChange: (qty: number) => void;
    onQtyBlur: () => void;
    onRemove: () => void;
}

function CartItemRow({ item, localQty, onQtyChange, onQtyBlur, onRemove }: CartItemRowProps) {
    const product = item.product;
    return (
        <div style={itemRow}>
            {/* Product info */}
            <div style={itemInfo}>
                <div style={itemName}>{product?.name ?? 'Unknown Product'}</div>
                <div style={itemMeta}>
                    {product?.sku && <span style={itemSku}>{product.sku}</span>}
                    <span style={itemUnit}>{product?.unit}</span>
                    {item.price_changed && (
                        <span style={priceChangedTag}>was ₹{Number(item.unit_price).toFixed(2)}</span>
                    )}
                </div>
            </div>

            {/* Price */}
            <div style={itemPriceCol}>
                <div style={itemCurrentPrice}>₹{Number(item.current_price ?? item.unit_price).toFixed(2)}</div>
                <div style={itemPerUnit}>per {product?.unit}</div>
            </div>

            {/* Quantity control */}
            <div style={qtyControl}>
                <button
                    style={qtyBtn}
                    onClick={() => { if (localQty > 1) { onQtyChange(localQty - 1); onQtyBlur(); } }}
                    disabled={localQty <= 1}
                >−</button>
                <input
                    type="number"
                    min={1}
                    style={qtyInput}
                    value={localQty}
                    onChange={e => onQtyChange(parseInt(e.target.value, 10) || 1)}
                    onBlur={onQtyBlur}
                />
                <button
                    style={qtyBtn}
                    onClick={() => { onQtyChange(localQty + 1); onQtyBlur(); }}
                >+</button>
            </div>

            {/* Subtotal */}
            <div style={itemSubtotal}>
                ₹{(Number(item.current_price ?? item.unit_price) * localQty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>

            {/* Remove */}
            <button style={removeBtn} onClick={onRemove} title="Remove item">✕</button>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function VendorCart() {
    const [carts, setCarts] = useState<Cart[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [checkoutSuccess, setCheckoutSuccess] = useState<CheckoutResult | null>(null);
    const [checkoutError, setCheckoutError] = useState<string>('');

    const fetchCarts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await cartService.listCarts();
            setCarts(res.data.carts);
        } catch (err: any) {
            setError(err?.response?.data?.error?.message ?? 'Failed to load carts.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCarts(); }, [fetchCarts]);

    const handleQuantityChange = async (itemId: string, qty: number) => {
        try {
            const res = await cartService.updateItem(itemId, qty);
            setCarts(prev => prev.map(c => c.id === res.data.id ? res.data : c));
        } catch (err: any) {
            console.error('Quantity update failed:', err);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        try {
            const res = await cartService.removeItem(itemId);
            setCarts(prev => {
                const updatedCart = res.data;
                if (updatedCart.item_count === 0) {
                    return prev.filter(c => c.id !== updatedCart.id);
                }
                return prev.map(c => c.id === updatedCart.id ? updatedCart : c);
            });
        } catch (err: any) {
            console.error('Remove item failed:', err);
        }
    };

    const handleCheckout = async (cartId: string) => {
        setCheckoutError('');
        setCheckoutLoading(cartId);
        try {
            const res = await cartService.checkout(cartId, {});
            setCarts(prev => prev.filter(c => c.id !== cartId));
            setCheckoutSuccess(res.data);
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message ?? 'Checkout failed. Please try again.';
            setCheckoutError(msg);
        } finally {
            setCheckoutLoading(null);
        }
    };

    const totalItems = carts.reduce((sum, c) => sum + c.item_count, 0);
    const grandTotal = carts.reduce((sum, c) => sum + Number(c.subtotal), 0);

    return (
        <div style={page}>
            {/* Header */}
            <div style={pageHeader}>
                <div>
                    <h1 style={pageTitle}>My Cart</h1>
                    <p style={pageSubtitle}>
                        {carts.length} supplier cart{carts.length !== 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''}
                    </p>
                </div>
                {carts.length > 0 && (
                    <div style={grandTotalBadge}>
                        Grand Total: <strong>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                )}
            </div>

            {/* Checkout error */}
            {checkoutError && (
                <div style={errorBanner}>
                    ⚠️ {checkoutError}
                    <button style={dismissBtn} onClick={() => setCheckoutError('')}>✕</button>
                </div>
            )}

            {/* States */}
            {loading ? (
                <div style={centerMsg}>
                    <div style={spinner} />
                    <p style={{ color: '#94a3b8', marginTop: 16 }}>Loading your carts...</p>
                </div>
            ) : error ? (
                <div style={errorBannerFull}>{error}</div>
            ) : carts.length === 0 ? (
                <EmptyCartState />
            ) : (
                <div style={cartsLayout}>
                    {carts.map(cart => (
                        <CartGroup
                            key={cart.id}
                            cart={cart}
                            onQuantityChange={handleQuantityChange}
                            onRemoveItem={handleRemoveItem}
                            onCheckout={handleCheckout}
                            loading={checkoutLoading === cart.id}
                        />
                    ))}
                </div>
            )}

            {/* Success modal */}
            {checkoutSuccess && (
                <CheckoutSuccessModal
                    result={checkoutSuccess}
                    onClose={() => { setCheckoutSuccess(null); fetchCarts(); }}
                />
            )}
        </div>
    );
}

function EmptyCartState() {
    const navigate = useNavigate();
    return (
        <div style={emptyWrap}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <h3 style={{ color: '#c7d2fe', margin: '0 0 8px' }}>Your cart is empty</h3>
            <p style={{ color: '#64748b', marginBottom: 24, textAlign: 'center', maxWidth: 320 }}>
                Browse the product catalog and add items to start a purchase order with a supplier.
            </p>
            <button style={primaryBtn} onClick={() => navigate('/vendor/catalog')}>
                Browse Catalog →
            </button>
        </div>
    );
}

// ─── Inline styles ─────────────────────────────────────────────────────────────
const page: React.CSSProperties = {
    padding: '32px 28px',
    maxWidth: 900,
    margin: '0 auto',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
};
const pageHeader: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
};
const pageTitle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #c7d2fe, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
};
const pageSubtitle: React.CSSProperties = { color: '#64748b', margin: '6px 0 0', fontSize: 14 };
const grandTotalBadge: React.CSSProperties = {
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: 10,
    padding: '10px 18px',
    color: '#86efac',
    fontSize: 14,
};
const cartsLayout: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20 };
const cartCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16,
    overflow: 'hidden',
};
const cartCardHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '18px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
};
const supplierBadge: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(99,102,241,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
};
const supplierName: React.CSSProperties = { fontWeight: 700, fontSize: 15, color: '#c7d2fe' };
const supplierMeta: React.CSSProperties = { fontSize: 12, color: '#64748b', marginTop: 2 };
const priceChangedBadge: React.CSSProperties = {
    marginLeft: 'auto',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(245,158,11,0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.3)',
};
const itemsSection: React.CSSProperties = { padding: '0 20px' };
const itemRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
};
const itemInfo: React.CSSProperties = { flex: 1, minWidth: 0 };
const itemName: React.CSSProperties = { fontWeight: 600, color: '#e2e8f0', fontSize: 14, lineHeight: 1.3 };
const itemMeta: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' };
const itemSku: React.CSSProperties = { fontSize: 11, color: '#475569', fontFamily: 'monospace' };
const itemUnit: React.CSSProperties = {
    fontSize: 11, color: '#475569',
    background: 'rgba(255,255,255,0.05)',
    padding: '1px 7px', borderRadius: 4,
};
const priceChangedTag: React.CSSProperties = {
    fontSize: 11, color: '#f59e0b',
    background: 'rgba(245,158,11,0.12)',
    padding: '1px 7px', borderRadius: 4,
    textDecoration: 'line-through',
};
const itemPriceCol: React.CSSProperties = { textAlign: 'right', minWidth: 80 };
const itemCurrentPrice: React.CSSProperties = { fontWeight: 700, color: '#a5b4fc', fontSize: 14 };
const itemPerUnit: React.CSSProperties = { fontSize: 11, color: '#475569', marginTop: 2 };
const qtyControl: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 0 };
const qtyBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    borderRadius: 0,
};
const qtyInput: React.CSSProperties = {
    width: 48,
    height: 30,
    textAlign: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderLeft: 'none',
    borderRight: 'none',
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
};
const itemSubtotal: React.CSSProperties = {
    minWidth: 90,
    textAlign: 'right',
    fontWeight: 700,
    color: '#f1f5f9',
    fontSize: 14,
};
const removeBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'color 0.15s',
};
const cartFooter: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
};
const subtotalSection: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const subtotalLabel: React.CSSProperties = { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' };
const subtotalAmount: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: '#e2e8f0' };
const checkoutBtn: React.CSSProperties = {
    padding: '12px 28px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
};
const centerMsg: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 80,
};
const spinner: React.CSSProperties = {
    width: 36, height: 36,
    border: '3px solid rgba(99,102,241,0.2)',
    borderTop: '3px solid #818cf8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
};
const errorBanner: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 10, padding: '14px 18px',
    color: '#fca5a5', fontSize: 14, marginBottom: 20,
};
const errorBannerFull: React.CSSProperties = {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 10, padding: '14px 18px',
    color: '#fca5a5', fontSize: 14,
};
const dismissBtn: React.CSSProperties = {
    background: 'none', border: 'none',
    color: '#ef4444', cursor: 'pointer', fontSize: 15,
};
const emptyWrap: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '80px 20px',
};
const primaryBtn: React.CSSProperties = {
    padding: '12px 28px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
};
const primaryBtnGreen: React.CSSProperties = {
    ...primaryBtn,
    background: 'linear-gradient(135deg, #059669, #10b981)',
    flex: 1,
};
const cancelBtn: React.CSSProperties = {
    ...primaryBtn,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#94a3b8',
    flex: 1,
};
// Success modal
const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
};
const successModal: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0f172a, #1e1e3a)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: 20, padding: '36px 32px',
    width: '100%', maxWidth: 440,
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
    textAlign: 'center',
};
const successIcon: React.CSSProperties = { fontSize: 52, marginBottom: 16 };
const successTitle: React.CSSProperties = {
    fontSize: 24, fontWeight: 800,
    color: '#86efac', margin: '0 0 8px',
};
const successSub: React.CSSProperties = { color: '#64748b', fontSize: 14, marginBottom: 22 };
const successCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
};
const successRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const successLabel: React.CSSProperties = { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const successValue: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#e2e8f0' };
