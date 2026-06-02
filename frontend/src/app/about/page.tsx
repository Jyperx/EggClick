import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'About the Game - Egg Clicker',
};

export default function AboutGame() {
  return (
    <div className="min-h-screen bg-black text-white p-8 sm:p-12 font-sans overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
        <Link href="/" className="text-yellow-500 hover:text-yellow-400 font-bold mb-8 inline-block">
          &larr; Volver al Juego
        </Link>
        
        <h1 className="text-4xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          Lore & Reglas del Juego
        </h1>
        
        <div className="prose prose-invert max-w-none text-gray-300">
          <p className="text-lg leading-relaxed mb-6 font-semibold text-yellow-400">
            En un universo donde la perseverancia es la moneda más valiosa, existe un Huevo Cósmico. 
            Quien logre dar el golpe definitivo, se llevará el tesoro legendario.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">¿Cómo se Juega?</h2>
          <p className="mb-4">
            Egg Clicker es un juego multijugador masivo online (MMO) en tiempo real. 
            El objetivo es simple: todos los jugadores del mundo están golpeando el mismo Huevo gigante al mismo tiempo.
            Cada temporada tiene una meta de millones de clics. 
          </p>
          <p className="mb-4">
            <strong className="text-white">El Ganador:</strong> El jugador que conecte el clic final exacto (el último punto de vida del huevo) se llevará el pozo de dinero real acumulado.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Economía: Los EggCoins</h2>
          <p className="mb-4">
            Al dar clics, generarás <strong>EggCoins</strong> (por cada 10 clics). Esta moneda te sirve para acceder a la Tienda y adquirir herramientas avanzadas para escalar en el ranking.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">La Tienda e Ítems</h2>
          <ul className="list-none space-y-4 mb-8">
            <li className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <span className="text-xl">🤖</span> <strong className="text-white">AutoClicker:</strong> Hace clics por ti de manera constante mientras estás conectado. Ideal para jugadores afk.
            </li>
            <li className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <span className="text-xl">🔨</span> <strong className="text-white">Martillo de Herrero:</strong> Multiplica tu fuerza, haciendo que cada clic valga 5 veces más por una cantidad limitada de golpes.
            </li>
            <li className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <span className="text-xl">❄️</span> <strong className="text-white">Mano Helada:</strong> El huevo tiende a sobrecalentarse si das demasiados clics muy rápido, obligándote a enfriarlo. La Mano Helada absorbe estos clics perdidos en el hielo y te los devuelve todos juntos más adelante.
            </li>
            <li className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <span className="text-xl">👆</span> <strong className="text-white">TouchMe:</strong> Un potenciador brutal que simula 20 clics por segundo por un corto periodo de tiempo.
            </li>
            <li className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <span className="text-xl">🍗</span> <strong className="text-white">HamAss (Muslo):</strong> Otorga una fuerza increíble equivalente a 100 clics de un solo golpe.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Sistema de Clanes</h2>
          <p className="mb-4">
            Puedes fundar o unirte a un Clan. El creador puede establecer una "Cuota de Entrada". Al jugar en un Clan, una fracción de tu energía productiva genera monedas automáticamente para el fondo del Clan (sin que tú pierdas tu dinero).
          </p>
          <p className="mb-8">
            El líder del Clan tiene el poder de distribuir equitativamente el dinero del fondo hacia todos los miembros, fomentando el trabajo en equipo y las tácticas cooperativas para derrotar al Huevo más rápido.
          </p>
        </div>
      </div>
    </div>
  );
}
