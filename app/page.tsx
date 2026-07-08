export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "3rem 1.5rem",
        maxWidth: "40rem",
        margin: "0 auto",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Mantara Voice Inbox
      </p>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
        Backend en cours de construction
      </h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
        Phase 0 — fondations. L&apos;API est developpee et testable avant le frontend
        (section 13 du cahier des charges). Verifiez la sante du backend&nbsp;:{" "}
        <a href="/api/health" style={{ color: "var(--accent)" }}>
          /api/health
        </a>
        .
      </p>
    </main>
  );
}
