export default function GhostMarquee() {
  const text =
    "OBSESIÓN POR EL DETALLE \u00B7 EL ESTÁNDAR DEFINITIVO \u00B7 ";
  const repeatedText = text.repeat(4);

  return (
    <section
      className="w-full overflow-hidden py-8 md:py-12"
      style={{ background: "#050505" }}
    >
      <div className="flex whitespace-nowrap animate-marquee">
        <span
          className="font-dm font-black tracking-[-0.04em] shrink-0"
          style={{
            fontSize: "clamp(80px, 15vw, 200px)",
            color: "#000000",
            lineHeight: 1,
          }}
        >
          {repeatedText}
        </span>
        <span
          className="font-dm font-black tracking-[-0.04em] shrink-0"
          style={{
            fontSize: "clamp(80px, 15vw, 200px)",
            color: "#000000",
            lineHeight: 1,
          }}
        >
          {repeatedText}
        </span>
      </div>
    </section>
  );
}
