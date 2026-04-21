import { ImageResponse } from "next/og";

export const alt = "Ahorro — Personal Finance Coach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0e17 0%, #1a1f2e 60%, #2a2650 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "linear-gradient(135deg, #5b6cff 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: -4,
            }}
          >
            A
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: -4,
            }}
          >
            Ahorro
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 36,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Gestión de gastos compartidos, multi-moneda.
        </div>
      </div>
    ),
    size,
  );
}
