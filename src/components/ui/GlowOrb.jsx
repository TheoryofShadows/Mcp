export default function GlowOrb({ color, size, top, left, delay = 0 }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(80px)",
        opacity: 0.15,
        animation: `pulse-glow 4s ease-in-out ${delay}s infinite`,
        pointerEvents: "none",
      }}
    />
  );
}
