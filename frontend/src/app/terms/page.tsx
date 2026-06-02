import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Egg Clicker',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white p-8 sm:p-12 font-sans overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
        <Link href="/" className="text-yellow-500 hover:text-yellow-400 font-bold mb-8 inline-block">
          &larr; Volver al Juego
        </Link>
        
        <h1 className="text-4xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          Términos y Condiciones
        </h1>
        
        <p className="text-gray-400 mb-8">Última actualización: Junio de 2026</p>

        <section className="space-y-6 text-gray-300">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al registrarte y jugar a "Egg Clicker", aceptas incondicionalmente estos Términos y Condiciones. Si no estás de acuerdo con alguna parte, no debes utilizar la plataforma.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">2. Naturaleza del Juego y Premios</h2>
            <p>
              Egg Clicker es un juego de simulación virtual. Los "EggCoins" son una moneda virtual sin valor monetario real ni capacidad de ser canjeada fuera del ecosistema del juego.
            </p>
            <p className="mt-2">
              <strong>Sobre los premios en USD:</strong> El pozo de premios mostrado (ej. $150 USD) es una representación en vivo sujeta a disponibilidad y verificación. Los pagos a los ganadores (quienes den el clic final exacto para romper el huevo) se procesan bajo verificación de autenticidad.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">3. Prohibiciones (Zero Tolerance)</h2>
            <p>
              Está estrictamente prohibido y resulta en baneo permanente e invalidación de cualquier premio:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>El uso de macros, autoclickers de terceros o software externo de automatización.</li>
              <li>Intentar manipular el tiempo de enfriamiento, las transacciones del servidor o abusar de bugs.</li>
              <li>El uso de multicuentas para inflar estadísticas de clanes o beneficios propios.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">4. Cuentas y Baneos</h2>
            <p>
              La administración de Egg Clicker se reserva el derecho de banear, suspender o resetear cuentas que violen estos términos sin previo aviso. Las decisiones tomadas por los sistemas de seguridad son definitivas.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">5. Publicidad</h2>
            <p>
              Este sitio se financia en parte mediante la visualización de publicidad (videos con recompensa y redes de afiliados). Al usar el sitio, aceptas interactuar con estos proveedores conforme a sus propios términos de servicio.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
