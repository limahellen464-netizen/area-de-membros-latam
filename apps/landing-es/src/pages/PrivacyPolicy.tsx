import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
  <main className="min-h-screen bg-background py-10 text-foreground">
    <article className="prose prose-neutral mx-auto max-w-4xl px-6">
      <Link to="/" className="text-sm font-bold text-primary no-underline">
        Volver a la página principal
      </Link>
      <h1 className="mb-8 mt-6 text-[26px] font-black md:text-[32px]">
        Política de privacidad
      </h1>

      <p>
        Tu privacidad es importante para nosotros. LM LTDA Digital respeta tu
        privacidad respecto de cualquier información que podamos recopilar en
        este sitio y en otros sitios que poseemos y operamos.
      </p>
      <p>
        Solicitamos información personal únicamente cuando es necesaria para
        prestar un servicio. La recopilamos de forma justa y legal, con tu
        conocimiento y consentimiento, e informamos por qué se solicita y cómo
        será utilizada.
      </p>
      <p>
        Conservamos los datos solo durante el tiempo necesario para prestar el
        servicio solicitado. Protegemos la información mediante prácticas
        comercialmente aceptables para evitar pérdidas, robos, accesos no
        autorizados, divulgación, copia, uso o modificación.
      </p>
      <p>
        No compartimos públicamente información de identificación personal ni
        la comunicamos a terceros, salvo cuando la ley lo exige.
      </p>
      <p>
        El sitio puede incluir enlaces a páginas externas que no controlamos.
        No asumimos responsabilidad por el contenido ni por las políticas de
        privacidad de esos sitios.
      </p>
      <p>
        Puedes negarte a proporcionar información personal, aunque esto puede
        impedir que ofrezcamos algunos servicios. El uso continuado del sitio
        se considerará una aceptación de estas prácticas.
      </p>

      <h2>Política de cookies</h2>
      <p>
        Este sitio utiliza cookies, pequeños archivos descargados en tu
        dispositivo, para mejorar la experiencia. Algunas cookies son
        necesarias para el funcionamiento del sitio y otras ayudan a medir el
        rendimiento y la atribución de campañas.
      </p>
      <p>
        Puedes impedir el uso de cookies desde la configuración de tu
        navegador. Desactivarlas puede afectar determinadas funciones de este
        y de otros sitios que visites.
      </p>
      <p>
        También podemos usar cookies proporcionadas por socios de confianza,
        incluidos servicios de publicidad y atribución. Estas cookies permiten
        medir de forma anónima intereses, campañas y referencias de afiliados.
      </p>

      <h2>Responsabilidades del usuario</h2>
      <p>El usuario se compromete a utilizar adecuadamente el contenido y a:</p>
      <ul>
        <li>No participar en actividades ilegales o contrarias a la buena fe y al orden público.</li>
        <li>No difundir contenido racista, xenófobo, ilegal, terrorista o contrario a los derechos humanos.</li>
        <li>No dañar sistemas físicos o informáticos ni distribuir programas maliciosos.</li>
      </ul>

      <h2>Política de cancelación</h2>
      <p>
        LM LTDA Digital mantiene una política de cancelación transparente para
        ofrecer una mejor experiencia a sus usuarios.
      </p>
      <ul>
        <li>El usuario puede solicitar la cancelación de su acceso a través del canal de soporte informado.</li>
        <li>Las solicitudes realizadas dentro del plazo de garantía de 180 días tienen derecho al reembolso total del importe pagado.</li>
        <li>Después de 180 días, la cancelación no genera derecho al reembolso de pagos anteriores.</li>
        <li>Las solicitudes deben enviarse exclusivamente al canal de soporte proporcionado.</li>
        <li>LM LTDA Digital puede actualizar esta política sin previo aviso.</li>
      </ul>

      <p>Esta política está vigente desde el 24 de febrero de 2025.</p>

      <footer className="mt-12 border-t pt-6 text-sm">
        © 2026 LM LTDA Digital - Todos los derechos reservados.
      </footer>
    </article>
  </main>
);

export default PrivacyPolicy;
