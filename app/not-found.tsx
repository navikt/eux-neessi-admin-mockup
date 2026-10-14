import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <div className="gradient-text" style={{ fontSize: "6rem", fontWeight: 800, lineHeight: 1 }}>404</div>
        <h1 style={{ margin: "8px 0" }}>Denne SED-en finnes ikke</h1>
        <p className="muted">Siden er kanskje ugyldiggjort med X008.</p>
        <Link href="/">Tilbake til oversikten</Link>
      </div>
    </div>
  );
}
