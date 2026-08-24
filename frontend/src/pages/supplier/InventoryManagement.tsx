import React, { useState, useEffect, useCallback } from 'react';
import inventoryService from '../../services/inventoryService';
import type { InventoryRecord } from '../../types';

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    healthy: { label: 'In Stock', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '●' },
    low_stock: { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '▲' },
    out_of_stock: { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '■' },
};

function stockColor(status: string) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.healthy;
}

// ─── Adjust Modal ──────────────────────────────────────────────────────────────
interface AdjustModalProps {
    record: InventoryRecord;
    onClose: () => void;
    onSuccess: () => void;
}

function AdjustModal({ record, onClose, onSuccess }: AdjustModalProps) {
    const [adjustment, setAdjustment] = useState<string>('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const delta = parseInt(adjustment || '0', 10);
    const newQty = record.quantity_on_hand + delta;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!adjustment || isNaN(delta) || delta === 0) {
            setError('Enter a non-zero adjustment.');
            return;
        }
        setLoading(true);
        try {
            await inventoryService.adjustStock(record.product_id, { adjustment: delta, reason: reason || undefined });
            onSuccess();
        } catch (err: any) {
            setError(err?.response?.data?.error?.message ?? 'Adjustment failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Adjust Stock</h3>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div style={styles.modalProductName}>{record.product?.name}</div>
                <div style={styles.modalMeta}>
                    Current on-hand: <strong>{record.quantity_on_hand}</strong> {record.product?.unit}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.fieldLabel}>Adjustment (+ add / − remove)</label>
                        <input
                            type="number"
                            value={adjustment}
                            onChange={e => setAdjustment(e.target.value)}
                            placeholder="e.g. 50 or -10"
                            style={styles.input}
                        />
                    </div>
                    {adjustment !== '' && !isNaN(delta) && (
                        <div style={{
                            ...styles.previewBox,
                            borderColor: newQty < 0 ? '#ef4444' : 'rgba(99,102,241,0.5)',
                        }}>
                            <span>New on-hand:</span>
                            <span style={{ color: newQty < 0 ? '#ef4444' : '#a5b4fc', fontWeight: 700 }}>
                                {newQty} {record.product?.unit}
                            </span>
                        </div>
                    )}
                    <div style={styles.fieldGroup}>
                        <label style={styles.fieldLabel}>Reason (optional)</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Stock received, Damaged, Counted"
                            style={styles.input}
                        />
                    </div>
                    {error && <div style={styles.errorMsg}>{error}</div>}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" style={styles.submitBtn} disabled={loading}>
                            {loading ? 'Adjusting...' : 'Apply Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit Levels Modal ─────────────────────────────────────────────────────────
interface EditLevelsModalProps {
    record: InventoryRecord;
    onClose: () => void;
    onSuccess: () => void;
}

function EditLevelsModal({ record, onClose, onSuccess }: EditLevelsModalProps) {
    const [onHand, setOnHand] = useState(String(record.quantity_on_hand));
    const [reorderLevel, setReorderLevel] = useState(String(record.reorder_level));
    const [reorderQty, setReorderQty] = useState(String(record.reorder_quantity));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await inventoryService.updateInventory(record.product_id, {
                quantity_on_hand: parseInt(onHand, 10),
                reorder_level: parseInt(reorderLevel, 10),
                reorder_quantity: parseInt(reorderQty, 10),
            });
            onSuccess();
        } catch (err: any) {
            setError(err?.response?.data?.error?.message ?? 'Update failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Edit Inventory Levels</h3>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div style={styles.modalProductName}>{record.product?.name}</div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                        { label: 'Quantity On Hand', value: onHand, set: setOnHand, help: 'Physical stock count' },
                        { label: 'Reorder Level', value: reorderLevel, set: setReorderLevel, help: 'Alert when available drops below this' },
                        { label: 'Reorder Quantity', value: reorderQty, set: setReorderQty, help: 'Typical batch size to order' },
                    ].map(f => (
                        <div key={f.label} style={styles.fieldGroup}>
                            <label style={styles.fieldLabel}>{f.label}</label>
                            <input
                                type="number"
                                min="0"
                                value={f.value}
                                onChange={e => f.set(e.target.value)}
                                style={styles.input}
                            />
                            <span style={styles.fieldHint}>{f.help}</span>
                        </div>
                    ))}
                    {error && <div style={styles.errorMsg}>{error}</div>}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" style={styles.submitBtn} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryManagement() {
    const [inventory, setInventory] = useState<InventoryRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'healthy' | 'low_stock' | 'out_of_stock'>('all');
    const [search, setSearch] = useState('');
    const [adjustTarget, setAdjustTarget] = useState<InventoryRecord | null>(null);
    const [editTarget, setEditTarget] = useState<InventoryRecord | null>(null);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await inventoryService.listMyInventory(1, 100);
            setInventory(res.data.items);
            setTotal(res.data.total);
        } catch (err: any) {
            setError(err?.response?.data?.error?.message ?? 'Failed to load inventory.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const filtered = inventory.filter(inv => {
        const matchesFilter = filter === 'all' || inv.stock_status === filter;
        const matchesSearch = !search ||
            inv.product?.name.toLowerCase().includes(search.toLowerCase()) ||
            (inv.product?.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (inv.product?.category ?? '').toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Summary counts
    const counts = {
        all: inventory.length,
        healthy: inventory.filter(i => i.stock_status === 'healthy').length,
        low_stock: inventory.filter(i => i.stock_status === 'low_stock').length,
        out_of_stock: inventory.filter(i => i.stock_status === 'out_of_stock').length,
    };

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Inventory Management</h1>
                    <p style={styles.pageSubtitle}>{total} product{total !== 1 ? 's' : ''} · Track, adjust, and manage your stock levels</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
                {[
                    { key: 'all', label: 'Total Products', color: '#a5b4fc' },
                    { key: 'healthy', label: 'In Stock', color: '#22c55e' },
                    { key: 'low_stock', label: 'Low Stock', color: '#f59e0b' },
                    { key: 'out_of_stock', label: 'Out of Stock', color: '#ef4444' },
                ].map(card => (
                    <button
                        key={card.key}
                        style={{
                            ...styles.summaryCard,
                            borderColor: filter === card.key ? card.color : 'rgba(255,255,255,0.08)',
                            background: filter === card.key
                                ? `linear-gradient(135deg, rgba(${hexToRgb(card.color)},0.15), rgba(${hexToRgb(card.color)},0.05))`
                                : 'rgba(255,255,255,0.04)',
                        }}
                        onClick={() => setFilter(card.key as any)}
                    >
                        <div style={{ ...styles.summaryCount, color: card.color }}>
                            {counts[card.key as keyof typeof counts]}
                        </div>
                        <div style={styles.summaryLabel}>{card.label}</div>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={styles.searchBar}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                    style={styles.searchInput}
                    placeholder="Search by product name, SKU, or category..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && (
                    <button style={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div style={styles.centerMsg}>
                    <div style={styles.spinner} />
                    <p style={{ color: '#94a3b8', marginTop: 16 }}>Loading inventory...</p>
                </div>
            ) : error ? (
                <div style={styles.errorBanner}>{error}</div>
            ) : filtered.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📦</div>
                    <p style={styles.emptyText}>
                        {search || filter !== 'all' ? 'No products match your filters.' : 'No products in your catalog yet.'}
                    </p>
                    {(search || filter !== 'all') && (
                        <button style={styles.resetBtn} onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button>
                    )}
                </div>
            ) : (
                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                {['Product', 'SKU', 'Category', 'On Hand', 'Reserved', 'Available', 'Reorder At', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={styles.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv, idx) => {
                                const sc = stockColor(inv.stock_status);
                                return (
                                    <tr key={inv.id} style={{ ...styles.tr, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                        <td style={styles.td}>
                                            <div style={styles.productName}>{inv.product?.name ?? '—'}</div>
                                            <div style={styles.productUnit}>{inv.product?.unit}</div>
                                        </td>
                                        <td style={{ ...styles.td, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                                            {inv.product?.sku ?? <span style={{ opacity: 0.4 }}>—</span>}
                                        </td>
                                        <td style={{ ...styles.td, color: '#94a3b8', fontSize: 13 }}>
                                            {inv.product?.category ?? <span style={{ opacity: 0.4 }}>—</span>}
                                        </td>
                                        <td style={{ ...styles.td, fontWeight: 600, color: '#e2e8f0' }}>
                                            {inv.quantity_on_hand}
                                        </td>
                                        <td style={{ ...styles.td, color: '#f59e0b' }}>
                                            {inv.quantity_reserved}
                                        </td>
                                        <td style={{ ...styles.td, fontWeight: 700, color: inv.available_quantity > 0 ? '#22c55e' : '#ef4444' }}>
                                            {inv.available_quantity}
                                        </td>
                                        <td style={{ ...styles.td, color: '#94a3b8' }}>{inv.reorder_level}</td>
                                        <td style={styles.td}>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: 20,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: '0.03em',
                                                color: sc.color,
                                                background: sc.bg,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {sc.icon} {sc.label}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    style={styles.actionBtnPrimary}
                                                    onClick={() => setAdjustTarget(inv)}
                                                    title="Adjust stock"
                                                >
                                                    ± Adjust
                                                </button>
                                                <button
                                                    style={styles.actionBtnSecondary}
                                                    onClick={() => setEditTarget(inv)}
                                                    title="Edit levels"
                                                >
                                                    ✎ Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {adjustTarget && (
                <AdjustModal
                    record={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={() => { setAdjustTarget(null); fetchInventory(); }}
                />
            )}
            {editTarget && (
                <EditLevelsModal
                    record={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSuccess={() => { setEditTarget(null); fetchInventory(); }}
                />
            )}
        </div>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: '32px 28px',
        maxWidth: 1280,
        margin: '0 auto',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 28,
    },
    pageTitle: {
        fontSize: 26,
        fontWeight: 800,
        background: 'linear-gradient(135deg, #c7d2fe, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: 0,
        lineHeight: 1.2,
    },
    pageSubtitle: {
        color: '#64748b',
        margin: '6px 0 0',
        fontSize: 14,
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        marginBottom: 22,
    },
    summaryCard: {
        padding: '18px 20px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        color: 'inherit',
    },
    summaryCount: {
        fontSize: 30,
        fontWeight: 800,
        lineHeight: 1,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '0 14px',
        marginBottom: 20,
        gap: 10,
    },
    searchIcon: { fontSize: 14, opacity: 0.5 },
    searchInput: {
        flex: 1,
        background: 'none',
        border: 'none',
        outline: 'none',
        color: '#e2e8f0',
        fontSize: 14,
        padding: '12px 0',
        fontFamily: 'inherit',
    },
    clearBtn: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: 14,
        padding: 4,
    },
    tableWrap: {
        overflowX: 'auto',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#475569',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        whiteSpace: 'nowrap',
    },
    tr: {
        transition: 'background 0.15s',
    },
    td: {
        padding: '14px 16px',
        fontSize: 13,
        color: '#e2e8f0',
        verticalAlign: 'middle',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
    },
    productName: {
        fontWeight: 600,
        color: '#c7d2fe',
        fontSize: 13,
    },
    productUnit: {
        color: '#475569',
        fontSize: 11,
        marginTop: 2,
    },
    actionBtnPrimary: {
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 7,
        border: '1px solid rgba(99,102,241,0.5)',
        background: 'rgba(99,102,241,0.15)',
        color: '#a5b4fc',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
    },
    actionBtnSecondary: {
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 7,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: '#94a3b8',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
    },
    centerMsg: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
    },
    spinner: {
        width: 36,
        height: 36,
        border: '3px solid rgba(99,102,241,0.2)',
        borderTop: '3px solid #818cf8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    errorBanner: {
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 10,
        padding: '16px 20px',
        color: '#fca5a5',
        fontSize: 14,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 20px',
        color: '#475569',
    },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 15, marginBottom: 16 },
    resetBtn: {
        padding: '8px 20px',
        borderRadius: 8,
        border: '1px solid rgba(99,102,241,0.4)',
        background: 'rgba(99,102,241,0.15)',
        color: '#a5b4fc',
        cursor: 'pointer',
        fontSize: 13,
    },
    // Modal styles
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modal: {
        background: 'linear-gradient(135deg, #1e1e3a, #111827)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        padding: 28,
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: '#c7d2fe',
        margin: 0,
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: 18,
        lineHeight: 1,
    },
    modalProductName: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
    },
    modalMeta: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 16,
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    fieldHint: {
        fontSize: 11,
        color: '#475569',
    },
    input: {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 9,
        padding: '10px 14px',
        color: '#e2e8f0',
        fontSize: 14,
        outline: 'none',
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
    },
    previewBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderRadius: 9,
        border: '1px solid rgba(99,102,241,0.4)',
        background: 'rgba(99,102,241,0.08)',
        fontSize: 14,
        color: '#94a3b8',
    },
    errorMsg: {
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#fca5a5',
        fontSize: 13,
    },
    cancelBtn: {
        flex: 1,
        padding: '11px',
        borderRadius: 9,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
    },
    submitBtn: {
        flex: 2,
        padding: '11px',
        borderRadius: 9,
        border: 'none',
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'inherit',
        boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
    },
};
