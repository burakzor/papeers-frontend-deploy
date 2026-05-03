import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface SplashScreenProps {
  onStartExit: () => void;
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStartExit, onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // 2.2 saniye bekliyoruz (Giriş ve süzülme için ekstra süre)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      onStartExit();
    }, 2200);

    // 3.2 saniye sonra bileşeni tamamen kaldırıyoruz
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onStartExit, onComplete]);

  const featherVariants: Variants = {
    // SOLDAN GELEN RÜZGAR GİRİŞİ (Aynı kaldı)
    hidden: (i: number) => ({
      opacity: 0,
      x: -600, 
      y: i * 25 - 60, 
      rotate: -180,
      scale: 0.4,
    }),
    visible: (i: number) => ({
      opacity: 0.9,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 60,
        delay: i * 0.12,
        duration: 1.2
      }
    }),
    // SÜZÜLME ETKİSİ
    float: (i: number) => ({
      y: [0, -8, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: i * 0.2,
      }
    }),
    // RADYAL ÇIKIŞ (İlk istediğin dairesel dağılma)
    exit: (index: number) => {
      const angles = [-140, -100, -60, -20, 20, 60]; 
      const angle = (angles[index] * Math.PI) / 180;
      const distance = 800; 
      
      return {
        opacity: 0,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate: angles[index] + 45,
        scale: 0.5,
        transition: {
          duration: 0.8,
          ease: "easeIn",
          delay: index * 0.05,
        }
      };
    }
  };

  const lightColors = ["#00D2FF", "#00A3FF", "#1A56DB", "#2563EB", "#1E40AF", "#172554"];
  const darkColors = ["#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0284C7"];
  const colors = theme === 'dark' ? darkColors : lightColors;

  const paths = [
    "M 30 200 C 60 120, 80 50, 110 30 C 100 80, 80 140, 30 200 Z",
    "M 30 200 C 70 140, 100 70, 140 60 C 115 105, 90 150, 30 200 Z",
    "M 30 200 C 85 155, 130 100, 170 90 C 140 130, 105 160, 30 200 Z",
    "M 30 200 C 100 170, 150 130, 195 125 C 160 155, 120 175, 30 200 Z",
    "M 30 200 C 115 185, 175 160, 215 160 C 175 180, 135 190, 30 200 Z",
    "M 30 200 C 130 195, 195 185, 230 195 C 190 205, 140 205, 30 200 Z"
  ];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000 pointer-events-none ${isExiting ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      <motion.svg 
        width="280" 
        height="280" 
        viewBox="0 0 240 240"
        initial="hidden"
        animate={isExiting ? "exit" : ["visible", "float"]} 
        className="overflow-visible"
        style={{ mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }} 
      >
        {paths.map((d, i) => (
          <motion.path 
            key={i}
            custom={i} 
            variants={featherVariants} 
            fill={colors[i]} 
            d={d} 
          />
        ))}
      </motion.svg>

      <motion.h1
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={isExiting 
          ? { opacity: 0, y: -20, filter: "blur(10px)" } 
          : { opacity: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ 
          duration: isExiting ? 0.4 : 0.8, 
          delay: isExiting ? 0 : 0.8 
        }}
        className="mt-8 text-3xl font-bold tracking-[0.2em] text-slate-800 dark:text-slate-100"
      >
        PaPeers
      </motion.h1>
    </div>
  );
};

export default SplashScreen;