import { Link } from "react-router-dom";

const TermsOfUse = () => (
  <main className="min-h-screen bg-background py-10 text-foreground">
    <article className="prose prose-neutral mx-auto max-w-4xl px-6">
      <Link to="/" className="text-sm font-bold text-primary no-underline">
        Volver a la página principal
      </Link>
      <h1 className="mb-8 mt-6 text-[26px] font-black md:text-[32px]">
        Términos de uso
      </h1>

      <h2>1. Condiciones</h2>
      <p>
        Al acceder al sitio de El Código de la Reconquista, aceptas cumplir
        estos términos de uso y todas las leyes y normas aplicables. También
        aceptas que eres responsable de cumplir la legislación local que te
        corresponda. Si no estás de acuerdo con alguna de estas condiciones,
        no debes utilizar ni acceder a este sitio. Los materiales están
        protegidos por las leyes aplicables de derechos de autor y marcas.
      </p>

      <h2>2. Licencia de uso</h2>
      <ul>
        <li>
          Se concede permiso para descargar temporalmente una copia de los
          materiales del sitio únicamente para consulta personal, transitoria
          y no comercial. Se trata de una licencia, no de una transferencia de
          propiedad.
        </li>
        <li>No puedes modificar ni copiar los materiales.</li>
        <li>No puedes utilizarlos con fines comerciales ni exhibirlos públicamente.</li>
        <li>No puedes descompilar ni aplicar ingeniería inversa al software del sitio.</li>
        <li>No puedes eliminar avisos de derechos de autor o propiedad.</li>
        <li>No puedes transferir ni alojar copias de los materiales en otro servidor.</li>
      </ul>
      <p>
        Esta licencia terminará automáticamente si incumples alguna de estas
        restricciones y LM LTDA Digital podrá cancelarla en cualquier momento.
        Al finalizar la licencia, deberás destruir cualquier material
        descargado que esté en tu poder, tanto en formato digital como impreso.
      </p>

      <h2>3. Exención de responsabilidad</h2>
      <p>
        Los materiales se proporcionan tal como están. LM LTDA Digital no
        ofrece garantías expresas o implícitas y rechaza, dentro de los límites
        permitidos por la ley, cualquier otra garantía, incluidas las de
        comerciabilidad, idoneidad para un fin concreto o no infracción.
        Tampoco garantiza resultados específicos derivados del uso de los
        materiales o de sitios vinculados.
      </p>

      <h2>4. Limitaciones</h2>
      <p>
        LM LTDA Digital y sus proveedores no serán responsables por daños
        derivados del uso o de la imposibilidad de utilizar los materiales,
        incluidas pérdidas de datos, beneficios o interrupciones comerciales,
        salvo cuando la legislación aplicable determine lo contrario.
      </p>

      <h2>5. Exactitud de los materiales</h2>
      <p>
        Los materiales pueden contener errores técnicos, tipográficos o
        fotográficos. LM LTDA Digital no garantiza que sean exactos, completos
        o actuales. Puede modificarlos sin previo aviso y no asume la obligación
        de actualizarlos.
      </p>

      <h2>6. Enlaces</h2>
      <p>
        LM LTDA Digital no ha revisado todos los sitios enlazados y no es
        responsable de su contenido. La inclusión de un enlace no implica
        aprobación. El uso de cualquier sitio externo corre por cuenta y riesgo
        del usuario.
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        LM LTDA Digital puede revisar estos términos sin previo aviso. Al usar
        este sitio, aceptas quedar sujeto a la versión vigente.
      </p>

      <h2>8. Legislación aplicable</h2>
      <p>
        Estas condiciones se rigen e interpretan conforme a las leyes de
        Brasil. Te sometes a la jurisdicción exclusiva de los tribunales del
        estado de Mato Grosso.
      </p>

      <footer className="mt-12 border-t pt-6 text-sm">
        © 2026 LM LTDA Digital - Todos los derechos reservados.
      </footer>
    </article>
  </main>
);

export default TermsOfUse;
