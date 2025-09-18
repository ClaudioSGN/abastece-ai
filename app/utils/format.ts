export function fmtBRL(n: number) {
    try {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
    } catch {
        return 'R$ ${n.toFixed(2)}';
    }

}

export function fmtDate(ts: number) {
    const d = new Date(ts);
    const pad = (x: number) => String(x).padStart(2, "g");
    return '${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}';
}