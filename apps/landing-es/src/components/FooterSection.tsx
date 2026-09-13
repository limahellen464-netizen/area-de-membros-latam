const FooterSection = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-10">
      <div className="max-w-3xl mx-auto px-6 text-center space-y-4 text-[14px] leading-[1.6] opacity-80">
        <p>
          LM LTDA Digital es una empresa de Brasil, constituida en el estado de
          Mato Grosso. Operamos en el mercado digital y ofrecemos productos
          digitales, mentorías personalizadas y servicios de consultoría
          centrados en el desarrollo personal y las relaciones.
        </p>
        <p>
          Todos los productos y servicios se entregan 100% en línea, con un
          firme compromiso con la satisfacción del cliente, la transformación
          y el soporte continuo.
        </p>
        <p>© 2026 LM LTDA DIGITAL - Todos los derechos reservados.</p>
        <div className="flex justify-center gap-6">
          <a
            href="/terminos-de-uso"
            className="underline hover:opacity-70 transition-opacity"
          >
            términos de uso
          </a>
          <a
            href="/politica-de-privacidad"
            className="underline hover:opacity-70 transition-opacity"
          >
            política de privacidad
          </a>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
