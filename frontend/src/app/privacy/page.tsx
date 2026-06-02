import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Egg Clicker',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white p-8 sm:p-12 font-sans overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
        <Link href="/" className="text-yellow-500 hover:text-yellow-400 font-bold mb-8 inline-block">
          &larr; Volver al Juego
        </Link>
        
        <h1 className="text-4xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          Política de Privacidad
        </h1>
        
        <p className="text-gray-400 mb-8">Última actualización: Junio de 2026</p>

        <section className="space-y-6 text-gray-300">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">1. Información que Recopilamos</h2>
            <p>
              Recopilamos información básica para el funcionamiento del juego, que incluye:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Direcciones de correo electrónico (vía Google Auth) para la creación de cuentas.</li>
              <li>Datos de sesión (cookies y LocalStorage) para mantener tu sesión activa y guardar tu progreso sin pérdida de datos.</li>
              <li>Datos del juego: estadísticas de clics, inventario de ítems, progreso en clanes y EggCoins acumulados.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">2. Uso de la Información</h2>
            <p>Utilizamos tu información exclusivamente para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Mantener el progreso de tu cuenta sincronizado en la nube.</li>
              <li>Prevenir el fraude y el uso de herramientas de terceros (autoclickers no oficiales).</li>
              <li>Mostrar anuncios personalizados (a través de redes de anuncios como Google AdSense o Monetag).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">3. Tecnologías de Rastreo (Cookies)</h2>
            <p>
              Utilizamos cookies propias y de terceros, así como almacenamiento local del navegador, para autenticar tu sesión y personalizar la publicidad. Al jugar, aceptas el uso de estas tecnologías según nuestra política de consentimiento visible al ingresar por primera vez.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">4. Compartir Información</h2>
            <p>
              No vendemos tu información personal. Tu información puede ser compartida de forma anónima y agregada con redes publicitarias con el fin de mostrar anuncios relevantes, respetando los protocolos internacionales de privacidad (GDPR, CCPA).
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">5. Tus Derechos</h2>
            <p>
              Tienes el derecho de solicitar la eliminación de tu cuenta y de tus datos asociados en cualquier momento. Para ello, puedes ponerte en contacto con el soporte del juego.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
