import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext'; 

interface FeatherLoaderProps {
  size?: number;
  className?: string;
}

const FeatherLoader: React.FC<FeatherLoaderProps> = ({ size = 120, className = '' }) => {
  const { theme } = useTheme();

  const featherVariants: Variants = {
    hidden: (index: number) => {
      const angles = [-120, -90, -60, -30, 0, 30]; 
      const angle = (angles[index] * Math.PI) / 180;
      const distance = 150; 
      
      return {
        opacity: 0,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate: angles[index], 
        scale: 0.3,
      };
    },
    visible: (index: number) => ({
      opacity: 0.85, 
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: {
        // DÜZELTME BURADA: Daha sert bir yay (stiffness: 160) ve çok daha kısa bir aralık (delay: 0.05)
        type: "spring", 
        damping: 15, 
        stiffness: 160, 
        delay: index * 0.05, 
      }
    }),
    float: (index: number) => ({
      y: [0, -5, 0],
      transition: { 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut", 
        // DÜZELTME: Gelişleri hızlandığı için float başlangıçlarını da 0.2'den 0.1'e çektik
        delay: index * 0.1 
      }
    }),
    exit: (index: number) => {
      const angles = [-140, -100, -60, -20, 20, 60]; 
      const angle = (angles[index] * Math.PI) / 180;
      const distance = 400; 
      
      return {
        opacity: 0,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate: angles[index] + 45, 
        scale: 0.5,
        transition: {
          duration: 0.6, 
          ease: "easeIn", 
          delay: index * 0.05, 
        }
      };
    }
  };

  const lightColors = ["#00D2FF", "#00A3FF", "#1A56DB", "#2563EB", "#1E40AF", "#172554"];
  const darkColors = ["#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0284C7"];
  
  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.svg 
        width={size} 
        height={size} 
        viewBox="0 0 240 240"
        initial="hidden"
        animate={["visible", "float"]} 
        exit="exit" 
        className="overflow-visible"
        style={{ mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }} 
      >
        <motion.path custom={0} variants={featherVariants} fill={colors[0]} d="M 30 200 C 60 120, 80 50, 110 30 C 100 80, 80 140, 30 200 Z" />
        <motion.path custom={1} variants={featherVariants} fill={colors[1]} d="M 30 200 C 70 140, 100 70, 140 60 C 115 105, 90 150, 30 200 Z" />
        <motion.path custom={2} variants={featherVariants} fill={colors[2]} d="M 30 200 C 85 155, 130 100, 170 90 C 140 130, 105 160, 30 200 Z" />
        <motion.path custom={3} variants={featherVariants} fill={colors[3]} d="M 30 200 C 100 170, 150 130, 195 125 C 160 155, 120 175, 30 200 Z" />
        <motion.path custom={4} variants={featherVariants} fill={colors[4]} d="M 30 200 C 115 185, 175 160, 215 160 C 175 180, 135 190, 30 200 Z" />
        <motion.path custom={5} variants={featherVariants} fill={colors[5]} d="M 30 200 C 130 195, 195 185, 230 195 C 190 205, 140 205, 30 200 Z" />
      </motion.svg>
    </div>
  );
};

export default FeatherLoader;