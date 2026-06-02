'use client';
import React, { useState, useEffect } from 'react';

export function TutorialModal() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Revisar si ya se completó el tutorial
    const tutorialDone = localStorage.getItem('tutorial_completed');
    if (!tutorialDone) {
      setShowTutorial(true);
    }
  }, []);

  const closeTutorial = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setShowTutorial(false);
  };

  if (!showTutorial) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl relative mx-4">
        
        <h2 className="text-3xl font-black mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          ¡Bienvenido a Egg Clicker!
        </h2>
        
        <p className="text-gray-300 mb-6 text-center">
          Todo el mundo está golpeando el mismo Huevo en vivo. ¡El último en darle un clic se lleva el Premio en Dólares Reales!
        </p>

        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-yellow-400 text-lg mb-1">💰 EggCoins</h3>
            <p className="text-gray-300 text-sm">Ganas 1 moneda por cada 10 clics que das al huevo. Usa este dinero para comprar mejoras en la Tienda.</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-red-400 text-lg mb-1">🔥 Sobrecalentamiento</h3>
            <p className="text-gray-300 text-sm">Si golpeas el huevo demasiado rápido, este se sobrecalentará y tendrás que esperar a que se enfríe o ver un anuncio para continuar.</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-blue-400 text-lg mb-1">🛍️ La Tienda</h3>
            <p className="text-gray-300 text-sm">Compra Martillos, Autoclickers y Manos Heladas para multiplicar tu fuerza y derrotar a tus rivales globales.</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-purple-400 text-lg mb-1">🛡️ Clanes</h3>
            <p className="text-gray-300 text-sm">Únete a un Clan para colaborar y ganar más monedas pasivas mientras todos juegan en equipo.</p>
          </div>
        </div>

        <button 
          onClick={closeTutorial}
          className="w-full mt-8 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold py-3 rounded-lg transition-transform active:scale-95"
        >
          ¡Empezar a Jugar!
        </button>
      </div>
    </div>
  );
}
