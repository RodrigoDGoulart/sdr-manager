const portfolioUrl = import.meta.env.VITE_PORTFOLIO_URL as string | undefined;

export default function App() {
  return (
    <main
      style={{
        alignItems: 'center',
        color: '#334155',
        display: 'flex',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <section
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          maxWidth: 560,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            alignItems: 'center',
            background: 'rgba(100, 116, 139, 0.08)',
            border: '1px solid rgba(100, 116, 139, 0.16)',
            borderRadius: '50%',
            color: 'rgba(71, 85, 105, 1)',
            display: 'flex',
            height: 96,
            justifyContent: 'center',
            width: 96,
          }}
        >
          <svg
            fill="none"
            height="48"
            viewBox="0 0 24 24"
            width="48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 11V8a5 5 0 0 1 10 0v3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M6 11h12v9H6z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path
              d="M12 15v2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '18px',
            fontWeight: 500,
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          Aplicativo fechado. Caso queira uma demo online, entre em contato:{' '}
          {portfolioUrl ? (
            <a
              href={portfolioUrl}
              rel="noreferrer"
              style={{
                color: '#475569',
                fontWeight: 650,
                overflowWrap: 'anywhere',
              }}
              target="_blank"
            >
              {portfolioUrl}
            </a>
          ) : (
            <span style={{ color: '#64748b', fontWeight: 650 }}>
              portfólio indisponível
            </span>
          )}
        </h1>
      </section>
    </main>
  );
}
